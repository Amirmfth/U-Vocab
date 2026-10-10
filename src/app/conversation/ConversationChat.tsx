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
    <section className="conversation-chat flex flex-col gap-3.5 w-full max-w-uv-a9051779da mx-auto uv-min-height-e5ba4e032a">
      <div className="conversation-messages flex flex-col gap-4.5 uv-padding-784a5bb832 uv-min620:pb-32" aria-live="polite">
        {messages.map((message) => {
          const isUser = message.role === "USER";
          return (
            <article
              className={"conversation-message uv-v22810335d8:text-uv-text-muted uv-v22810335d8:text-uv-f174ef476a0 uv-v22810335d8:uv-weight-650 uv-v22810335d8:uppercase uv-v22810335d8:uv-letter-spacing-f49b9114de uv-v026f084606:m-0 uv-v026f084606:uv-padding-2e9fc07eac uv-v026f084606:rounded-uv-rd65225386d uv-v026f084606:uv-line-height-05c248da4c uv-v026f084606:whitespace-pre-wrap uv-v37d0b116c1:self-start uv-v8b6b40051e:uv-border-8d7f82f403 uv-v8b6b40051e:bg-uv-surface uv-ve7c06fc78f:self-end uv-v123b211084:bg-uv-primary uv-v123b211084:uv-color-528cef87d0 w-full max-w-none flex flex-row items-start gap-2.5 uv-ve7c06fc78f:flex-row-reverse uv-ve7c06fc78f:items-start uv-v8bf3f97875:uv-border-color-1affe77f6c uv-v8bf3f97875:bg-uv-cbdfd7cd038 uv-v8bf3f97875:text-uv-primary-strong uv-v541011a805:items-end uv-vfbb80649de:border-transparent uv-vfbb80649de:rounded-uv-rb907f29c2a uv-vfbb80649de:bg-uv-primary uv-vfbb80649de:uv-color-528cef87d0 " + (isUser ? "is-user" : "is-assistant")}
              key={message.id}
            >
              <div className="conversation-avatar w-8 h-8 uv-flex-f51e933a89 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-rb46da6ec37 bg-uv-surface-raised text-uv-text-muted" aria-hidden="true">
                {isUser ? <UserRound size={17} /> : <Bot size={17} />}
              </div>
              <div className="conversation-bubble min-w-0 uv-max-width-e8b1b45390 flex flex-col gap-1.25 uv-v22810335d8:px-0.75 uv-v22810335d8:text-uv-text-muted uv-v22810335d8:text-uv-f78eb7000a9 uv-v22810335d8:uv-weight-650 uv-v026f084606:m-0 uv-v026f084606:uv-padding-2c82595ddd uv-v026f084606:uv-border-8d7f82f403 uv-v026f084606:rounded-uv-rdc43399a6e uv-v026f084606:bg-uv-surface uv-v026f084606:text-uv-text uv-v026f084606:uv-line-height-fe7a9b32f9 uv-v026f084606:whitespace-pre-wrap uv-min620:uv-max-width-bdcfb10a63">
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

      <form className="conversation-composer flex-col uv-min620:grid uv-min620:uv-grid-template-columns-f06dd92ea5 uv-min620:items-end uv-min620:uv-v3c40c23539:min-h-16 sticky uv-bottom-af4098e1ca uv-z-index-7b52009b64 grid uv-grid-template-columns-9ec3f125f4 gap-2 items-end uv-padding-40a2f0cf13 uv-border-488f4b382f rounded-uv-r998b02c207 uv-background-283a8f83ba uv-box-shadow-4ee177db8b uv-backdrop-filter-44b1307bc7 uv-v3c40c23539:min-h-11 uv-v3c40c23539:max-h-37.5 uv-v3c40c23539:uv-padding-766138ac4d uv-v3c40c23539:resize-none uv-v3c40c23539:border-0 uv-v3c40c23539:bg-transparent uv-v3c40c23539:uv-box-shadow-71f8e7976e uv-vfeb3f72e04:uv-box-shadow-71f8e7976e uv-min620:bottom-4.5" onSubmit={submit}>
        <div className="conversation-composer-input grid uv-grid-template-columns-c3b0b81963 gap-2 items-end uv-v3c40c23539:m-0 uv-max560:uv-grid-template-columns-f06dd92ea5 uv-max560:uv-v3c40c23539:uv-grid-row-1cff6f63e0">
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

          <div className="conversation-voice-controls flex gap-1.5 uv-max560:uv-grid-column-da4b9237ba uv-max560:uv-grid-row-356a192b79 uv-max560:self-start uv-max560:mt-1">
            {!recording ? (
              <button
                type="button"
                className="conversation-mic-button w-12 h-12 uv-display-c5d9aaf66e uv-place-items-305047e96e uv-flex-71f8e7976e uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface-raised text-uv-text-soft cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed uv-vedeafcbfd0:text-uv-danger uv-vedeafcbfd0:uv-border-color-7e8e763970 uv-vedeafcbfd0:bg-uv-c8b3083dabe"
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
                  className="conversation-mic-button is-recording w-12 h-12 uv-display-c5d9aaf66e uv-place-items-305047e96e uv-flex-71f8e7976e uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface-raised text-uv-text-soft cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed uv-vedeafcbfd0:text-uv-danger uv-vedeafcbfd0:uv-border-color-7e8e763970 uv-vedeafcbfd0:bg-uv-c8b3083dabe"
                  onClick={stopRecording}
                  aria-label={t("conversation.voice.stop")}
                >
                  <Square size={17} />
                </button>
                <button
                  type="button"
                  className="conversation-mic-button w-12 h-12 uv-display-c5d9aaf66e uv-place-items-305047e96e uv-flex-71f8e7976e uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface-raised text-uv-text-soft cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed uv-vedeafcbfd0:text-uv-danger uv-vedeafcbfd0:uv-border-color-7e8e763970 uv-vedeafcbfd0:bg-uv-c8b3083dabe"
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
            className="conversation-send-button w-11 h-11 grid uv-place-items-305047e96e border-0 rounded-uv-rb46da6ec37 bg-uv-primary uv-color-528cef87d0 cursor-pointer uv-transition-886729f578 uv-v999cdc25ee:uv-transform-4693dc4baa disabled:opacity-42 disabled:cursor-not-allowed uv-max560:uv-grid-column-da4b9237ba"
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
            <span className="conversation-recording-dot w-2.25 h-2.25 rounded-uv-rb46da6ec37 bg-uv-danger uv-box-shadow-7ded488c40" />
            <strong>{t("conversation.voice.recording")}</strong>
            <span>
              {elapsedSeconds}s / {CONVERSATION_AUDIO.maxDurationSeconds}s
            </span>
          </div>
        ) : null}

        {transcribing ? (
          <div className="conversation-recording-status flex items-center gap-2 min-h-6 text-uv-f5f68d82942 text-uv-text-soft" role="status">
            <span className="conversation-transcribing-spinner w-3.25 h-3.25 uv-border-641cdc601e border-t-uv-primary rounded-uv-rb46da6ec37 uv-animation-88fe13492d" />
            <span>{t("conversation.voice.transcribing")}</span>
          </div>
        ) : null}

        {pendingTranscript ? (
          <div className="conversation-transcript-choice grid gap-2.5 p-3 uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface-raised uv-v0fee2d502c:grid uv-v0fee2d502c:gap-0.75 uv-v36c0309a03:text-uv-text-soft uv-v36c0309a03:text-uv-fdbd07cbfaa uv-v36c0309a03:uv-line-height-2792cf2449 uv-vaff5733806:flex uv-vaff5733806:flex-wrap uv-vaff5733806:gap-2 uv-vcded88c612:w-auto uv-vcded88c612:min-h-10" role="status">
            <div>
              <strong>{t("conversation.voice.draftExistsTitle")}</strong>
              <span>{t("conversation.voice.draftExistsBody")}</span>
            </div>
            <div>
              <button
                type="button"
                className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
                onClick={() => applyPendingTranscript("append")}
              >
                {t("conversation.voice.append")}
              </button>
              <button
                type="button"
                className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
                onClick={() => applyPendingTranscript("replace")}
              >
                {t("conversation.voice.replace")}
              </button>
              <button
                type="button"
                className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
                onClick={() => setPendingTranscript(null)}
              >
                {t("conversation.voice.discard")}
              </button>
            </div>
          </div>
        ) : null}

        {voiceError ? (
          <div className="conversation-voice-error flex items-center gap-2 min-h-6 text-uv-f5f68d82942 justify-between text-uv-danger uv-vffc37e4c0f:border-0 uv-vffc37e4c0f:bg-transparent uv-vffc37e4c0f:inline-flex uv-vffc37e4c0f:items-center uv-vffc37e4c0f:gap-1.25 uv-vffc37e4c0f:cursor-pointer uv-vffc37e4c0f:whitespace-nowrap" role="alert">
            <span>{voiceError}</span>
            {retryBlob && retryRequestId ? (
              <button
                type="button"
                className="text-link text-uv-primary-strong uv-weight-560 inline-flex items-center gap-1.5"
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
          <span className="conversation-composer-hint uv-grid-column-93b665dfb5 uv-padding-7c5bf472f0 text-uv-text-muted text-uv-f174ef476a0">{t("conversation.composerHint")}</span>
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
