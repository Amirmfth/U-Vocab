"use server";

import { revalidatePath } from "next/cache";
import { generateConversationSetup } from "@/lib/ai/conversation-setup";
import { evaluateConversationSession } from "@/lib/ai/conversation-final-evaluator";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { selectConversationTargets } from "@/lib/conversation/targets";

export type ConversationActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  sessionId?: string;
};

export async function createConversationSessionAction(
  _previous: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const kind =
    String(formData.get("kind") ?? "PRACTICE") === "MISSION"
      ? "MISSION"
      : "PRACTICE";
  const collectionRaw = String(formData.get("collectionId") ?? "").trim();
  const collectionId =
    collectionRaw && collectionRaw !== "NONE" ? collectionRaw : null;
  const topic = String(formData.get("topic") ?? "").trim() || null;
  const revealTargets = String(formData.get("revealTargets") ?? "") === "on";
  const targetCount = Math.max(
    3,
    Math.min(7, Number(formData.get("targetCount") ?? 5) || 5),
  );

  try {
    const user = await getCurrentUser();
    const targets = await selectConversationTargets({
      userId: user.id,
      collectionId,
      limit: targetCount,
    });

    if (targets.length < 2) {
      return {
        status: "error",
        message: "Add more vocabulary before starting a conversation.",
      };
    }

    const setup = await generateConversationSetup({
      userId: user.id,
      kind,
      level: user.targetLevel,
      topic,
      targets,
    });

    const session = await db.conversationSession.create({
      data: {
        userId: user.id,
        kind,
        level: user.targetLevel,
        title: setup.title,
        scenario: setup.scenario,
        aiRole: setup.aiRole,
        objective: kind === "MISSION" ? setup.objective : null,
        revealTargets: kind === "PRACTICE" ? true : revealTargets,
        targets: {
          create: targets.map((target, position) => ({
            lexemeId: target.id,
            position,
          })),
        },
        messages: {
          create: {
            userId: user.id,
            role: "ASSISTANT",
            content: setup.opening,
          },
        },
      },
    });

    revalidatePath("/conversation");
    revalidatePath("/missions");

    return {
      status: "success",
      message: kind === "MISSION" ? "Mission created." : "Conversation ready.",
      sessionId: session.id,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not create the conversation.",
    };
  }
}

export async function completeConversationAction(
  _previous: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");

  try {
    const user = await getCurrentUser();
    const session = await db.conversationSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        status: "ACTIVE",
        turnInFlight: false,
      },
      include: {
        targets: {
          include: {
            lexeme: { include: { patterns: true } },
          },
          orderBy: { position: "asc" },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 40,
        },
      },
    });

    if (!session) {
      return { status: "error", message: "Active conversation not found." };
    }

    const evaluation = await evaluateConversationSession({
      userId: user.id,
      kind: session.kind,
      level: session.level,
      scenario: session.scenario,
      objective: session.objective,
      targets: session.targets.map((target) => ({
        lexemeId: target.lexemeId,
        lemma: target.lexeme.lemma,
        patterns: target.lexeme.patterns.map((pattern) => pattern.pattern),
        uses: target.uses,
        successfulUses: target.successfulUses,
      })),
      messages: [...session.messages].reverse().map((message) => ({
        role: message.role === "USER" ? "user" as const : "assistant" as const,
        content: message.content,
      })),
    });

    const targetEvaluation = new Map(
      evaluation.targetResults.map((result) => [result.lexemeId, result]),
    );
    const normalizedEvaluation = {
      ...evaluation,
      targetResults: session.targets.map((target) => {
        const result = targetEvaluation.get(target.lexemeId);
        return result ?? {
          lexemeId: target.lexemeId,
          used: target.uses > 0,
          correct: target.successfulUses > 0,
          naturalness:
            target.uses > 0 ? target.successfulUses / target.uses : 0,
          note:
            target.uses > 0
              ? "Usage was tracked during the conversation."
              : "This target was not used.",
        };
      }),
    };

    const now = new Date();

    await db.$transaction(async (tx) => {
      await tx.conversationSession.update({
        where: { id: session.id },
        data: {
          status: "COMPLETED",
          completedAt: now,
          summary: normalizedEvaluation,
        },
      });

      for (const target of session.targets) {
        await tx.encounter.upsert({
          where: {
            userId_lexemeId_source_sourceRef: {
              userId: user.id,
              lexemeId: target.lexemeId,
              source: session.kind === "MISSION" ? "mission" : "conversation",
              sourceRef: session.id,
            },
          },
          create: {
            userId: user.id,
            lexemeId: target.lexemeId,
            source: session.kind === "MISSION" ? "mission" : "conversation",
            sourceRef: session.id,
            context: session.scenario,
          },
          update: {},
        });
      }
    });

    revalidatePath("/conversation/" + session.id);
    revalidatePath("/conversation");
    revalidatePath("/missions");

    return {
      status: "success",
      message: "Session evaluated.",
      sessionId: session.id,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not finish the session.",
    };
  }
}

export async function replayConversationAction(
  _previous: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const sessionId = String(formData.get("sessionId") ?? "");

  try {
    const user = await getCurrentUser();
    const source = await db.conversationSession.findFirst({
      where: { id: sessionId, userId: user.id },
      include: {
        targets: { orderBy: { position: "asc" } },
        messages: {
          where: { role: "ASSISTANT" },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });
    if (!source) {
      return { status: "error", message: "Conversation not found." };
    }

    const replay = await db.conversationSession.create({
      data: {
        userId: user.id,
        kind: source.kind,
        level: source.level,
        title: source.title,
        scenario: source.scenario,
        aiRole: source.aiRole,
        objective: source.objective,
        revealTargets: source.revealTargets,
        targets: {
          create: source.targets.map((target) => ({
            lexemeId: target.lexemeId,
            position: target.position,
          })),
        },
        messages: source.messages[0]
          ? {
              create: {
                userId: user.id,
                role: "ASSISTANT",
                content: source.messages[0].content,
              },
            }
          : undefined,
      },
    });

    return {
      status: "success",
      message: "Replay ready.",
      sessionId: replay.id,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not replay this session.",
    };
  }
}
