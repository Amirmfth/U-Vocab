import assert from "node:assert/strict";
import test from "node:test";
import { conjugationTabs, verbConjugationSchema } from "./verb-conjugation";

const forms=["ich","du","er/sie/es","wir","ihr","sie/Sie"].map((person)=>({ person, form:person+" gehe" }));
const tense={ label:"Präsens", forms, note:null };
const fixture={
  lemma:"gehen",
  metadata:{ auxiliary:"sein",verbClass:"irregular",separable:false,reflexive:false,prefix:null,stemChange:null,usageNote:null },
  principalForms:{ infinitive:"gehen",zuInfinitive:"zu gehen",participleI:"gehend",participleII:"gegangen" },
  indicative:{ present:tense,preterite:tense,perfect:tense,pluperfect:tense,futureI:tense,futureII:tense },
  subjunctive:{ konjunktivIPresent:tense,konjunktivIPerfect:tense,konjunktivIIPreterite:tense,konjunktivIIPerfect:tense,wurde:tense },
  imperative:{ du:"geh!",ihr:"geht!",sie:"Gehen Sie!",note:null },
};

test("validates a complete six-person conjugation",()=>assert.equal(verbConjugationSchema.safeParse(fixture).success,true));
test("rejects incomplete person tables",()=>{
  const invalid=structuredClone(fixture);
  invalid.indicative.present.forms=invalid.indicative.present.forms.slice(0,5);
  assert.equal(verbConjugationSchema.safeParse(invalid).success,false);
});
test("produces stable reference tabs",()=>{
  const tabs=conjugationTabs(verbConjugationSchema.parse(fixture));
  assert.equal(tabs[0].id,"present");
  assert.equal(tabs.at(-1)?.id,"wurde");
});
