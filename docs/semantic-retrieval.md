# Semantic retrieval

U-Vocab uses pgvector only where semantic similarity materially helps. Exact lexical identity, learner state, FSRS scheduling, and explicit lexical relationships remain deterministic.

## Embedding contract

- Provider: OpenAI
- Default model: `text-embedding-3-small`
- Dimensions: 1536
- Model is configurable with `OPENAI_EMBEDDING_MODEL`
- Schema version is configurable with `OPENAI_EMBEDDING_VERSION`
- Each embedded row stores model, version, and timestamp

Increment `OPENAI_EMBEDDING_VERSION` whenever the canonical embedding text changes materially. The rebuild helpers then detect stale rows.

## Indexed objects

### Lexeme

The embedding text combines:
- German lemma
- article / part of speech
- EN + FA meanings
- lexical patterns
- a few examples

Used for:
- semantic neighbors
- recommendations
- topic/context retrieval

### Mistake

The embedding text combines:
- mistake taxonomy
- target lexeme
- expected value
- actual answer
- evaluator explanation

Used only to group meaningfully similar recurring errors. It does not replace the structured MistakeType taxonomy.

## Indexes

Both Lexeme and Mistake use HNSW with `vector_cosine_ops`.

## Rebuild

`rebuildLexemeEmbeddings()` and `rebuildMistakeEmbeddings()` process stale/missing rows in bounded batches. Recommendation UI exposes a semantic refresh action rather than silently indexing the entire database during page rendering.

## Benchmark

After applying the migration and indexing representative vocabulary:

```bash
npm run semantic:benchmark
```

The benchmark runs `EXPLAIN (ANALYZE, BUFFERS)` on the nearest-neighbor query so index use and latency can be inspected on the actual Neon dataset.

For small datasets PostgreSQL may reasonably choose a sequential scan; HNSW becomes relevant as the corpus grows.
