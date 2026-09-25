import { z } from "zod";

export const conjugationPersonSchema = z.enum(["ich","du","er/sie/es","wir","ihr","sie/Sie"]);
export const conjugationFormSchema = z.object({
  person: conjugationPersonSchema,
  form: z.string().min(1),
});
export const conjugationTenseSchema = z.object({
  label: z.string().min(1),
  forms: z.array(conjugationFormSchema).length(6),
  note: z.string().nullable(),
});
export const verbConjugationSchema = z.object({
  lemma: z.string().min(1),
  metadata: z.object({
    auxiliary: z.enum(["haben","sein","haben/sein"]),
    verbClass: z.enum(["strong","weak","mixed","irregular"]),
    separable: z.boolean(),
    reflexive: z.boolean(),
    prefix: z.string().nullable(),
    stemChange: z.string().nullable(),
    usageNote: z.string().nullable(),
  }),
  principalForms: z.object({
    infinitive: z.string().min(1),
    zuInfinitive: z.string().min(1),
    participleI: z.string().min(1),
    participleII: z.string().min(1),
  }),
  indicative: z.object({
    present: conjugationTenseSchema,
    preterite: conjugationTenseSchema,
    perfect: conjugationTenseSchema,
    pluperfect: conjugationTenseSchema,
    futureI: conjugationTenseSchema,
    futureII: conjugationTenseSchema,
  }),
  subjunctive: z.object({
    konjunktivIPresent: conjugationTenseSchema,
    konjunktivIPerfect: conjugationTenseSchema,
    konjunktivIIPreterite: conjugationTenseSchema,
    konjunktivIIPerfect: conjugationTenseSchema,
    wurde: conjugationTenseSchema,
  }),
  imperative: z.object({
    du: z.string().min(1),
    ihr: z.string().min(1),
    sie: z.string().min(1),
    note: z.string().nullable(),
  }),
});
export type VerbConjugation = z.infer<typeof verbConjugationSchema>;

export function conjugationTabs(data: VerbConjugation) {
  return [
    { id:"present",label:"Present",german:"Präsens",tense:data.indicative.present },
    { id:"past",label:"Past",german:"Präteritum",tense:data.indicative.preterite },
    { id:"perfect",label:"Perfect",german:"Perfekt",tense:data.indicative.perfect },
    { id:"pluperfect",label:"Past perfect",german:"Plusquamperfekt",tense:data.indicative.pluperfect },
    { id:"future-i",label:"Future I",german:"Futur I",tense:data.indicative.futureI },
    { id:"future-ii",label:"Future II",german:"Futur II",tense:data.indicative.futureII },
    { id:"konjunktiv-i",label:"Konjunktiv I",german:"Konjunktiv I",tense:data.subjunctive.konjunktivIPresent },
    { id:"konjunktiv-i-perfect",label:"K I Perfect",german:"Konjunktiv I Perfekt",tense:data.subjunctive.konjunktivIPerfect },
    { id:"konjunktiv-ii",label:"Konjunktiv II",german:"Konjunktiv II",tense:data.subjunctive.konjunktivIIPreterite },
    { id:"konjunktiv-ii-perfect",label:"K II Perfect",german:"Konjunktiv II Vergangenheit",tense:data.subjunctive.konjunktivIIPerfect },
    { id:"wurde",label:"würde",german:"würde + Infinitiv",tense:data.subjunctive.wurde },
  ] as const;
}
