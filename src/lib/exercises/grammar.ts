import type {
  ExerciseType,
  GrammarEvidenceDimension,
  MistakeType,
} from "@prisma/client";
import type { ExerciseDefinition } from "./types";

export type GrammarLinkedLexeme = {
  id: string;
  lemma: string;
  article: string | null;
  pattern: string | null;
};

export type GrammarExerciseVariant = {
  key: string;
  type: ExerciseType;
  dimension: GrammarEvidenceDimension;
  mistakeType: MistakeType;
};

type Template = GrammarExerciseVariant & {
  build: (lexeme?: GrammarLinkedLexeme | null) => ExerciseDefinition | null;
};

function choice(
  variant: GrammarExerciseVariant,
  prompt: string,
  expected: string,
  options: string[],
): ExerciseDefinition {
  return {
    type: variant.type,
    prompt,
    expected,
    options,
    interaction: "choice",
    skill: "grammar",
    requiresAI: false,
  };
}

function text(
  variant: GrammarExerciseVariant,
  prompt: string,
  expected: string,
): ExerciseDefinition {
  return {
    type: variant.type,
    prompt,
    expected,
    interaction: "short_text",
    skill: "grammar",
    requiresAI: false,
  };
}

const templates: Record<string, Template[]> = {
  "de.case.dative": [
    {
      key: "mit-case",
      type: "GRAMMAR_CHOICE",
      dimension: "UNDERSTANDING",
      mistakeType: "CASE",
      build: () => choice(
        { key:"mit-case",type:"GRAMMAR_CHOICE",dimension:"UNDERSTANDING",mistakeType:"CASE" },
        "Which case does “mit” require?",
        "Dativ",
        ["Nominativ", "Akkusativ", "Dativ", "Genitiv"],
      ),
    },
    {
      key: "mit-friend",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "CASE",
      build: () => text(
        { key:"mit-friend",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"CASE" },
        "Complete the phrase: mit ___ Freund (mein)",
        "meinem",
      ),
    },
  ],
  "de.case.accusative": [
    {
      key: "fuer-case",
      type: "GRAMMAR_CHOICE",
      dimension: "UNDERSTANDING",
      mistakeType: "CASE",
      build: () => choice(
        { key:"fuer-case",type:"GRAMMAR_CHOICE",dimension:"UNDERSTANDING",mistakeType:"CASE" },
        "Which case does “für” require?",
        "Akkusativ",
        ["Nominativ", "Akkusativ", "Dativ", "Genitiv"],
      ),
    },
  ],
  "de.article.definite": [
    {
      key: "linked-noun-article",
      type: "GRAMMAR_CHOICE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "ARTICLE",
      build: (lexeme) => lexeme?.article
        ? choice(
            { key:"linked-noun-article",type:"GRAMMAR_CHOICE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"ARTICLE" },
            "Choose the definite article for “" + lexeme.lemma + "”.",
            lexeme.article,
            ["der", "die", "das"],
          )
        : null,
    },
  ],
  "de.preposition.dative": [
    {
      key: "dative-preposition",
      type: "GRAMMAR_CHOICE",
      dimension: "UNDERSTANDING",
      mistakeType: "PREPOSITION",
      build: () => choice(
        { key:"dative-preposition",type:"GRAMMAR_CHOICE",dimension:"UNDERSTANDING",mistakeType:"PREPOSITION" },
        "Which phrase uses the required case after “mit”?",
        "mit dem Zug",
        ["mit den Zug", "mit dem Zug", "mit der Zug"],
      ),
    },
  ],
  "de.preposition.accusative": [
    {
      key: "acc-preposition",
      type: "GRAMMAR_CHOICE",
      dimension: "UNDERSTANDING",
      mistakeType: "PREPOSITION",
      build: () => choice(
        { key:"acc-preposition",type:"GRAMMAR_CHOICE",dimension:"UNDERSTANDING",mistakeType:"PREPOSITION" },
        "Which phrase is correct after “für”?",
        "für den Termin",
        ["für dem Termin", "für den Termin", "für der Termin"],
      ),
    },
  ],
  "de.preposition.two-way": [
    {
      key: "location-dative",
      type: "GRAMMAR_CHOICE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "CASE",
      build: () => choice(
        { key:"location-dative",type:"GRAMMAR_CHOICE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"CASE" },
        "Complete the location sentence: Ich bin in ___ Küche.",
        "der",
        ["die", "der", "den"],
      ),
    },
    {
      key: "destination-acc",
      type: "GRAMMAR_CHOICE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "CASE",
      build: () => choice(
        { key:"destination-acc",type:"GRAMMAR_CHOICE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"CASE" },
        "Complete the destination sentence: Ich gehe in ___ Küche.",
        "die",
        ["die", "der", "den"],
      ),
    },
  ],
  "de.preposition.prepositional-verbs": [
    {
      key: "linked-pattern",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "PREPOSITION",
      build: (lexeme) => lexeme?.pattern
        ? text(
            { key:"linked-pattern",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"PREPOSITION" },
            "Write the stored verb pattern for “" + lexeme.lemma + "”.",
            lexeme.pattern,
          )
        : null,
    },
  ],
  "de.pronoun.accusative-dative": [
    {
      key: "helfen-mir",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "PRONOUN",
      build: () => text(
        { key:"helfen-mir",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"PRONOUN" },
        "Complete: Er hilft ___. (ich)",
        "mir",
      ),
    },
  ],
  "de.verb.reflexive": [
    {
      key: "interessieren-mich",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "REFLEXIVE",
      build: () => text(
        { key:"interessieren-mich",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"REFLEXIVE" },
        "Complete: Ich interessiere ___ für Musik.",
        "mich",
      ),
    },
  ],
  "de.tense.perfekt": [
    {
      key: "haben-perfekt",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "TENSE",
      build: () => text(
        { key:"haben-perfekt",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"TENSE" },
        "Complete the Perfekt sentence: Ich ___ gestern gearbeitet.",
        "habe",
      ),
    },
  ],
  "de.tense.future": [
    {
      key: "werden-future",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "TENSE",
      build: () => text(
        { key:"werden-future",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"TENSE" },
        "Complete: Ich ___ morgen anrufen.",
        "werde",
      ),
    },
  ],
  "de.adjective.endings-basic": [
    {
      key: "ein-gutes-buch",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "ADJECTIVE_ENDING",
      build: () => text(
        { key:"ein-gutes-buch",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"ADJECTIVE_ENDING" },
        "Complete the adjective: ein ___ Buch (gut)",
        "gutes",
      ),
    },
  ],
  "de.adjective.declension": [
    {
      key: "mit-gutem-freund",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "ADJECTIVE_ENDING",
      build: () => text(
        { key:"mit-gutem-freund",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"ADJECTIVE_ENDING" },
        "Complete: mit einem ___ Freund (gut)",
        "guten",
      ),
    },
  ],
  "de.conjunction.subordinate-verb-final": [
    {
      key: "weil-order",
      type: "GRAMMAR_REORDER",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "VERB_POSITION",
      build: () => text(
        { key:"weil-order",type:"GRAMMAR_REORDER",dimension:"CONTROLLED_PRODUCTION",mistakeType:"VERB_POSITION" },
        "Put the subordinate clause in the correct order: weil / ich / heute / keine Zeit / habe",
        "weil ich heute keine Zeit habe",
      ),
    },
    {
      key: "correct-weil",
      type: "GRAMMAR_CORRECTION",
      dimension: "UNDERSTANDING",
      mistakeType: "VERB_POSITION",
      build: () => choice(
        { key:"correct-weil",type:"GRAMMAR_CORRECTION",dimension:"UNDERSTANDING",mistakeType:"VERB_POSITION" },
        "Which sentence has correct subordinate-clause word order?",
        "Ich bleibe zu Hause, weil ich krank bin.",
        [
          "Ich bleibe zu Hause, weil ich krank bin.",
          "Ich bleibe zu Hause, weil ich bin krank.",
          "Ich bleibe zu Hause, weil bin ich krank.",
        ],
      ),
    },
  ],
  "de.relative.basic": [
    {
      key: "relative-der",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "RELATIVE_CLAUSE",
      build: () => text(
        { key:"relative-der",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"RELATIVE_CLAUSE" },
        "Complete: Das ist der Mann, ___ hier arbeitet.",
        "der",
      ),
    },
  ],
  "de.passive.present": [
    {
      key: "wird-gebaut",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "PASSIVE",
      build: () => text(
        { key:"wird-gebaut",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"PASSIVE" },
        "Complete the process passive: Das Haus ___ gebaut.",
        "wird",
      ),
    },
  ],
  "de.subjunctive.konjunktiv-ii-hypothetical": [
    {
      key: "haette-time",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "SUBJUNCTIVE",
      build: () => text(
        { key:"haette-time",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"SUBJUNCTIVE" },
        "Complete: Wenn ich mehr Zeit ___, würde ich mehr lesen.",
        "hätte",
      ),
    },
  ],
  "de.negation.nicht-kein": [
    {
      key: "kein-auto",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "WORD_CHOICE",
      build: () => text(
        { key:"kein-auto",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"WORD_CHOICE" },
        "Complete: Ich habe ___ Auto.",
        "kein",
      ),
    },
  ],
  "fr.article.definite": [
    {
      key: "fr-definite-article",
      type: "GRAMMAR_CHOICE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "ARTICLE",
      build: (lexeme) => lexeme?.article
        ? choice(
            { key:"fr-definite-article",type:"GRAMMAR_CHOICE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"ARTICLE" },
            "Choose the definite article for “" + lexeme.lemma + "”.",
            lexeme.article,
            ["le", "la", "l'", "les"],
          )
        : choice(
            { key:"fr-definite-article",type:"GRAMMAR_CHOICE",dimension:"UNDERSTANDING",mistakeType:"ARTICLE" },
            "Choose the correct definite article: ___ maison",
            "la",
            ["le", "la", "les"],
          ),
    },
  ],
  "fr.negation.ne-pas": [
    {
      key: "fr-ne-pas",
      type: "GRAMMAR_REORDER",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "WORD_ORDER",
      build: () => text(
        { key:"fr-ne-pas",type:"GRAMMAR_REORDER",dimension:"CONTROLLED_PRODUCTION",mistakeType:"WORD_ORDER" },
        "Put the words in order: ne / je / comprends / pas",
        "je ne comprends pas",
      ),
    },
  ],
  "fr.pronoun.direct-object": [
    {
      key: "fr-le-before-verb",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "PRONOUN",
      build: () => text(
        { key:"fr-le-before-verb",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"PRONOUN" },
        "Replace “le livre”: Je ___ lis.",
        "le",
      ),
    },
  ],
  "fr.pronoun.y-en": [
    {
      key: "fr-y-place",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "PRONOUN",
      build: () => text(
        { key:"fr-y-place",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"PRONOUN" },
        "Replace “à Paris”: J'___ vais demain.",
        "y",
      ),
    },
    {
      key: "fr-en-quantity",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "PRONOUN",
      build: () => text(
        { key:"fr-en-quantity",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"PRONOUN" },
        "Replace the repeated noun phrase: Tu veux des pommes ? Oui, j'___ veux deux.",
        "en",
      ),
    },
  ],
  "fr.tense.passe-compose": [
    {
      key: "fr-passe-compose-avoir",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "TENSE",
      build: () => text(
        { key:"fr-passe-compose-avoir",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"TENSE" },
        "Complete: J'___ travaillé hier.",
        "ai",
      ),
    },
  ],
  "fr.tense.imparfait": [
    {
      key: "fr-imparfait-etre",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "TENSE",
      build: () => text(
        { key:"fr-imparfait-etre",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"TENSE" },
        "Complete: Quand j'___ petit, je jouais dehors.",
        "étais",
      ),
    },
  ],
  "fr.tense.past-contrast": [
    {
      key: "fr-past-contrast",
      type: "GRAMMAR_CHOICE",
      dimension: "UNDERSTANDING",
      mistakeType: "TENSE",
      build: () => choice(
        { key:"fr-past-contrast",type:"GRAMMAR_CHOICE",dimension:"UNDERSTANDING",mistakeType:"TENSE" },
        "Choose the natural pair for background + completed event:",
        "Il pleuvait quand je suis sorti.",
        [
          "Il pleuvait quand je suis sorti.",
          "Il a plu quand je sortais.",
          "Il pleuvait quand je sortais.",
        ],
      ),
    },
  ],
  "fr.pronoun.relative-basic": [
    {
      key: "fr-qui-subject",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "RELATIVE_CLAUSE",
      build: () => text(
        { key:"fr-qui-subject",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"RELATIVE_CLAUSE" },
        "Complete: C'est la femme ___ parle.",
        "qui",
      ),
    },
    {
      key: "fr-que-object",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "RELATIVE_CLAUSE",
      build: () => text(
        { key:"fr-que-object",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"RELATIVE_CLAUSE" },
        "Complete: C'est le livre ___ je lis.",
        "que",
      ),
    },
  ],
  "fr.subjunctive.present": [
    {
      key: "fr-il-faut-subj",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "SUBJUNCTIVE",
      build: () => text(
        { key:"fr-il-faut-subj",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"SUBJUNCTIVE" },
        "Complete: Il faut que tu ___ demain. (venir)",
        "viennes",
      ),
    },
  ],
  "fr.conjunction.si-clauses": [
    {
      key: "fr-si-imparfait-cond",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "TENSE",
      build: () => text(
        { key:"fr-si-imparfait-cond",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"TENSE" },
        "Complete: Si j'avais le temps, je ___ plus. (voyager)",
        "voyagerais",
      ),
    },
  ],
  "fr.passive.basic": [
    {
      key: "fr-passive-etre",
      type: "GRAMMAR_CLOZE",
      dimension: "CONTROLLED_PRODUCTION",
      mistakeType: "PASSIVE",
      build: () => text(
        { key:"fr-passive-etre",type:"GRAMMAR_CLOZE",dimension:"CONTROLLED_PRODUCTION",mistakeType:"PASSIVE" },
        "Complete: Le projet ___ financé par la ville.",
        "est",
      ),
    },
  ]
};

export function grammarExerciseVariants(
  grammarConceptId: string,
  linkedLexeme?: GrammarLinkedLexeme | null,
): GrammarExerciseVariant[] {
  return (templates[grammarConceptId] ?? [])
    .filter((template) => Boolean(template.build(linkedLexeme)))
    .map(({ key, type, dimension, mistakeType }) => ({
      key,
      type,
      dimension,
      mistakeType,
    }));
}

export function buildGrammarExercise(
  grammarConceptId: string,
  variantKey: string,
  linkedLexeme?: GrammarLinkedLexeme | null,
): ExerciseDefinition | null {
  const template = (templates[grammarConceptId] ?? []).find(
    (item) => item.key === variantKey,
  );
  return template?.build(linkedLexeme) ?? null;
}

export function grammarMistakeType(
  grammarConceptId: string,
  variantKey: string,
): MistakeType {
  return (templates[grammarConceptId] ?? []).find(
    (item) => item.key === variantKey,
  )?.mistakeType ?? "OTHER";
}

export function grammarEvidenceDimension(
  grammarConceptId: string,
  variantKey: string,
): GrammarEvidenceDimension {
  return (templates[grammarConceptId] ?? []).find(
    (item) => item.key === variantKey,
  )?.dimension ?? "UNDERSTANDING";
}

export function supportedGrammarConceptIds() {
  return Object.keys(templates);
}
