export const AI_PROMPT_VERSIONS: Record<string, string> = {
  analyze_word: "v1",
  lexical_analysis: "v1",
  generate_examples: "v1",
  exercise_generation: "v1",
  answer_evaluation: "v3",
  lexical_insight: "v2",
  expand_word: "v2",
  word_expansion: "v2",
  topic_pack: "v2",
  topic_pack_generation: "v2",
  story_generation: "v2",
  reading_analysis: "v2",
  writing_task: "v2",
  writing_evaluation: "v3",
  conversation_setup: "v2",
  conversation_turn_evaluation: "v3",
  conversation_tutor: "v2",
  conversation_final_evaluation: "v3",
  word_comparison: "v2",
  verb_conjugation: "v1",
  lexeme_embedding: "v1",
  mistake_embedding: "v1",
  semantic_query_embedding: "v1",
  recommendation_rerank: "v1",
  lexical_edge_rerank: "v1",
  daily_session_plan: "v1",
};

export function promptVersionFor(operation: string) {
  return AI_PROMPT_VERSIONS[operation] ?? "v1";
}
