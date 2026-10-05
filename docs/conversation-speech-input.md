# Recorded Conversation speech input

Conversation supports optional recorded speech-to-text as an input method. This is **not** realtime voice chat.

The canonical flow remains:

```
record
→ stop
→ upload completed audio
→ transcribe
→ editable textarea
→ learner edits
→ normal Send
→ existing Conversation evaluation/tutor pipeline
```

The transcript is never auto-submitted.

## Provider and model

As of October 5, 2026, OpenAI recommends `gpt-transcribe` for completed recorded speech. U-Vocab uses:

```env
OPENAI_TRANSCRIPTION_MODEL="gpt-transcribe"
```

The override exists for controlled migration, but the default should only change after reviewing current OpenAI transcription guidance.

U-Vocab does not use the Realtime API for this feature.

## Recording limits

Shared limits live in:

`src/lib/conversation/audio-config.ts`

Current limits:

- maximum duration: 90 seconds;
- maximum upload: 8 MiB;
- minimum useful duration: 350 ms.

The browser selects the first supported MediaRecorder MIME type from:

- WebM/Opus;
- WebM;
- Ogg/Opus;
- Ogg;
- MP4.

The server accepts provider-supported containers including WebM, Ogg, MP4, MPEG/MP3, WAV, and FLAC.

## Server validation

`POST /api/conversation/transcribe` is authenticated.

The endpoint resolves the authenticated user and active course itself. It also verifies that the supplied Conversation session belongs to that user/course and is active.

Validation happens before the provider call:

- multipart/form-data only through the route's FormData parser;
- content length guard;
- file required and non-empty;
- maximum byte size;
- allow-listed MIME type;
- audio container must be parseable;
- **duration is parsed from the uploaded audio server-side**;
- duration must remain inside the configured recording limits.

The client-reported duration is telemetry only and never controls quota/cost.

## Language

The transcription language comes from `UserCourse.targetLanguage`.

Mapping is centralized in:

`src/lib/conversation/transcription-language.ts`

This avoids hard-coding German in the API and allows future language expansion without rewriting the endpoint.

## Entitlements and quota

Voice transcription uses the existing entitlement service:

- feature: `voice_transcription`;
- quota: `voice_transcription_minutes_monthly`.

The backend is authoritative.

Quota amount is based on the parsed server-side audio duration, rounded up to whole minutes because the current product quota ledger is integer-based.

Free users or exhausted users keep the normal keyboard Conversation experience; only the microphone action is unavailable.

The Conversation composer displays the remaining voice-minute allowance and updates it after a successful transcription.

## Cost accounting

AI usage operation:

`conversation_transcription`

Safe metadata:

- model;
- parsed duration seconds;
- audio byte size;
- normalized audio MIME;
- target language;
- client duration only as a diagnostic comparison.

No transcript text or raw audio is written to generic AI telemetry.

`gpt-transcribe` is duration-priced. U-Vocab records its current $0.0045/minute rate through the central AI pricing module so `AiUsageEvent.totalCost` continues to feed admin/spend-safety reporting.

## Audio retention

Default retention policy:

1. receive audio in the request;
2. parse metadata in memory;
3. create the provider upload File in memory;
4. transcribe;
5. allow request memory to be released.

No filesystem write, object-storage upload, recording table, or permanent audio library is created.

Only the transcript can become persistent, and only after the learner explicitly sends the edited draft through the existing Conversation message endpoint.

## Draft safety

If the textarea is empty, the transcript is inserted and focused.

If unsent typed text already exists, U-Vocab does not modify it automatically. The learner chooses:

- append transcript;
- replace draft;
- discard transcript.

After insertion, the result is ordinary editable text.

## Errors

Client-side states are distinct:

- recording unsupported;
- microphone permission denied;
- microphone missing;
- recording too short;
- recording too large;
- network failure;
- quota/Pro restriction;
- transcription failure.

Provider/network failures retain the completed audio Blob in memory so the learner can retry transcription without recording again. The same request ID is reused, making the product quota reservation idempotent.

Typing remains available after every voice-specific error.

Expected browser/quota errors are handled as normal product states rather than Sentry exceptions.

## PWA

The installed PWA uses the same web APIs:

- `navigator.mediaDevices.getUserMedia()`;
- `MediaRecorder`;
- multipart `fetch()`.

The microphone permission prompt is triggered only after the learner presses the microphone button.

Test on mobile Chrome and the installed PWA:

1. allow microphone permission;
2. record/stop/transcribe;
3. edit before sending;
4. cancel a recording;
5. deny permission and verify keyboard fallback;
6. go offline before transcription and verify retry/fallback;
7. hit the 90-second limit;
8. verify an existing draft is not overwritten.

## Android TWA

The TWA remains a thin trusted browser wrapper. No native WebView bridge or duplicate native recorder is introduced.

The current wrapper does not declare Android `RECORD_AUDIO`; the trusted page is rendered by the browser and uses the web-origin microphone permission flow.

Physical-device verification steps are also listed in `docs/android-twa.md`.

## Analytics

Metadata-only events:

- `voice_recording_started`;
- `voice_recording_cancelled`;
- `voice_transcription_completed`;
- `voice_transcription_failed`;
- `voice_transcript_sent`.

No transcript text is sent to PostHog.

## Privacy-policy language

A concise accurate statement is:

> When you use speech input, U-Vocab sends the recording to its transcription provider to convert it to text. U-Vocab does not keep the raw recording by default. The resulting text is editable and is stored as a Conversation message only if you choose to send it.

Provider retention/data-processing terms should still be reflected in the production privacy policy based on the configured API account and applicable data controls.
