export type ProductEventMap = {
  signup_completed: { method: "email" | "other" };
  onboarding_started: { version: number; step: number };
  onboarding_step_completed: { version: number; step: number };
  onboarding_completed: { version: number };
  first_use_guide_seen: { guideId: string; version: number };
  first_use_guide_dismissed: { guideId: string; version: number };

  vocabulary_add_started: { source: "manual" | "paste" | "csv"; itemCount: number };
  vocabulary_added: {
    source: "manual" | "paste" | "csv";
    resolution: "canonical_hit" | "alias_hit" | "ai_generation" | "ambiguous" | "unknown";
    partOfSpeech: string;
    cefrLevel?: string | null;
  };
  vocabulary_duplicate_resolved: {
    resolution: "canonical_hit" | "alias_hit";
    alreadyOwned: boolean;
  };
  vocabulary_limit_reached: { limit: number; used: number };

  review_session_started: { dueCount: number; mode: string };
  review_answered: { rating: string; durationMs?: number | null };
  review_session_completed: { answeredCount: number; durationMs?: number | null };

  grammar_lesson_opened: { grammarConceptId: string; cefrLevel: string };
  grammar_practice_started: { grammarConceptId: string; exerciseType: string };
  grammar_practice_completed: {
    grammarConceptId: string;
    exerciseType: string;
    correct: boolean;
  };

  writing_started: { mode: string; level: string; targetWords: number };
  writing_completed: {
    mode: string;
    level: string;
    wordCount: number;
    overallScore?: number | null;
  };
  reading_started: { level: string; length: string; targetCount: number };
  reading_completed: {
    level: string;
    length: string;
    comprehensionScore?: number | null;
  };
  conversation_started: { kind: string; level: string; targetCount: number };
  conversation_completed: {
    kind: string;
    turnCount: number;
    overallScore?: number | null;
  };
  voice_transcription_used: { durationSeconds: number; success: boolean };

  paywall_viewed: { feature: string; quotaKey?: string | null };
  upgrade_started: { surface: string; plan: "PRO" };
  subscription_activated: { plan: "PRO"; provider: string };
  quota_exhausted: { quotaKey: string; limit: number; period: "DAY" | "MONTH" };
};

export type ProductEventName = keyof ProductEventMap;

export const PRODUCT_EVENT_NAMES = new Set<ProductEventName>([
  "signup_completed",
  "onboarding_started",
  "onboarding_step_completed",
  "onboarding_completed",
  "first_use_guide_seen",
  "first_use_guide_dismissed",
  "vocabulary_add_started",
  "vocabulary_added",
  "vocabulary_duplicate_resolved",
  "vocabulary_limit_reached",
  "review_session_started",
  "review_answered",
  "review_session_completed",
  "grammar_lesson_opened",
  "grammar_practice_started",
  "grammar_practice_completed",
  "writing_started",
  "writing_completed",
  "reading_started",
  "reading_completed",
  "conversation_started",
  "conversation_completed",
  "voice_transcription_used",
  "paywall_viewed",
  "upgrade_started",
  "subscription_activated",
  "quota_exhausted",
]);

const BLOCKED_EVENT_PROPERTY_KEYS = new Set([
  "answer",
  "content",
  "conversation",
  "draft",
  "email",
  "instructions",
  "message",
  "notes",
  "password",
  "prompt",
  "response",
  "text",
  "token",
]);

export function validateProductEventProperties(
  properties: Record<string, unknown>,
) {
  for (const [key, value] of Object.entries(properties)) {
    if (BLOCKED_EVENT_PROPERTY_KEYS.has(key.toLowerCase())) return false;
    if (
      !(
        value === null ||
        value === undefined ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      )
    ) {
      return false;
    }
    if (typeof value === "string" && value.length > 160) return false;
  }
  return true;
}
