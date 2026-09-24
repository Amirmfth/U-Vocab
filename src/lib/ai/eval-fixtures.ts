export const AI_QUALITY_FIXTURES = {
  lexicalAnalysis: [
    { level: "A2", input: "sich freuen auf", expect: ["reflexive", "auf", "Akkusativ"] },
    { level: "B2", input: "in Betracht ziehen", expect: ["phrase", "consider"] },
  ],
  practiceProduction: [
    {
      level: "B1",
      lemma: "teilnehmen",
      prompt: "Write a sentence with teilnehmen.",
      answer: "Ich nehme morgen an dem Kurs teil.",
      expectCorrect: true,
    },
    {
      level: "B2",
      lemma: "abhängen",
      prompt: "Write a sentence with abhängen.",
      answer: "Das hängt von das Wetter ab.",
      expectCorrect: false,
    },
  ],
  writing: [
    {
      level: "B1",
      task: "Write a short email explaining why you cannot attend a meeting.",
      draft:
        "Leider kann ich morgen nicht an der Besprechung teilnehmen, weil ich einen Arzttermin habe. Können wir einen neuen Termin vereinbaren?",
      expect: ["task completion", "natural vocabulary", "concise corrections"],
    },
    {
      level: "C1",
      task: "Argue for or against remote work.",
      draft:
        "Homeoffice bietet zwar mehr Flexibilität, dennoch hängt seine Wirksamkeit stark von der Unternehmenskultur und klaren Kommunikationsregeln ab.",
      expect: ["nuance", "collocation", "organization"],
    },
  ],
  reading: [
    {
      level: "B1",
      text:
        "Viele Berufstätige nehmen regelmäßig an Weiterbildungen teil. Dabei kommt es nicht nur auf Fachwissen an, sondern auch darauf, neue Kontakte zu knüpfen.",
      expectUnits: ["an Weiterbildungen teilnehmen", "auf etwas ankommen", "Kontakte knüpfen"],
    },
  ],
  conversationTargetUsage: [
    {
      level: "B1",
      target: "sich entscheiden für",
      message: "Ich habe mich für den Zug entschieden.",
      expectUsed: true,
      expectCorrect: true,
    },
    {
      level: "B1",
      target: "warten auf",
      message: "Ich warte seit einer Stunde für den Bus.",
      expectUsed: true,
      expectCorrect: false,
    },
  ],
} as const;
