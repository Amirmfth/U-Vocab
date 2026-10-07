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
    <section className="conversation-chat [display:flex] [flex-direction:column] [gap:14px] [width:100%] [max-width:860px] [margin-inline:auto] [min-height:56vh]">
      <div className="conversation-messages [display:flex] [flex-direction:column] [gap:18px] [padding:12px_2px_112px] min-[620px]:[padding-bottom:128px]" aria-live="polite">
        {messages.map((message) => {
          const isUser = message.role === "USER";
          return (
            <article
              className={"conversation-message [&_>_span]:[color:var(--text-muted)] [&_>_span]:[font-size:0.62rem] [&_>_span]:[font-weight:650] [&_>_span]:[text-transform:uppercase] [&_>_span]:[letter-spacing:0.08em] [&_>_p]:[margin:0] [&_>_p]:[padding:11px_13px] [&_>_p]:[border-radius:14px] [&_>_p]:[line-height:1.55] [&_>_p]:[white-space:pre-wrap] [&.is-assistant]:[align-self:flex-start] [&.is-assistant_>_p]:[border:1px_solid_var(--border)] [&.is-assistant_>_p]:[background:var(--surface)] [&.is-user]:[align-self:flex-end] [&.is-user_>_p]:[background:var(--primary)] [&.is-user_>_p]:[color:white] [width:100%] [max-width:none] [display:flex] [flex-direction:row] [align-items:flex-start] [gap:10px] [&.is-user]:[flex-direction:row-reverse] [&.is-user]:[align-items:flex-start] [&.is-user_.conversation-avatar]:[border-color:color-mix(in_srgb,_var(--primary)_42%,_var(--border))] [&.is-user_.conversation-avatar]:[background:var(--primary-soft)] [&.is-user_.conversation-avatar]:[color:var(--primary-strong)] [&.is-user_.conversation-bubble]:[align-items:flex-end] [&.is-user_.conversation-bubble_>_p]:[border-color:transparent] [&.is-user_.conversation-bubble_>_p]:[border-radius:18px_18px_6px_18px] [&.is-user_.conversation-bubble_>_p]:[background:var(--primary)] [&.is-user_.conversation-bubble_>_p]:[color:white] " + (isUser ? "is-user" : "is-assistant")}
              key={message.id}
            >
              <div className="conversation-avatar [width:32px] [height:32px] [flex:0_0_32px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:50%] [background:var(--surface-raised)] [color:var(--text-muted)]" aria-hidden="true">
                {isUser ? <UserRound size={17} /> : <Bot size={17} />}
              </div>
              <div className="conversation-bubble [min-width:0] [max-width:min(82%,_680px)] [display:flex] [flex-direction:column] [gap:5px] [&_>_span]:[padding-inline:3px] [&_>_span]:[color:var(--text-muted)] [&_>_span]:[font-size:0.68rem] [&_>_span]:[font-weight:650] [&_>_p]:[margin:0] [&_>_p]:[padding:11px_14px] [&_>_p]:[border:1px_solid_var(--border)] [&_>_p]:[border-radius:18px_18px_18px_6px] [&_>_p]:[background:var(--surface)] [&_>_p]:[color:var(--text)] [&_>_p]:[line-height:1.58] [&_>_p]:[white-space:pre-wrap] min-[620px]:[max-width:min(76%,_700px)]">
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

      <form className="conversation-composer [flex-direction:column] min-[620px]:[display:grid] min-[620px]:[grid-template-columns:minmax(0,_1fr)_auto] min-[620px]:[align-items:end] min-[620px]:[&_textarea]:[min-height:64px] [position:sticky] [bottom:calc(var(--mobile-nav-height)_+_10px)] [z-index:12] [display:grid] [grid-template-columns:minmax(0,_1fr)_44px] [gap:8px] [align-items:end] [padding:8px_8px_6px_14px] [border:1px_solid_var(--border-strong)] [border-radius:20px] [background:color-mix(in_srgb,_var(--surface-raised)_96%,_transparent)] [box-shadow:var(--shadow)] [backdrop-filter:blur(16px)] [&_textarea]:[min-height:44px] [&_textarea]:[max-height:150px] [&_textarea]:[padding:10px_0_7px] [&_textarea]:[resize:none] [&_textarea]:[border:0] [&_textarea]:[background:transparent] [&_textarea]:[box-shadow:none] [&_textarea:focus]:[box-shadow:none] min-[620px]:[bottom:18px]" onSubmit={submit}>
        <div className="conversation-composer-input [display:grid] [grid-template-columns:minmax(0,_1fr)_auto_auto] [gap:8px] [align-items:end] [&_textarea]:[margin:0] max-[560px]:[grid-template-columns:minmax(0,_1fr)_auto] max-[560px]:[&_textarea]:[grid-row:1_/_span_2]">
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

          <div className="conversation-voice-controls [display:flex] [gap:6px] max-[560px]:[grid-column:2] max-[560px]:[grid-row:1] max-[560px]:[align-self:start] max-[560px]:[margin-top:4px]">
            {!recording ? (
              <button
                type="button"
                className="conversation-mic-button [width:48px] [height:48px] [display:inline-grid] [place-items:center] [flex:none] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface-raised)] [color:var(--text-soft)] [cursor:pointer] [&:disabled]:[opacity:.45] [&:disabled]:[cursor:not-allowed] [&.is-recording]:[color:var(--danger)] [&.is-recording]:[border-color:color-mix(in_srgb,_var(--danger)_45%,_var(--border))] [&.is-recording]:[background:var(--danger-soft)]"
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
                  className="conversation-mic-button is-recording [width:48px] [height:48px] [display:inline-grid] [place-items:center] [flex:none] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface-raised)] [color:var(--text-soft)] [cursor:pointer] [&:disabled]:[opacity:.45] [&:disabled]:[cursor:not-allowed] [&.is-recording]:[color:var(--danger)] [&.is-recording]:[border-color:color-mix(in_srgb,_var(--danger)_45%,_var(--border))] [&.is-recording]:[background:var(--danger-soft)]"
                  onClick={stopRecording}
                  aria-label={t("conversation.voice.stop")}
                >
                  <Square size={17} />
                </button>
                <button
                  type="button"
                  className="conversation-mic-button [width:48px] [height:48px] [display:inline-grid] [place-items:center] [flex:none] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface-raised)] [color:var(--text-soft)] [cursor:pointer] [&:disabled]:[opacity:.45] [&:disabled]:[cursor:not-allowed] [&.is-recording]:[color:var(--danger)] [&.is-recording]:[border-color:color-mix(in_srgb,_var(--danger)_45%,_var(--border))] [&.is-recording]:[background:var(--danger-soft)]"
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
            className="conversation-send-button [width:44px] [height:44px] [display:grid] [place-items:center] [border:0] [border-radius:50%] [background:var(--primary)] [color:white] [cursor:pointer] [transition:transform_140ms_ease,_opacity_140ms_ease] [&:hover:not(:disabled)]:[transform:translateY(-1px)] [&:disabled]:[opacity:0.42] [&:disabled]:[cursor:not-allowed] max-[560px]:[grid-column:2]"
            disabled={!canSend}
            aria-busy={streaming}
            aria-label={streaming ? t("conversation.tutorReplying") : t("conversation.send")}
            title={streaming ? t("conversation.tutorReplyingLong") : t("conversation.sendEnter")}
          >
            <Send className="rtl-mirror" size={18} />
          </button>
        </div>

        {recording ? (
          <div className="conversation-recording-status [display:flex] [align-items:center] [gap:8px] [min-height:24px] [font-size:.78rem] [color:var(--text-soft)]" role="status">
            <span className="conversation-recording-dot [width:9px] [height:9px] [border-radius:50%] [background:var(--danger)] [box-shadow:0_0_0_4px_var(--danger-soft)]" />
            <strong>{t("conversation.voice.recording")}</strong>
            <span>
              {elapsedSeconds}s / {CONVERSATION_AUDIO.maxDurationSeconds}s
            </span>
          </div>
        ) : null}

        {transcribing ? (
          <div className="conversation-recording-status [display:flex] [align-items:center] [gap:8px] [min-height:24px] [font-size:.78rem] [color:var(--text-soft)]" role="status">
            <span className="conversation-transcribing-spinner [width:13px] [height:13px] [border:2px_solid_var(--border-strong)] [border-top-color:var(--primary)] [border-radius:50%] [animation:conversation-spin_.8s_linear_infinite]" />
            <span>{t("conversation.voice.transcribing")}</span>
          </div>
        ) : null}

        {pendingTranscript ? (
          <div className="conversation-transcript-choice [display:grid] [gap:10px] [padding:12px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface-raised)] [&_>_div:first-child]:[display:grid] [&_>_div:first-child]:[gap:3px] [&_span]:[color:var(--text-soft)] [&_span]:[font-size:.8rem] [&_span]:[line-height:1.45] [&_>_div:last-child]:[display:flex] [&_>_div:last-child]:[flex-wrap:wrap] [&_>_div:last-child]:[gap:8px] [&_.button]:[width:auto] [&_.button]:[min-height:40px]" role="status">
            <div>
              <strong>{t("conversation.voice.draftExistsTitle")}</strong>
              <span>{t("conversation.voice.draftExistsBody")}</span>
            </div>
            <div>
              <button
                type="button"
                className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
                onClick={() => applyPendingTranscript("append")}
              >
                {t("conversation.voice.append")}
              </button>
              <button
                type="button"
                className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
                onClick={() => applyPendingTranscript("replace")}
              >
                {t("conversation.voice.replace")}
              </button>
              <button
                type="button"
                className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
                onClick={() => setPendingTranscript(null)}
              >
                {t("conversation.voice.discard")}
              </button>
            </div>
          </div>
        ) : null}

        {voiceError ? (
          <div className="conversation-voice-error [display:flex] [align-items:center] [gap:8px] [min-height:24px] [font-size:.78rem] [justify-content:space-between] [color:var(--danger)] [&_.text-link]:[border:0] [&_.text-link]:[background:transparent] [&_.text-link]:[display:inline-flex] [&_.text-link]:[align-items:center] [&_.text-link]:[gap:5px] [&_.text-link]:[cursor:pointer] [&_.text-link]:[white-space:nowrap]" role="alert">
            <span>{voiceError}</span>
            {retryBlob && retryRequestId ? (
              <button
                type="button"
                className="text-link [color:var(--primary-strong)] [font-weight:560] [display:inline-flex] [align-items:center] [gap:6px]"
                onClick={retryTranscription}
                disabled={transcribing}
              >
                <RotateCcw size={14} />
                {t("conversation.voice.retry")}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="conversation-composer-footer [display:flex] [align-items:center] [gap:8px] [min-height:24px] [font-size:.78rem] [justify-content:space-between] [color:var(--text-muted)] max-[560px]:[align-items:flex-start] max-[560px]:[flex-direction:column]">
          <span className="conversation-composer-hint [grid-column:1_/_-1] [padding:0_2px_2px] [color:var(--text-muted)] [font-size:0.62rem]">{t("conversation.composerHint")}</span>
          <span className="conversation-voice-quota [text-align:end] max-[560px]:[text-align:start]">
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
        <p className="conversation-error [margin:0] [color:var(--danger)] [font-size:0.75rem]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
