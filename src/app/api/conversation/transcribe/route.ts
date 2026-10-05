import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { isUnauthorizedError } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOpenAI } from "@/lib/ai/client";
import { createAIUsageRecorder } from "@/lib/ai/usage-recorder";
import { assertProviderSpendSafety } from "@/lib/entitlements/spend-safety";
import { consumeQuota, requireEntitlement } from "@/lib/entitlements/service";
import { EntitlementError } from "@/lib/entitlements/errors";
import { startOperation } from "@/lib/performance";
import { sendProductEventForUser } from "@/lib/analytics/server";
import {
  CONVERSATION_AUDIO,
  extensionForAudioMime,
  isSupportedConversationAudioMime,
  normalizedAudioMime,
} from "@/lib/conversation/audio-config";
import { transcriptionLanguageForTarget } from "@/lib/conversation/transcription-language";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  const perf = startOperation("conversation.transcription");
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  let course: Awaited<ReturnType<typeof getCurrentCourse>>;
  try {
    [user, course] = await Promise.all([getCurrentUser(), getCurrentCourse()]);
  } catch (error) {
    if (isUnauthorizedError(error)) return errorResponse("UNAUTHORIZED", "Unauthorized.", 401);
    perf.fail(error);
    return errorResponse("AUTH_FAILED", "Could not authenticate request.", 500);
  }

  const form = await request.formData().catch(() => null);
  if (!form) return errorResponse("INVALID_UPLOAD", "Invalid audio upload.", 400);

  const audio = form.get("audio");
  const sessionId = String(form.get("sessionId") ?? "").trim();
  const requestId = String(form.get("requestId") ?? "").trim();
  const durationMs = Math.round(Number(form.get("durationMs") ?? 0));

  if (!(audio instanceof File) || !sessionId || !requestId || requestId.length > 120) {
    return errorResponse("INVALID_UPLOAD", "Audio, session, and request ID are required.", 400);
  }
  if (
    !Number.isFinite(durationMs) ||
    durationMs < CONVERSATION_AUDIO.minDurationMs ||
    durationMs > CONVERSATION_AUDIO.maxDurationSeconds * 1000
  ) {
    return errorResponse("INVALID_DURATION", "Recording duration is outside the allowed range.", 400);
  }
  if (audio.size <= 0) return errorResponse("EMPTY_AUDIO", "The recording is empty.", 400);
  if (audio.size > CONVERSATION_AUDIO.maxBytes) {
    return errorResponse("AUDIO_TOO_LARGE", "The recording is too large.", 413);
  }
  if (!isSupportedConversationAudioMime(audio.type)) {
    return errorResponse("UNSUPPORTED_AUDIO", "This audio format is not supported.", 415);
  }

  const session = await db.conversationSession.findFirst({
    where: {
      id: sessionId,
      userId: user.id,
      userCourseId: course.id,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!session) return errorResponse("SESSION_NOT_FOUND", "Conversation not found.", 404);

  const durationSeconds = Math.max(1, Math.ceil(durationMs / 1000));
  const quotaMinutes = Math.max(1, Math.ceil(durationSeconds / 60));

  try {
    await requireEntitlement(user.id, "voice_transcription");
    await assertProviderSpendSafety({ userId: user.id, timeZone: user.timezone });
    await consumeQuota({
      userId: user.id,
      userCourseId: course.id,
      timeZone: user.timezone,
      key: "voice_transcription_minutes_monthly",
      amount: quotaMinutes,
      sourceRef: "conversation-transcription:" + session.id + ":" + requestId,
      metadata: {
        durationSeconds,
        audioBytes: audio.size,
      },
    });
  } catch (error) {
    if (error instanceof EntitlementError) {
      perf.success({ accepted: false, entitlementCode: error.code });
      return errorResponse(
        error.code,
        error.code === "PRO_REQUIRED"
          ? "Voice transcription requires Pro. You can keep typing."
          : error.code === "QUOTA_EXCEEDED"
            ? "Your voice transcription allowance is used up. You can keep typing."
            : "Voice transcription is temporarily unavailable. You can keep typing.",
        429,
      );
    }
    perf.fail(error);
    return errorResponse("ALLOWANCE_FAILED", "Could not check voice allowance.", 500);
  }

  const model = CONVERSATION_AUDIO.transcriptionModel;
  const usage = createAIUsageRecorder({
    userId: user.id,
    userCourseId: course.id,
    operation: "conversation_transcription",
    model,
    durationSeconds,
    metadata: {
      durationSeconds,
      audioBytes: audio.size,
      audioMime: normalizedAudioMime(audio.type),
      targetLanguage: course.targetLanguage,
    },
  });

  try {
    const extension = extensionForAudioMime(audio.type);
    if (!extension) return errorResponse("UNSUPPORTED_AUDIO", "This audio format is not supported.", 415);
    const providerFile = new File(
      [await audio.arrayBuffer()],
      "conversation." + extension,
      { type: normalizedAudioMime(audio.type) },
    );
    const language = transcriptionLanguageForTarget(course.targetLanguage);

    const response = await perf.span("provider", () =>
      getOpenAI().audio.transcriptions.create({
        file: providerFile,
        model,
        ...(language ? { language } : {}),
        response_format: "json",
      }),
    );

    const transcript = response.text?.trim() ?? "";
    if (!transcript) {
      const error = new Error("Transcription was empty.");
      await usage.failure(error, response as never);
      await sendProductEventForUser(user.id, "voice_transcription_failed", {
        reason: "empty_transcript",
        durationSeconds,
      });
      return errorResponse("EMPTY_TRANSCRIPT", "No speech was recognized. You can retry or type instead.", 422);
    }

    await usage.success(response as never);
    await sendProductEventForUser(user.id, "voice_transcription_completed", {
      durationSeconds,
      audioBytes: audio.size,
    });
    perf.success({
      accepted: true,
      durationSeconds,
      audioBytes: audio.size,
      targetLanguage: course.targetLanguage,
    });

    return Response.json({ transcript });
  } catch (error) {
    await usage.failure(error);
    await sendProductEventForUser(user.id, "voice_transcription_failed", {
      reason: "provider",
      durationSeconds,
    });
    perf.fail(error, { durationSeconds, audioBytes: audio.size });
    return errorResponse(
      "TRANSCRIPTION_FAILED",
      "Could not transcribe that recording. You can retry or type instead.",
      502,
    );
  }
}
