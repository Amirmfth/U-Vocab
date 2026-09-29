import { revalidateTag } from "next/cache";

export const cacheTags = {
  home: (courseId: string) => `home:${courseId}`,
  vocabulary: (courseId: string) => `vocabulary:${courseId}`,
  word: (courseId: string, lexemeId: string) => `word:${courseId}:${lexemeId}`,
  review: (courseId: string) => `review:${courseId}`,
  progress: (courseId: string) => `progress:${courseId}`,
  mistakes: (courseId: string) => `mistakes:${courseId}`,
  usage: (courseId: string) => `usage:${courseId}`,
  recommendations: (courseId: string) => `recommendations:${courseId}`,
  reading: (courseId: string) => `reading:${courseId}`,
  writing: (courseId: string) => `writing:${courseId}`,
  conversation: (courseId: string) => `conversation:${courseId}`,
};

type UserDomain =
  | "home"
  | "vocabulary"
  | "review"
  | "progress"
  | "mistakes"
  | "usage"
  | "recommendations"
  | "reading"
  | "writing"
  | "conversation";

export function revalidateUserDomains(
  _userId: string,
  userCourseId: string,
  domains: UserDomain[],
  wordIds: string[] = [],
) {
  const uniqueTags = new Set(
    domains.map((domain) => cacheTags[domain](userCourseId)),
  );

  for (const wordId of wordIds) {
    if (wordId) uniqueTags.add(cacheTags.word(userCourseId, wordId));
  }
  for (const tag of uniqueTags) revalidateTag(tag);
}
