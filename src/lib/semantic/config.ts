export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

export const EMBEDDING_VERSION = Number(
  process.env.OPENAI_EMBEDDING_VERSION ?? "1",
);

export const EMBEDDING_DIMENSIONS = 1536;
