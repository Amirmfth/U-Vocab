import type { ExerciseType, TranslationLanguage } from "@prisma/client";
import { db } from "@/lib/db";
import { buildReviewCard, type ReviewCardDefinition } from "@/lib/review-card";
import { repairImpossibleEasySchedules } from "@/lib/review-schedule-repair";

export type ReviewQueueCard={
  userVocabularyId:string;
  lexemeId:string;
  lemma:string;
  article:string|null;
  review:ReviewCardDefinition;
};

export type ReviewQueueData={
  cards:ReviewQueueCard[];
  dueCount:number;
};

export async function getReviewQueueData(input:{
  userId:string;
  preferredTranslation:TranslationLanguage;
  limit?:number;
  excludeIds?:string[];
}):Promise<ReviewQueueData>{
  const now=new Date();
  await repairImpossibleEasySchedules(input.userId,now);
  const where={
    userId:input.userId,
    id:{ notIn:input.excludeIds??[] },
    OR:[{ nextReviewAt:null },{ nextReviewAt:{ lte:now } }],
  };

  const [dueCount,items]=await Promise.all([
    db.userVocabulary.count({ where }),
    db.userVocabulary.findMany({
      where,
      include:{
        lexeme:{
          include:{
            translations:true,
            patterns:true,
            examples:true,
            mistakes:{
              where:{ userId:input.userId,resolvedAt:null },
              select:{ type:true },
            },
          },
        },
        attempts:{
          orderBy:{ createdAt:"desc" },
          take:3,
          select:{ exerciseType:true },
        },
      },
      orderBy:[{ nextReviewAt:"asc" },{ addedAt:"asc" }],
      take:input.limit??6,
    }),
  ]);

  return {
    dueCount,
    cards:items.map((item)=>{
      const recentTypes=item.attempts.map((attempt)=>attempt.exerciseType as ExerciseType);
      return {
        userVocabularyId:item.id,
        lexemeId:item.lexemeId,
        lemma:item.lexeme.lemma,
        article:item.lexeme.article,
        review:buildReviewCard({
          lexeme:item.lexeme,
          preference:input.preferredTranslation,
          snapshot:{
            recognition:item.recognition,
            meaningRecall:item.meaningRecall,
            production:item.production,
            contextualUsage:item.contextualUsage,
            mistakeTypes:item.lexeme.mistakes.map((mistake)=>mistake.type),
          },
          recentTypes,
        }),
      };
    }),
  };
}
