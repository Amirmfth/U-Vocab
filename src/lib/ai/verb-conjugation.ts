import { zodTextFormat } from "openai/helpers/zod";
import { db } from "@/lib/db";
import { startOperation } from "@/lib/performance";
import { verbConjugationSchema, type VerbConjugation } from "@/lib/verb-conjugation";
import { getOpenAI } from "./client";
import { getGenerationCache, putGenerationCache } from "./generation-cache";
import { aiRoute } from "./routing";
import { createAIUsageRecorder } from "./usage-recorder";

const OPERATION = "verb_conjugation";
const SCHEMA_VERSION = "v1";

export type VerbConjugationResult =
  | { status:"not_found" }
  | { status:"not_verb" }
  | { status:"ok"; cache:"hit"|"miss"; data:VerbConjugation };

export async function getVerbConjugationForUser(input:{ userId:string; lexemeId:string }):Promise<VerbConjugationResult> {
  const lexeme = await db.lexeme.findFirst({
    where:{ id:input.lexemeId, userStates:{ some:{ userId:input.userId } } },
    include:{ patterns:true, examples:{ take:4 } },
  });
  if (!lexeme) return { status:"not_found" };
  if (lexeme.partOfSpeech !== "VERB") return { status:"not_verb" };

  const source = {
    lemma:lexeme.lemma,
    partOfSpeech:lexeme.partOfSpeech,
    notes:lexeme.notes,
    patterns:lexeme.patterns.map((p)=>({ pattern:p.pattern, explanation:p.explanation })),
    examples:lexeme.examples.map((e)=>e.german),
  };
  const cacheInput = {
    operation:OPERATION,
    dimensions:{ lexemeId:lexeme.id },
    source,
    schemaVersion:SCHEMA_VERSION,
  };

  const cached = verbConjugationSchema.safeParse(await getGenerationCache<unknown>(cacheInput));
  if (cached.success) return { status:"ok", cache:"hit", data:cached.data };

  const route=aiRoute(OPERATION);
  const perf=startOperation("ai.verb_conjugation",{ model:route.model });
  const usage=createAIUsageRecorder({
    userId:input.userId,
    operation:OPERATION,
    model:route.model,
    metadata:{ lexemeId:lexeme.id, lemma:lexeme.lemma },
  });

  try {
    const response=await perf.span("provider",()=>getOpenAI().responses.parse({
      model:route.model,
      max_output_tokens:route.maxOutputTokens,
      input:[
        { role:"system", content:"You are a precise German morphology reference. Return the complete conjugation paradigm using the schema exactly. Every person-based tense must contain ich, du, er/sie/es, wir, ihr, sie/Sie in that order. Compound tenses must contain the complete auxiliary + participle phrase. Preserve separable prefixes and reflexive pronouns. Return grammatical forms even if uncommon and use note fields for usage caveats. The würde table is the conventional würde + infinitive alternative. Do not add prose outside the schema." },
        { role:"user", content:JSON.stringify(source) },
      ],
      text:{ format:zodTextFormat(verbConjugationSchema,"verb_conjugation") },
    }));
    if (!response.output_parsed) throw new Error("OpenAI did not return a valid verb conjugation.");
    const data=verbConjugationSchema.parse(response.output_parsed);
    await Promise.all([
      usage.success(response),
      putGenerationCache({ ...cacheInput, payload:data }),
    ]);
    perf.success({ requestId:response.id, inputTokens:response.usage?.input_tokens??0, outputTokens:response.usage?.output_tokens??0 });
    return { status:"ok", cache:"miss", data };
  } catch (error) {
    perf.fail(error);
    await usage.failure(error);
    throw error;
  }
}
