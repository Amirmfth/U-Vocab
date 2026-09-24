export const AI_PROMPT_VERSIONS: Record<string, string> = {
  analyze_word: "v1",
  generate_examples: "v1",
  exercise_generation: "v1",
  answer_evaluation: "v2",
  lexical_insight: "v2",
  expand_word: "v2",
  topic_pack: "v2",
  story_generation: "v2",
  reading_analysis: "v2",
  writing_task: "v2",
  writing_evaluation: "v2",
  conversation_setup: "v2",
  conversation_turn_evaluation: "v2",
  conversation_tutor: "v2",
  conversation_final_evaluation: "v2",
  word_comparison: "v2",
  lexeme_embedding: "v1",
  mistake_embedding: "v1",
  semantic_query_embedding: "v1",
};

export function promptVersionFor(operation: string) {
  return AI_PROMPT_VERSIONS[operation] ?? "v1";
}
