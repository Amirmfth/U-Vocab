import {
  LexemeGrammarLinkSource,
  LexemeGrammarRelationType,
  type PartOfSpeech,
} from "@prisma/client";
import { db } from "@/lib/db";

export type ProposedGrammarLink = {
  grammarConceptId: string;
  relationType?: LexemeGrammarRelationType;
  lexicalPatternId?: string | null;
  note?: string | null;
  confidence?: number;
};

type LexemeForInference = {
  id: string;
  lemma: string;
  partOfSpeech: PartOfSpeech;
  article: string | null;
  patterns: Array<{ id: string; pattern: string; explanation: string | null }>;
};

function hasAny(value: string, needles: string[]) {
  const lower = value.toLocaleLowerCase("de-DE");
  return needles.some((needle) => lower.includes(needle));
}

export function inferDeterministicGrammarLinks(
  lexeme: LexemeForInference,
): ProposedGrammarLink[] {
  const links: ProposedGrammarLink[] = [];
  const lemma = lexeme.lemma.toLocaleLowerCase("de-DE");
  const patterns = lexeme.patterns.map((pattern) => ({
    ...pattern,
    lower: pattern.pattern.toLocaleLowerCase("de-DE"),
  }));

  const add = (
    grammarConceptId: string,
    relationType: LexemeGrammarRelationType = "EXEMPLIFIES",
    note?: string,
    lexicalPatternId?: string,
    confidence = 1,
  ) => {
    if (!links.some((item) => item.grammarConceptId === grammarConceptId && item.relationType === relationType)) {
      links.push({ grammarConceptId, relationType, note, lexicalPatternId, confidence });
    }
  };

  if (lexeme.partOfSpeech === "NOUN" && lexeme.article) {
    add("de.article.definite", "COMMON_WITH", "Noun gender is practiced with the definite article.", undefined, 0.95);
  }

  if (lexeme.partOfSpeech === "VERB") {
    add("de.verb.present-regular", "COMMON_WITH", "Verb forms can reinforce present-tense conjugation.", undefined, 0.75);
  }

  for (const pattern of patterns) {
    if (hasAny(pattern.lower, ["+ dat", "+dat", "dativ", "dat."])) {
      add("de.case.dative", "GOVERNS", pattern.pattern, pattern.id);
    }
    if (hasAny(pattern.lower, ["+ akk", "+akk", "akkusativ", "akk."])) {
      add("de.case.accusative", "GOVERNS", pattern.pattern, pattern.id);
    }
    if (hasAny(pattern.lower, ["sich ", " reflexiv", "reflexive"])) {
      add("de.verb.reflexive", "EXEMPLIFIES", pattern.pattern, pattern.id, 0.95);
    }
    if (lexeme.partOfSpeech === "VERB" && /(an|auf|aus|bei|für|gegen|in|mit|nach|über|um|von|vor|zu)/u.test(pattern.lower)) {
      add("de.preposition.prepositional-verbs", "GOVERNS", pattern.pattern, pattern.id, 0.9);
    }
  }

  if (lexeme.partOfSpeech === "PREPOSITION") {
    if (["mit","nach","aus","zu","von","bei","seit","gegenüber"].includes(lemma)) {
      add("de.preposition.dative", "GOVERNS", lemma + " + Dativ");
      add("de.case.dative", "GOVERNS", lemma + " governs dative");
    }
    if (["durch","für","gegen","ohne","um"].includes(lemma)) {
      add("de.preposition.accusative", "GOVERNS", lemma + " + Akkusativ");
      add("de.case.accusative", "GOVERNS", lemma + " governs accusative");
    }
    if (["an","auf","hinter","in","neben","über","unter","vor","zwischen"].includes(lemma)) {
      add("de.preposition.two-way", "GOVERNS", lemma + " can take accusative or dative depending on meaning");
    }
    if (["wegen","trotz","während","innerhalb","außerhalb"].includes(lemma)) {
      add("de.preposition.genitive", "GOVERNS", lemma + " commonly takes genitive in standard/formal usage", undefined, 0.9);
      add("de.case.genitive", "GOVERNS", lemma + " can govern genitive", undefined, 0.9);
    }
  }

  if (lexeme.partOfSpeech === "CONJUNCTION") {
    if (["weil","dass","ob","obwohl","wenn","als","bevor","nachdem","während","seitdem"].includes(lemma)) {
      add("de.conjunction.subordinate-verb-final", "TRIGGERS", lemma + " introduces verb-final subordinate clauses");
    }
    if (["und","aber","oder","denn","sondern"].includes(lemma)) {
      add("de.conjunction.coordinating", "TRIGGERS", lemma + " preserves main-clause word order");
    }
    if (lemma === "obwohl") add("de.conjunction.concession", "EXEMPLIFIES", "obwohl expresses concession");
  }

  if (lexeme.partOfSpeech === "ADJECTIVE") {
    add("de.adjective.declension", "COMMON_WITH", "Attributive use can reinforce adjective endings.", undefined, 0.65);
    add("de.comparison.comparative-superlative", "COMMON_WITH", "Adjectives can be practiced in comparative and superlative forms.", undefined, 0.65);
  }

  return links;
}

export function invalidGrammarConceptIds(
  proposals: ProposedGrammarLink[],
  validIds: ReadonlySet<string>,
) {
  return Array.from(
    new Set(
      proposals
        .map((item) => item.grammarConceptId)
        .filter((id) => !validIds.has(id)),
    ),
  );
}

export async function replaceLexemeGrammarLinks(
  lexemeId: string,
  proposals: ProposedGrammarLink[],
  source: LexemeGrammarLinkSource,
) {
  const unique = Array.from(
    new Map(
      proposals.map((proposal) => [
        proposal.grammarConceptId + ":" + (proposal.relationType ?? "EXEMPLIFIES"),
        proposal,
      ]),
    ).values(),
  );
  if (!unique.length) {
    if (source === "DETERMINISTIC") {
      await db.lexemeGrammarConcept.deleteMany({ where: { lexemeId, source } });
    }
    return [];
  }

  const validConcepts = await db.grammarConcept.findMany({
    where: {
      id: { in: unique.map((item) => item.grammarConceptId) },
      active: true,
      language: "de",
    },
    select: { id: true },
  });
  const validIds = new Set(validConcepts.map((item) => item.id));

  const invalidConceptIds = invalidGrammarConceptIds(unique, validIds);
  if (invalidConceptIds.length) {
    throw new Error(
      "Grammar link references unknown or inactive canonical concept(s): " +
        invalidConceptIds.join(", "),
    );
  }

  const patternIds = unique
    .map((item) => item.lexicalPatternId)
    .filter((value): value is string => Boolean(value));
  if (patternIds.length) {
    const validPatterns = await db.lexicalPattern.findMany({
      where: { id: { in: patternIds }, lexemeId },
      select: { id: true },
    });
    const validPatternIds = new Set(validPatterns.map((item) => item.id));
    if (patternIds.some((id) => !validPatternIds.has(id))) {
      throw new Error("Grammar link references a lexical pattern from another lexeme.");
    }
  }

  await db.$transaction(async (tx) => {
    if (source === "DETERMINISTIC") {
      await tx.lexemeGrammarConcept.deleteMany({ where: { lexemeId, source } });
    }
    for (const proposal of unique) {
      const relationType = proposal.relationType ?? LexemeGrammarRelationType.EXEMPLIFIES;
      const existing = await tx.lexemeGrammarConcept.findUnique({
        where: {
          lexemeId_grammarConceptId_relationType: {
            lexemeId,
            grammarConceptId: proposal.grammarConceptId,
            relationType,
          },
        },
        select: { source: true },
      });
      const precedence = { DETERMINISTIC: 0, AI: 1, MANUAL: 2 } as const;
      if (existing && precedence[existing.source] > precedence[source]) continue;

      await tx.lexemeGrammarConcept.upsert({
        where: {
          lexemeId_grammarConceptId_relationType: {
            lexemeId,
            grammarConceptId: proposal.grammarConceptId,
            relationType,
          },
        },
        create: {
          lexemeId,
          grammarConceptId: proposal.grammarConceptId,
          lexicalPatternId: proposal.lexicalPatternId ?? null,
          relationType,
          note: proposal.note ?? null,
          source,
          confidence: Math.min(1, Math.max(0, proposal.confidence ?? 1)),
        },
        update: {
          lexicalPatternId: proposal.lexicalPatternId ?? null,
          note: proposal.note ?? null,
          source,
          confidence: Math.min(1, Math.max(0, proposal.confidence ?? 1)),
        },
      });
    }
  });

  return db.lexemeGrammarConcept.findMany({
    where: { lexemeId },
    include: { grammarConcept: true, lexicalPattern: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function syncDeterministicGrammarLinksForLexeme(lexemeId: string) {
  const lexeme = await db.lexeme.findUnique({
    where: { id: lexemeId },
    select: {
      id: true,
      lemma: true,
      partOfSpeech: true,
      article: true,
      patterns: { select: { id: true, pattern: true, explanation: true } },
    },
  });
  if (!lexeme) throw new Error("Lexeme not found.");
  return replaceLexemeGrammarLinks(
    lexeme.id,
    inferDeterministicGrammarLinks(lexeme),
    LexemeGrammarLinkSource.DETERMINISTIC,
  );
}

/**
 * Boundary for future AI enrichment: callers may propose links, but this
 * function rejects any concept that is not already canonical and active.
 */
export async function applyAiGrammarLinks(
  lexemeId: string,
  proposals: ProposedGrammarLink[],
) {
  return replaceLexemeGrammarLinks(
    lexemeId,
    proposals.filter((item) => (item.confidence ?? 0) >= 0.7),
    LexemeGrammarLinkSource.AI,
  );
}
