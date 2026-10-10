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
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function cancelRecording() {
    if (!recording) return;
    cancelledRef.current = true;
    const durationSeconds = Math.max(0, Math.ceil(elapsedMs / 1000));
    captureProductEvent("voice_recording_cancelled", { durationSeconds });
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
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
    <section className="conversation-chat flex flex-col gap-3.5 w-full max-w-uv-a9051779da mx-auto min-height-56vh">
      <div className="conversation-messages flex flex-col gap-4.5 padding-12px-2px-112px uv-min620:pb-32" aria-live="polite">
        {messages.map((message) => {
          const isUser = message.role === "USER";
          return (
            <article
              className={"conversation-message in-span-2:text-uv-text-muted in-span-2:text-uv-f174ef476a0 in-span-2:font-650 in-span-2:uppercase in-span-2:letter-spacing-0p08em in-p:m-0 in-p:padding-11px-13px in-p:rounded-uv-rd65225386d in-p:line-height-1p55 in-p:whitespace-pre-wrap in-is-assistant:self-start in-is-assistant-p:border-1px-solid-border-2 in-is-assistant-p:bg-uv-surface in-is-user:self-end in-is-user-p:bg-uv-primary in-is-user-p:color-white w-full max-w-none flex flex-row items-start gap-2.5 in-is-user:flex-row-reverse in-is-user:items-start in-is-user-conversation-avatar:border-color-mix-in-srgb-primary-42pct-border in-is-user-conversation-avatar:bg-uv-cbdfd7cd038 in-is-user-conversation-avatar:text-uv-primary-strong in-is-user-conversation-bubble:items-end in-is-user-conversation-bubble-p:border-transparent in-is-user-conversation-bubble-p:rounded-uv-rb907f29c2a in-is-user-conversation-bubble-p:bg-uv-primary in-is-user-conversation-bubble-p:color-white " + (isUser ? "is-user" : "is-assistant")}
              key={message.id}
            >
              <div className="conversation-avatar w-8 h-8 flex-0-0-32px grid place-items-center border-1px-solid-border-2 rounded-uv-rb46da6ec37 bg-uv-surface-raised text-uv-text-muted" aria-hidden="true">
                {isUser ? <UserRound size={17} /> : <Bot size={17} />}
              </div>
              <div className="conversation-bubble min-w-0 max-width-min-82pct-680px flex flex-col gap-1.25 in-span-2:px-0.75 in-span-2:text-uv-text-muted in-span-2:text-uv-f78eb7000a9 in-span-2:font-650 in-p:m-0 in-p:padding-11px-14px in-p:border-1px-solid-border-2 in-p:rounded-uv-rdc43399a6e in-p:bg-uv-surface in-p:text-uv-text in-p:line-height-1p58 in-p:whitespace-pre-wrap uv-min620:max-width-min-76pct-700px">
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

      <form className="conversation-composer flex-col uv-min620:grid uv-min620:grid-template-columns-minmax-0-1fr-auto uv-min620:items-end uv-min620:in-textarea:min-h-16 sticky bottom-calc-mobile-nav-height-10px z-index-12 grid grid-template-columns-minmax-0-1fr-44px gap-2 items-end padding-8px-8px-6px-14px border-1px-solid-border-strong rounded-uv-r998b02c207 bg-color-mix-in-srgb-surface-raised-96pct-transparent box-shadow-shadow backdrop-filter-blur-16px in-textarea:min-h-11 in-textarea:max-h-37.5 in-textarea:padding-10px-0-7px in-textarea:resize-none in-textarea:border-0 in-textarea:bg-transparent in-textarea:box-shadow-none in-textarea-focus:box-shadow-none uv-min620:bottom-4.5" onSubmit={submit}>
        <div className="conversation-composer-input grid grid-template-columns-minmax-0-1fr-auto-auto gap-2 items-end in-textarea:m-0 uv-max560:grid-template-columns-minmax-0-1fr-auto uv-max560:in-textarea:grid-row-1-span-2">
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

          <div className="conversation-voice-controls flex gap-1.5 uv-max560:grid-column-2 uv-max560:grid-row-1 uv-max560:self-start uv-max560:mt-1">
            {!recording ? (
              <button
                type="button"
                className="conversation-mic-button w-12 h-12 display-inline-grid place-items-center flex-none border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface-raised text-uv-text-soft cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed in-is-recording:text-uv-danger in-is-recording:border-color-mix-in-srgb-danger-45pct-border in-is-recording:bg-uv-c8b3083dabe"
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
                  className="conversation-mic-button is-recording w-12 h-12 display-inline-grid place-items-center flex-none border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface-raised text-uv-text-soft cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed in-is-recording:text-uv-danger in-is-recording:border-color-mix-in-srgb-danger-45pct-border in-is-recording:bg-uv-c8b3083dabe"
                  onClick={stopRecording}
                  aria-label={t("conversation.voice.stop")}
                >
                  <Square size={17} />
                </button>
                <button
                  type="button"
                  className="conversation-mic-button w-12 h-12 display-inline-grid place-items-center flex-none border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface-raised text-uv-text-soft cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed in-is-recording:text-uv-danger in-is-recording:border-color-mix-in-srgb-danger-45pct-border in-is-recording:bg-uv-c8b3083dabe"
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
            className="conversation-send-button w-11 h-11 grid place-items-center border-0 rounded-uv-rb46da6ec37 bg-uv-primary color-white cursor-pointer transition-transform-140ms-ease-opacity-140ms-ease in-hover-not-disabled:transform-translatey-1px disabled:opacity-42 disabled:cursor-not-allowed uv-max560:grid-column-2"
            disabled={!canSend}
            aria-busy={streaming}
            aria-label={streaming ? t("conversation.tutorReplying") : t("conversation.send")}
            title={streaming ? t("conversation.tutorReplyingLong") : t("conversation.sendEnter")}
          >
            <Send className="rtl-mirror" size={18} />
          </button>
        </div>

        {recording ? (
          <div className="conversation-recording-status flex items-center gap-2 min-h-6 text-uv-f5f68d82942 text-uv-text-soft" role="status">
            <span className="conversation-recording-dot w-2.25 h-2.25 rounded-uv-rb46da6ec37 bg-uv-danger box-shadow-0-0-0-4px-danger-soft" />
            <strong>{t("conversation.voice.recording")}</strong>
            <span>
              {elapsedSeconds}s / {CONVERSATION_AUDIO.maxDurationSeconds}s
            </span>
          </div>
        ) : null}

        {transcribing ? (
          <div className="conversation-recording-status flex items-center gap-2 min-h-6 text-uv-f5f68d82942 text-uv-text-soft" role="status">
            <span className="conversation-transcribing-spinner w-3.25 h-3.25 border-2px-solid-border-strong border-t-uv-primary rounded-uv-rb46da6ec37 animation-conversation-spin-p8s-linear-infinite" />
            <span>{t("conversation.voice.transcribing")}</span>
          </div>
        ) : null}

        {pendingTranscript ? (
          <div className="conversation-transcript-choice grid gap-2.5 p-3 border-1px-solid-border-2 rounded-uv-rd65225386d bg-uv-surface-raised in-div-first-child:grid in-div-first-child:gap-0.75 in-span:text-uv-text-soft in-span:text-uv-fdbd07cbfaa in-span:line-height-1p45 in-div-last-child:flex in-div-last-child:flex-wrap in-div-last-child:gap-2 in-button-2:w-auto in-button-2:min-h-10" role="status">
            <div>
              <strong>{t("conversation.voice.draftExistsTitle")}</strong>
              <span>{t("conversation.voice.draftExistsBody")}</span>
            </div>
            <div>
              <button
                type="button"
                className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
                onClick={() => applyPendingTranscript("append")}
              >
                {t("conversation.voice.append")}
              </button>
              <button
                type="button"
                className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
                onClick={() => applyPendingTranscript("replace")}
              >
                {t("conversation.voice.replace")}
              </button>
              <button
                type="button"
                className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
                onClick={() => setPendingTranscript(null)}
              >
                {t("conversation.voice.discard")}
              </button>
            </div>
          </div>
        ) : null}

        {voiceError ? (
          <div className="conversation-voice-error flex items-center gap-2 min-h-6 text-uv-f5f68d82942 justify-between text-uv-danger in-text-link:border-0 in-text-link:bg-transparent in-text-link:inline-flex in-text-link:items-center in-text-link:gap-1.25 in-text-link:cursor-pointer in-text-link:whitespace-nowrap" role="alert">
            <span>{voiceError}</span>
            {retryBlob && retryRequestId ? (
              <button
                type="button"
                className="text-link text-uv-primary-strong font-560 inline-flex items-center gap-1.5"
                onClick={retryTranscription}
                disabled={transcribing}
              >
                <RotateCcw size={14} />
                {t("conversation.voice.retry")}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="conversation-composer-footer flex items-center gap-2 min-h-6 text-uv-f5f68d82942 justify-between text-uv-text-muted uv-max560:items-start uv-max560:flex-col">
          <span className="conversation-composer-hint grid-column-1-1 padding-0-2px-2px text-uv-text-muted text-uv-f174ef476a0">{t("conversation.composerHint")}</span>
          <span className="conversation-voice-quota text-end uv-max560:text-start">
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
        <p className="conversation-error m-0 text-uv-danger text-uv-f823f1262bd" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
