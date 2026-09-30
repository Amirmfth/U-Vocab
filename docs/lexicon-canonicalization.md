# Shared lexicon canonicalization

Vocabulary ingestion now resolves shared lexical data before lexical-analysis AI.

## Resolution order

1. Normalize the raw surface through the target-language adapter.
2. Check the canonical `Lexeme` key.
3. Check `LexemeAlias`.
4. Reuse a unique match immediately.
5. Treat collisions as ambiguous rather than guessing.
6. Only unresolved input reaches lexical-analysis AI.
7. Canonicalize the AI lemma, then transactionally upsert the lexeme, default sense, aliases, provenance, and learner attachment.

For German, normalization currently covers Unicode NFKC, whitespace, locale-aware lowercasing, safe quote/dash variants, and definite-article lookup variants. It intentionally does **not** stem words.

## Sense boundary

`LexemeSense` is explicit, but this issue keeps examples and lexical patterns at lexeme level because current generation and UI treat them as generally applicable to the lexical unit. Translations are linked to the default sense while retaining their legacy `lexemeId`, so existing queries remain compatible. Future sense-aware features can move examples/pattern associations only when there is reliable disambiguating evidence.

## Provenance and conservative merges

AI-derived candidates create `LexemeProvenance` records with provider, model, prompt/content version, timestamp, confidence when available, and review state. Existing canonical values are never blindly replaced by later AI output. New ingestion may fill missing article/plural/CEFR fields and add missing translations/examples/patterns, but conflicting populated fields remain unchanged.

Raw private user prompts are not stored in global provenance.

## Maintenance

Run a report without modifying data:

`npm run lexicon:maintain`

Backfill missing default aliases/senses and link legacy translations:

`npm run lexicon:maintain -- --write`

The script also reports:
- probable duplicate canonical lexemes after current language normalization;
- alias collisions;
- same normalized surface represented by multiple parts of speech.

It never auto-merges ambiguous records.
