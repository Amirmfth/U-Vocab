import { revalidateTag } from "next/cache";

export const cacheTags = {
  home: (userId: string) => `home:${userId}`,
  vocabulary: (userId: string) => `vocabulary:${userId}`,
  word: (lexemeId: string) => `word:${lexemeId}`,
  review: (userId: string) => `review:${userId}`,
  progress: (userId: string) => `progress:${userId}`,
  mistakes: (userId: string) => `mistakes:${userId}`,
  usage: (userId: string) => `usage:${userId}`,
  recommendations: (userId: string) => `recommendations:${userId}`,
  topicPacks: (userId: string) => `topic-packs:${userId}`,
  reading: (userId: string) => `reading:${userId}`,
  writing: (userId: string) => `writing:${userId}`,
  conversation: (userId: string) => `conversation:${userId}`,
};

type UserDomain =
  | "home"
  | "vocabulary"
  | "review"
  | "progress"
  | "mistakes"
  | "usage"
  | "recommendations"
  | "topicPacks"
  | "reading"
  | "writing"
  | "conversation";

export function revalidateUserDomains(
  userId: string,
  domains: UserDomain[],
  wordIds: string[] = [],
) {
  const uniqueTags = new Set(
    domains.map((domain) => cacheTags[domain](userId)),
  );

  for (const wordId of wordIds) {
    if (wordId) uniqueTags.add(cacheTags.word(wordId));
  }

  for (const tag of uniqueTags) {
    revalidateTag(tag);
  }
}
