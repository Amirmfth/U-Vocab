import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { calculateUsageCost } from "@/lib/ai/pricing";
import {
  CONVERSATION_AUDIO,
  extensionForAudioMime,
  isSupportedConversationAudioMime,
  normalizedAudioMime,
} from "./audio-config";
import {
  directionForTarget,
  transcriptionLanguageForTarget,
} from "./transcription-language";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

test("recorded conversation limits are bounded and shared", () => {
  assert.equal(CONVERSATION_AUDIO.maxDurationSeconds, 90);
  assert.equal(CONVERSATION_AUDIO.maxBytes, 8 * 1024 * 1024);
  assert.ok(CONVERSATION_AUDIO.minDurationMs > 0);
});

test("browser MIME normalization maps to provider-supported extensions", () => {
  assert.equal(normalizedAudioMime("audio/webm;codecs=opus"), "audio/webm");
  assert.equal(isSupportedConversationAudioMime("audio/webm;codecs=opus"), true);
  assert.equal(isSupportedConversationAudioMime("audio/aac"), false);
  assert.equal(extensionForAudioMime("audio/mp4;codecs=mp4a.40.2"), "mp4");
  assert.equal(extensionForAudioMime("audio/mpeg"), "mp3");
});

test("target language is routed through a reusable transcription abstraction", () => {
  assert.equal(transcriptionLanguageForTarget("GERMAN"), "de");
  assert.equal(transcriptionLanguageForTarget("FRENCH"), "fr");
  assert.equal(transcriptionLanguageForTarget("PERSIAN"), "fa");
  assert.equal(transcriptionLanguageForTarget("UNKNOWN"), null);
  assert.equal(directionForTarget("PERSIAN"), "rtl");
  assert.equal(directionForTarget("GERMAN"), "ltr");
});

test("gpt-transcribe cost is recorded from audio duration", () => {
  const cost = calculateUsageCost({
    provider: "openai",
    model: "gpt-transcribe",
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    durationSeconds: 90,
  });
  assert.equal(cost.pricingKey, "openai-transcription-2026-10-05:gpt-transcribe");
  assert.equal(cost.totalCost, 0.00675);
});

test("transcription endpoint is authenticated, course-aware and quota-enforced", () => {
  const route = read("src/app/api/conversation/transcribe/route.ts");
  assert.match(route, /getCurrentUser/);
  assert.match(route, /getCurrentCourse/);
  assert.match(route, /UNAUTHORIZED/);
  assert.match(route, /requireEntitlement\(user\.id, "voice_transcription"\)/);
  assert.match(route, /voice_transcription_minutes_monthly/);
  assert.match(route, /conversation-transcription:/);
  assert.match(route, /userCourseId: course\.id/);
});

test("server validates actual audio duration rather than trusting form duration", () => {
  const route = read("src/app/api/conversation/transcribe/route.ts");
  assert.match(route, /parseBlob\(audio/);
  assert.match(route, /parsed\.format\.duration/);
  assert.match(route, /parsedDurationSeconds > CONVERSATION_AUDIO\.maxDurationSeconds/);
  assert.match(route, /Math\.ceil\(parsedDurationSeconds\)/);
});

test("transcription operation and safe audio metadata are recorded without transcript content", () => {
  const route = read("src/app/api/conversation/transcribe/route.ts");
  assert.match(route, /operation: "conversation_transcription"/);
  assert.match(route, /audioBytes: audio\.size/);
  assert.match(route, /durationSeconds/);
  assert.match(route, /targetLanguage: course\.targetLanguage/);
  const recorderBlock = route.slice(
    route.indexOf("createAIUsageRecorder"),
    route.indexOf("try {", route.indexOf("createAIUsageRecorder")),
  );
  assert.equal(recorderBlock.includes("transcript"), false);
});

test("raw audio is request-scoped and never persisted", () => {
  const route = read("src/app/api/conversation/transcribe/route.ts");
  assert.equal(route.includes("writeFile"), false);
  assert.equal(route.includes("createWriteStream"), false);
  assert.equal(route.includes("objectStorage"), false);
  assert.equal(route.includes("audio.create"), false);
  assert.match(route, /new File\(/);
});

test("composer never auto-sends transcripts and protects existing drafts", () => {
  const chat = read("src/app/conversation/ConversationChat.tsx");
  assert.match(chat, /setPendingTranscript\(transcript\)/);
  assert.match(chat, /applyPendingTranscript\("append"\)/);
  assert.match(chat, /applyPendingTranscript\("replace"\)/);
  assert.match(chat, /setPendingTranscript\(null\)/);
  const transcriptSuccess = chat.indexOf("const transcript = payload.transcript.trim()");
  const submit = chat.indexOf("async function submit");
  assert.ok(transcriptSuccess >= 0 && submit > transcriptSuccess);
  const between = chat.slice(transcriptSuccess, submit);
  assert.equal(between.includes("requestSubmit()"), false);
});

test("recording supports explicit start stop cancel retry and browser error fallback", () => {
  const chat = read("src/app/conversation/ConversationChat.tsx");
  for (const marker of [
    "startRecording",
    "stopRecording",
    "cancelRecording",
    "retryTranscription",
    "NotAllowedError",
    "NotFoundError",
    "MediaRecorder",
    "getUserMedia",
  ]) {
    assert.ok(chat.includes(marker), "missing " + marker);
  }
});

test("voice exhaustion does not disable ordinary Conversation typing", () => {
  const chat = read("src/app/conversation/ConversationChat.tsx");
  assert.match(chat, /voiceUnavailable/);
  assert.match(chat, /disabled=\{[\s\S]*voiceUnavailable/);
  assert.equal(
    /<textarea[\s\S]*disabled=\{[^}]*voiceUnavailable/.test(chat),
    false,
  );
});

test("voice analytics taxonomy excludes transcript text", () => {
  const events = read("src/lib/analytics/events.ts");
  for (const name of [
    "voice_recording_started",
    "voice_recording_cancelled",
    "voice_transcription_completed",
    "voice_transcription_failed",
    "voice_transcript_sent",
  ]) {
    assert.ok(events.includes(name));
  }
  assert.match(events, /"text"/);
  assert.match(events, /BLOCKED_EVENT_PROPERTY_KEYS/);
});

test("TWA remains a thin browser permission wrapper without native microphone bridge", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const docs = read("docs/android-twa.md");
  assert.equal(manifest.includes("android.permission.RECORD_AUDIO"), false);
  assert.match(docs, /getUserMedia\(\)/);
  assert.match(docs, /MediaRecorder/);
  assert.match(docs, /does not add a native JavaScript bridge/);
});
