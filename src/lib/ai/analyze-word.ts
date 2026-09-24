import { AI_MODEL, getOpenAI } from "./client";
import { lexicalAnalysisSchema } from "./schemas";

export async function analyzeGermanLexeme(input:string){
 const prompt=`Analyze this German lexical unit for a vocabulary learner: ${input}. Return JSON only with lemma, partOfSpeech, article, gender, plural, englishMeanings, persianMeanings, patterns, examples. partOfSpeech must be NOUN, VERB, ADJECTIVE, ADVERB, PRONOUN, PREPOSITION, CONJUNCTION, PHRASE, or OTHER. Include natural English and Persian meanings and useful complete lexical patterns rather than treating the item as a flashcard.`;
 const response=await getOpenAI().responses.create({model:AI_MODEL,input:prompt});
 const raw=response.output_text;
 const parsed=JSON.parse(raw.replace(/^\`\`\`json\s*|\`\`\`$/g,"").trim());
 return lexicalAnalysisSchema.parse(parsed);
}
