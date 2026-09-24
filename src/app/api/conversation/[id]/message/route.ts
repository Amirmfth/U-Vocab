import { AI_MODEL, getOpenAI } from "@/lib/ai/client";
import { recordAIUsage } from "@/lib/ai/usage";
import { AI_RESPONSE_COMPLETED_EVENT, AI_TEXT_DELTA_EVENT } from "@/lib/ai/streaming";
import { buildConversationContext } from "@/lib/conversation/context";
import { processConversationTurn } from "@/lib/conversation/process-turn";
import { buildTutorInstructions } from "@/lib/conversation/tutor-prompt";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const body = (await request.json()) as { message?: string };
  const message = body.message?.trim();

  if (!message) {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }
  if (message.length > 4000) {
    return Response.json(
      { error: "Keep each message under 4,000 characters." },
      { status: 400 },
    );
  }

  const locked = await db.conversationSession.updateMany({
    where: {
      id,
      userId: user.id,
      status: "ACTIVE",
      turnInFlight: false,
    },
    data: { turnInFlight: true },
  });
  if (!locked.count) {
    return Response.json(
      { error: "Conversation is busy, completed, or not found." },
      { status: 409 },
    );
  }

  await db.conversationMessage.create({
    data: {
      sessionId: id,
      userId: user.id,
      role: "USER",
      content: message,
    },
  });

  let correction: string | null = null;
  try {
    const evaluation = await processConversationTurn({
      userId: user.id,
      sessionId: id,
      message,
    });
    correction = evaluation.relevantCorrection;
  } catch (error) {
    console.error("Conversation turn evaluation failed", error);
  }

  const context = await buildConversationContext({
    userId: user.id,
    sessionId: id,
  });
  const instructions = buildTutorInstructions(context, correction);

  const stream = await getOpenAI().responses
    .create({
      model: AI_MODEL,
      input: [
        { role: "system", content: instructions },
        ...context.messages.map((item) => ({
          role: item.role,
          content: item.content,
        })),
      ],
      stream: true,
    })
    .catch(async (error) => {
      await recordAIUsage({
        userId: user.id,
        operation: "conversation_tutor",
        model: AI_MODEL,
        status: "ERROR",
        errorMessage:
          error instanceof Error ? error.message : "Unknown OpenAI error",
      });
      return null;
    });

  if (!stream) {
    await db.conversationSession.updateMany({
      where: { id, userId: user.id },
      data: { turnInFlight: false },
    });
    return Response.json(
      { error: "Could not start the tutor response." },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();

  const bodyStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let output = "";
      let completedResponse:
        | {
            id?: string;
            usage?: {
              input_tokens?: number | null;
              output_tokens?: number | null;
              total_tokens?: number | null;
            } | null;
          }
        | undefined;

      try {
        for await (const event of stream) {
          if (event.type === AI_TEXT_DELTA_EVENT) {
            output += event.delta;
            controller.enqueue(encoder.encode(event.delta));
          }

          if (event.type === AI_RESPONSE_COMPLETED_EVENT) {
            completedResponse = event.response;
          }
        }

        if (output.trim()) {
          await db.conversationMessage.create({
            data: {
              sessionId: id,
              userId: user.id,
              role: "ASSISTANT",
              content: output.trim(),
            },
          });
        }

        await recordAIUsage({
          userId: user.id,
          operation: "conversation_tutor",
          model: AI_MODEL,
          status: "SUCCESS",
          usage: completedResponse?.usage,
          requestId: completedResponse?.id ?? null,
        });

        await db.conversationSession.updateMany({
          where: { id, userId: user.id },
          data: { turnInFlight: false },
        });

        controller.close();
      } catch (error) {
        await recordAIUsage({
          userId: user.id,
          operation: "conversation_tutor",
          model: AI_MODEL,
          status: "ERROR",
          errorMessage:
            error instanceof Error ? error.message : "Unknown streaming error",
        });
        await db.conversationSession.updateMany({
          where: { id, userId: user.id },
          data: { turnInFlight: false },
        });
        controller.error(error);
      }
    },
  });

  return new Response(bodyStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
