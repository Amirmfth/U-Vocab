export const AI_PROMPT_VERSIONS: Record<string, string> = {
  analyze_word: "v1",
  generate_examples: "v1",
  exercise_generation: "v1",
  answer_evaluation: "v1",
  lexical_insight: "v1",
  expand_word: "v1",
  topic_pack: "v1",
  story_generation: "v1",
  reading_analysis: "v1",
  writing_task: "v1",
  writing_evaluation: "v1",
  conversation_setup: "v1",
  conversation_turn_evaluation: "v1",
  conversation_tutor: "v1",
  conversation_final_evaluation: "v1",
  word_comparison: "v1",
  lexeme_embedding: "v1",
  mistake_embedding: "v1",
  semantic_query_embedding: "v1",
};

export function promptVersionFor(operation: string) {
  return AI_PROMPT_VERSIONS[operation] ?? "unversioned";
}
