import { getOpenAI } from "@/lib/ai/client";
import { aiRoute } from "@/lib/ai/routing";
import { createAIUsageRecorder } from "@/lib/ai/usage-recorder";
import {
  AI_RESPONSE_COMPLETED_EVENT,
  AI_TEXT_DELTA_EVENT,
} from "@/lib/ai/streaming";
import { buildConversationContext } from "@/lib/conversation/context";
import { processConversationTurn } from "@/lib/conversation/process-turn";
import { buildTutorInstructions } from "@/lib/conversation/tutor-prompt";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { startOperation } from "@/lib/performance";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const perf = startOperation("conversation.message");
  const [{ id }, user] = await Promise.all([
    params,
    perf.span("auth", () => getCurrentUser()),
  ]);
  const body = (await request.json()) as { message?: string };
  const message = body.message?.trim();

  if (!message) {
    perf.success({ httpStatus: 400, accepted: false });
    return Response.json({ error: "Message is required." }, { status: 400 });
  }
  if (message.length > 4000) {
    perf.success({
      httpStatus: 400,
      accepted: false,
      messageChars: message.length,
    });
    return Response.json(
      { error: "Keep each message under 4,000 characters." },
      { status: 400 },
    );
  }

  const locked = await perf.span("dbWrite", () =>
    db.conversationSession.updateMany({
      where: {
        id,
        userId: user.id,
        status: "ACTIVE",
        turnInFlight: false,
      },
      data: { turnInFlight: true },
    }),
  );
  if (!locked.count) {
    perf.success({ httpStatus: 409, accepted: false });
    return Response.json(
      { error: "Conversation is busy, completed, or not found." },
      { status: 409 },
    );
  }

  await perf.span("dbWrite", () =>
    db.conversationMessage.create({
      data: {
        sessionId: id,
        userId: user.id,
        role: "USER",
        content: message,
      },
    }),
  );

  let correction: string | null = null;
  try {
    const evaluation = await perf.span("aiEvaluation", () =>
      processConversationTurn({
        userId: user.id,
        sessionId: id,
        message,
      }),
    );
    correction = evaluation.relevantCorrection;
  } catch (error) {
    console.error("Conversation turn evaluation failed", error);
  }

  const context = await perf.span("context", () =>
    buildConversationContext({
      userId: user.id,
      sessionId: id,
    }),
  );
  const instructions = buildTutorInstructions(context, correction);
  const tutorRoute = aiRoute("conversation_tutor");
  const tutorPerf = startOperation("ai.conversation_tutor", {
    model: tutorRoute.model,
    messageChars: message.length,
    contextMessages: context.messages.length,
  });
  const tutorUsage = createAIUsageRecorder({
    userId: user.id,
    operation: "conversation_tutor",
    model: tutorRoute.model,
    metadata: {
      messageChars: message.length,
      contextMessages: context.messages.length,
      targetCount: context.targets.length,
    },
  });
  const providerStartedAt = Date.now();

  const stream = await tutorPerf
    .span("providerStart", () =>
      getOpenAI().responses.create({
        model: tutorRoute.model,
        max_output_tokens: tutorRoute.maxOutputTokens,
        input: [
          { role: "system", content: instructions },
          ...context.messages.map((item) => ({
            role: item.role,
            content: item.content,
          })),
        ],
        stream: true,
      }),
    )
    .catch(async (error) => {
      tutorPerf.fail(error);
      await tutorUsage.failure(error);
      return null;
    });

  if (!stream) {
    await perf.span("dbWrite", () =>
      db.conversationSession.updateMany({
        where: { id, userId: user.id },
        data: { turnInFlight: false },
      }),
    );
    perf.fail(new Error("Could not start tutor response."), {
      httpStatus: 502,
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
      let timeToFirstTokenMs: number | null = null;
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
        await tutorPerf.span("stream", async () => {
          for await (const event of stream) {
            if (event.type === AI_TEXT_DELTA_EVENT) {
              if (timeToFirstTokenMs === null) {
                timeToFirstTokenMs = Math.max(0, Date.now() - providerStartedAt);
              }
              output += event.delta;
              controller.enqueue(encoder.encode(event.delta));
            }

            if (event.type === AI_RESPONSE_COMPLETED_EVENT) {
              completedResponse = event.response;
            }
          }
        });

        if (output.trim()) {
          await perf.span("dbWrite", () =>
            db.conversationMessage.create({
              data: {
                sessionId: id,
                userId: user.id,
                role: "ASSISTANT",
                content: output.trim(),
              },
            }),
          );
        }

        await tutorUsage.streamingSuccess({
          usage: completedResponse?.usage,
          requestId: completedResponse?.id ?? null,
          timeToFirstTokenMs,
        });

        await perf.span("dbWrite", () =>
          db.conversationSession.updateMany({
            where: { id, userId: user.id },
            data: { turnInFlight: false },
          }),
        );

        tutorPerf.success({
          requestId: completedResponse?.id ?? null,
          outputChars: output.length,
          inputTokens: completedResponse?.usage?.input_tokens ?? 0,
          outputTokens: completedResponse?.usage?.output_tokens ?? 0,
        });
        perf.success({
          httpStatus: 200,
          accepted: true,
          messageChars: message.length,
          outputChars: output.length,
        });
        controller.close();
      } catch (error) {
        tutorPerf.fail(error);
        perf.fail(error);
        await tutorUsage.failure(error, completedResponse);
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
