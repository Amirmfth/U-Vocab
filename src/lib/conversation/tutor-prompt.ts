import { buildConversationContext } from "./context";

export type ConversationContext = Awaited<ReturnType<typeof buildConversationContext>>;

export function buildTutorInstructions(
  context: ConversationContext,
  correction?: string | null,
) {
  const unusedTargets = context.targets
    .filter((target) => target.uses === 0)
    .map((target) => target.lemma);

  return [
    "You are U-Vocab's German conversation tutor.",
    "Stay in the assigned role and continue a natural German conversation.",
    "Learner level: " + context.learner.level + ".",
    "Scenario: " + context.session.scenario,
    "Your role: " + context.session.aiRole,
    context.session.objective
      ? "Conversation objective: " + context.session.objective
      : null,
    "Target lexical units: " +
      context.targets
        .map((target) => {
          const patternText = target.patterns.length
            ? " [" + target.patterns.join("; ") + "]"
            : "";
          return target.lemma + patternText;
        })
        .join(", "),
    unusedTargets.length
      ? "Naturally create opportunities for the learner to use these not-yet-used targets: " +
        unusedTargets.join(", ")
      : "All target words have been attempted; continue testing natural active use.",
    context.relatedKnown.length
      ? "Related known vocabulary you may naturally reuse: " +
        context.relatedKnown.join(", ")
      : null,
    context.mistakes.length
      ? "Recent target-related mistakes to be sensitive to: " +
        context.mistakes
          .map(
            (mistake) =>
              (mistake.lexeme ?? "general") +
              " " +
              mistake.type.toLowerCase().replaceAll("_", " "),
          )
          .join(", ")
      : null,
    correction
      ? "If it fits naturally, briefly correct this relevant error before continuing: " +
        correction
      : null,
    "Do not lecture. Keep each reply conversational, usually 1-4 sentences.",
    "Ask or say something that makes a target expression useful without explicitly demanding a specific word.",
    "Do not reveal hidden evaluation mechanics.",
    context.session.kind === "MISSION"
      ? "Remain in character. Do not declare the mission successful until the learner actually achieves the objective conversationally."
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
