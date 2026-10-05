export const CONVERSATION_AUDIO = {
  maxDurationSeconds: 90,
  maxBytes: 8 * 1024 * 1024,
  minDurationMs: 350,
  transcriptionModel:
    process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-transcribe",
  acceptedMimeTypes: [
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/flac",
  ] as const,
} as const;

export type SupportedConversationAudioMime =
  (typeof CONVERSATION_AUDIO.acceptedMimeTypes)[number];

export function recordingMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mimeType of [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ]) {
    if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
  }
  return "";
}

export function normalizedAudioMime(value: string) {
  return value.split(";")[0].trim().toLowerCase();
}

export function isSupportedConversationAudioMime(value: string) {
  const normalized = normalizedAudioMime(value);
  return (CONVERSATION_AUDIO.acceptedMimeTypes as readonly string[]).includes(
    normalized,
  );
}

export function extensionForAudioMime(value: string) {
  switch (normalizedAudioMime(value)) {
    case "audio/webm": return "webm";
    case "audio/ogg": return "ogg";
    case "audio/mp4": return "mp4";
    case "audio/mpeg": return "mp3";
    case "audio/wav":
    case "audio/x-wav": return "wav";
    case "audio/flac": return "flac";
    default: return null;
  }
}
