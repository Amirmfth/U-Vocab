"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Mic,
  RotateCcw,
  Send,
  Square,
  Trash2,
  UserRound,
} from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { captureProductEvent } from "@/lib/analytics/client";
import {
  CONVERSATION_AUDIO,
  recordingMimeType,
} from "@/lib/conversation/audio-config";
import {
  directionForTarget,
  documentLanguageForTarget,
} from "@/lib/conversation/transcription-language";

type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
};

type VoiceErrorCode =
  | "unsupported"
  | "permission_denied"
  | "no_microphone"
  | "too_short"
  | "too_large"
  | "network"
  | "quota"
  | "provider";

function voiceErrorMessage(
  code: VoiceErrorCode,
  t: ReturnType<typeof useTranslations>,
) {
  switch (code) {
    case "unsupported":
      return t("conversation.voice.unsupported");
    case "permission_denied":
      return t("conversation.voice.permissionDenied");
    case "no_microphone":
      return t("conversation.voice.noMicrophone");
    case "too_short":
      return t("conversation.voice.tooShort");
    case "too_large":
      return t("conversation.voice.tooLarge");
    case "quota":
      return t("conversation.voice.quotaReached");
    case "network":
      return t("conversation.voice.networkError");
    default:
      return t("conversation.voice.transcriptionError");
  }
}

export function ConversationChat({
  sessionId,
  initialMessages,
  tutorLabel,
  targetLanguage,
  voiceEnabled,
  voiceRemainingMinutes,
  voiceLimitMinutes,
}: {
  sessionId: string;
  initialMessages: ChatMessage[];
  tutorLabel: string;
  targetLanguage: string;
  voiceEnabled: boolean;
  voiceRemainingMinutes: number;
  voiceLimitMinutes: number;
}) {
  const router = useRouter();
  const t = useTranslations();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState(voiceRemainingMinutes);
  const [retryBlob, setRetryBlob] = useState<Blob | null>(null);
  const [retryDurationMs, setRetryDurationMs] = useState(0);
  const [retryRequestId, setRetryRequestId] = useState<string | null>(null);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const [voiceDraftBaseline, setVoiceDraftBaseline] = useState<string | null>(null);

  const temporaryId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedBytesRef = useRef(0);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const requestIdRef = useRef<string | null>(null);

  const lang = documentLanguageForTarget(targetLanguage);
  const dir = directionForTarget(targetLanguage);

  useEffect(() => {
    if (!streaming) setMessages(initialMessages);
  }, [initialMessages, streaming]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: streaming ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, streaming]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    };
  }, []);

  const canSend = useMemo(
    () =>
      draft.trim().length > 0 &&
      !streaming &&
      !recording &&
      !transcribing,
    [draft, streaming, recording, transcribing],
  );

  function clearRecordingTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function transcribe(
    blob: Blob,
    durationMs: number,
    requestId: string,
  ) {
    setTranscribing(true);
    setVoiceError(null);

    try {
      const form = new FormData();
      form.set("audio", blob, "conversation");
      form.set("sessionId", sessionId);
      form.set("requestId", requestId);
      form.set("durationMs", String(durationMs));

      const response = await fetch("/api/conversation/transcribe", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json().catch(() => null)) as
        | { transcript?: string; error?: string; code?: string; remainingMinutes?: number }
        | null;

      if (!response.ok || !payload?.transcript) {
        const code =
          payload?.code === "PRO_REQUIRED" || payload?.code === "QUOTA_EXCEEDED"
            ? "quota"
            : response.status === 0
              ? "network"
              : "provider";
        throw Object.assign(new Error(payload?.error ?? t("conversation.voice.transcriptionError")), {
          voiceCode: code,
        });
      }

      const transcript = payload.transcript.trim();
      if (typeof payload.remainingMinutes === "number") {
        setRemainingMinutes(Math.max(0, payload.remainingMinutes));
      }
      setRetryBlob(null);
      setRetryDurationMs(0);
      setRetryRequestId(null);

      if (draft.trim()) {
        setPendingTranscript(transcript);
      } else {
        setDraft(transcript);
        setVoiceDraftBaseline(transcript);
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
    } catch (actionError) {
      const maybeCode =
        actionError &&
        typeof actionError === "object" &&
        "voiceCode" in actionError
          ? String((actionError as { voiceCode?: unknown }).voiceCode)
          : navigator.onLine
            ? "provider"
            : "network";
      const code = (
        ["quota", "network", "provider"].includes(maybeCode)
          ? maybeCode
          : "provider"
      ) as VoiceErrorCode;
      setVoiceError(
        actionError instanceof Error && actionError.message
          ? actionError.message
          : voiceErrorMessage(code, t),
      );
      captureProductEvent("voice_transcription_failed", {
        reason: code,
        durationSeconds: Math.max(1, Math.ceil(durationMs / 1000)),
      });
    } finally {
      setTranscribing(false);
    }
  }

  async function startRecording() {
    if (!voiceEnabled || remainingMinutes <= 0 || recording || transcribing) {
      return;
    }
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setVoiceError(voiceErrorMessage("unsupported", t));
      return;
    }

    setVoiceError(null);
    setPendingTranscript(null);
    cancelledRef.current = false;
    chunksRef.current = [];
    recordedBytesRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = recordingMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();
      requestIdRef.current = crypto.randomUUID();

      recorder.addEventListener("dataavailable", (event) => {
        if (!event.data.size) return;
        recordedBytesRef.current += event.data.size;
        chunksRef.current.push(event.data);
        if (
          recordedBytesRef.current > CONVERSATION_AUDIO.maxBytes &&
          recorder.state !== "inactive"
        ) {
          recorder.stop();
        }
      });

      recorder.addEventListener("stop", () => {
        clearRecordingTimer();
        stopTracks();
        setRecording(false);

        const durationMs = Math.max(
          0,
          Math.round(performance.now() - startedAtRef.current),
        );
        setElapsedMs(durationMs);

        if (cancelledRef.current) {
          chunksRef.current = [];
          recordedBytesRef.current = 0;
          return;
        }

        if (durationMs < CONVERSATION_AUDIO.minDurationMs) {
          setVoiceError(voiceErrorMessage("too_short", t));
          return;
        }

        const type = recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];

        if (blob.size > CONVERSATION_AUDIO.maxBytes) {
          setVoiceError(voiceErrorMessage("too_large", t));
          return;
        }

        const requestId = requestIdRef.current ?? crypto.randomUUID();
        setRetryBlob(blob);
        setRetryDurationMs(durationMs);
        setRetryRequestId(requestId);
        void transcribe(blob, durationMs, requestId);
      });

      recorder.start(500);
      setElapsedMs(0);
      setRecording(true);
      captureProductEvent("voice_recording_started", { targetLanguage });

      timerRef.current = window.setInterval(() => {
        const next = Math.max(
          0,
          Math.round(performance.now() - startedAtRef.current),
        );
        setElapsedMs(next);
        if (
          next >= CONVERSATION_AUDIO.maxDurationSeconds * 1000 &&
          recorder.state !== "inactive"
        ) {
          recorder.stop();
        }
      }, 250);
    } catch (recordError) {
      stopTracks();
      const name = recordError instanceof DOMException ? recordError.name : "";
      const code: VoiceErrorCode =
        name === "NotAllowedError" || name === "SecurityError"
          ? "permission_denied"
          : name === "NotFoundError" || name === "DevicesNotFoundError"
            ? "no_microphone"
            : "unsupported";
      setVoiceError(voiceErrorMessage(code, t));
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state !== "inactive") recorder?.stop();
  }

  function cancelRecording() {
    if (!recording) return;
    cancelledRef.current = true;
    const durationSeconds = Math.max(0, Math.ceil(elapsedMs / 1000));
    captureProductEvent("voice_recording_cancelled", { durationSeconds });
    const recorder = recorderRef.current;
    if (recorder?.state !== "inactive") recorder.stop();
    clearRecordingTimer();
    stopTracks();
    setElapsedMs(0);
  }

  function retryTranscription() {
    if (!retryBlob || !retryRequestId || transcribing) return;
    void transcribe(retryBlob, retryDurationMs, retryRequestId);
  }

  function applyPendingTranscript(mode: "append" | "replace") {
    if (!pendingTranscript) return;
    const next =
      mode === "replace"
        ? pendingTranscript
        : [draft.trimEnd(), pendingTranscript].filter(Boolean).join(" ");
    setDraft(next);
    setVoiceDraftBaseline(next);
    setPendingTranscript(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || streaming || recording || transcribing) return;

    const voiceBaseline = voiceDraftBaseline;
    setDraft("");
    setVoiceDraftBaseline(null);
    setError(null);
    setStreaming(true);

    const userId = "local-user-" + ++temporaryId.current;
    const assistantId = "local-assistant-" + ++temporaryId.current;

    setMessages((current) => [
      ...current,
      { id: userId, role: "USER", content: message },
      { id: assistantId, role: "ASSISTANT", content: "" },
    ]);

    try {
      const requestId = crypto.randomUUID();
      const response = await fetch("/api/conversation/" + sessionId + "/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, requestId }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? t("conversation.sendError"));
      }

      if (voiceBaseline !== null) {
        captureProductEvent("voice_transcript_sent", {
          edited: message !== voiceBaseline.trim(),
        });
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? { ...item, content: item.content + chunk }
              : item,
          ),
        );
      }

      router.refresh();
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (actionError) {
      setMessages((current) =>
        current.filter((item) => item.id !== assistantId),
      );
      setDraft(message);
      if (voiceBaseline !== null) setVoiceDraftBaseline(voiceBaseline);
      setError(
        actionError instanceof Error
          ? actionError.message
          : t("conversation.continueError"),
      );
    } finally {
      setStreaming(false);
    }
  }

  const elapsedSeconds = Math.ceil(elapsedMs / 1000);
  const voiceUnavailable = !voiceEnabled || remainingMinutes <= 0;

  return (
    <section className="conversation-chat">
      <div className="conversation-messages" aria-live="polite">
        {messages.map((message) => {
          const isUser = message.role === "USER";
          return (
            <article
              className={"conversation-message " + (isUser ? "is-user" : "is-assistant")}
              key={message.id}
            >
              <div className="conversation-avatar" aria-hidden="true">
                {isUser ? <UserRound size={17} /> : <Bot size={17} />}
              </div>
              <div className="conversation-bubble">
                <span>{isUser ? t("conversation.you") : tutorLabel}</span>
                <p className="learning-content" lang={lang} dir={dir}>
                  {message.content || (streaming && !isUser ? "…" : "")}
                </p>
              </div>
            </article>
          );
        })}
        <div ref={endRef} />
      </div>

      <form className="conversation-composer" onSubmit={submit}>
        <div className="conversation-composer-input">
          <textarea
            ref={textareaRef}
            rows={2}
            value={draft}
            disabled={streaming}
            placeholder={t("conversation.replyPlaceholder")}
            aria-label={t("conversation.yourReply")}
            lang={lang}
            dir={dir}
            className="learning-content"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />

          <div className="conversation-voice-controls">
            {!recording ? (
              <button
                type="button"
                className="conversation-mic-button"
                onClick={startRecording}
                disabled={
                  streaming ||
                  transcribing ||
                  voiceUnavailable
                }
                aria-label={t("conversation.voice.start")}
                title={
                  !voiceEnabled
                    ? t("conversation.voice.proRequired")
                    : remainingMinutes <= 0
                      ? t("conversation.voice.quotaReached")
                      : t("conversation.voice.start")
                }
              >
                <Mic size={18} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="conversation-mic-button is-recording"
                  onClick={stopRecording}
                  aria-label={t("conversation.voice.stop")}
                >
                  <Square size={17} />
                </button>
                <button
                  type="button"
                  className="conversation-mic-button"
                  onClick={cancelRecording}
                  aria-label={t("conversation.voice.cancel")}
                >
                  <Trash2 size={17} />
                </button>
              </>
            )}
          </div>

          <button
            type="submit"
            className="conversation-send-button"
            disabled={!canSend}
            aria-busy={streaming}
            aria-label={streaming ? t("conversation.tutorReplying") : t("conversation.send")}
            title={streaming ? t("conversation.tutorReplyingLong") : t("conversation.sendEnter")}
          >
            <Send className="rtl-mirror" size={18} />
          </button>
        </div>

        {recording ? (
          <div className="conversation-recording-status" role="status">
            <span className="conversation-recording-dot" />
            <strong>{t("conversation.voice.recording")}</strong>
            <span>
              {elapsedSeconds}s / {CONVERSATION_AUDIO.maxDurationSeconds}s
            </span>
          </div>
        ) : null}

        {transcribing ? (
          <div className="conversation-recording-status" role="status">
            <span className="conversation-transcribing-spinner" />
            <span>{t("conversation.voice.transcribing")}</span>
          </div>
        ) : null}

        {pendingTranscript ? (
          <div className="conversation-transcript-choice" role="status">
            <div>
              <strong>{t("conversation.voice.draftExistsTitle")}</strong>
              <span>{t("conversation.voice.draftExistsBody")}</span>
            </div>
            <div>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => applyPendingTranscript("append")}
              >
                {t("conversation.voice.append")}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => applyPendingTranscript("replace")}
              >
                {t("conversation.voice.replace")}
              </button>
            </div>
          </div>
        ) : null}

        {voiceError ? (
          <div className="conversation-voice-error" role="alert">
            <span>{voiceError}</span>
            {retryBlob && retryRequestId ? (
              <button
                type="button"
                className="text-link"
                onClick={retryTranscription}
                disabled={transcribing}
              >
                <RotateCcw size={14} />
                {t("conversation.voice.retry")}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="conversation-composer-footer">
          <span className="conversation-composer-hint">{t("conversation.composerHint")}</span>
          <span className="conversation-voice-quota">
            {voiceEnabled
              ? t("conversation.voice.remaining", {
                  remaining: remainingMinutes,
                  limit: voiceLimitMinutes,
                })
              : t("conversation.voice.proRequired")}
          </span>
        </div>
      </form>

      {error ? (
        <p className="conversation-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
