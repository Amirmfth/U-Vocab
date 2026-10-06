import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { promptVersionFor } from "../prompt-versions";

export function decisionFingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function getDecisionCache<T>(input: {
  userCourseId: string;
  operation: string;
  model: string;
  dimensions: unknown;
  source: unknown;
}): Promise<T | null> {
  const promptVersion = promptVersionFor(input.operation);
  const cacheKey = decisionFingerprint({
    userCourseId: input.userCourseId,
    operation: input.operation,
    model: input.model,
    promptVersion,
    dimensions: input.dimensions,
  });
  const sourceHash = decisionFingerprint(input.source);
  const cached = await db.aiDecisionCache.findUnique({ where: { cacheKey } });
  if (
    !cached ||
    cached.expiresAt <= new Date() ||
    cached.sourceHash !== sourceHash ||
    cached.model !== input.model ||
    cached.promptVersion !== promptVersion
  ) {
    return null;
  }
  return cached.payload as T;
}

export async function putDecisionCache(input: {
  userCourseId: string;
  operation: string;
  model: string;
  dimensions: unknown;
  source: unknown;
  payload: unknown;
  ttlSeconds: number;
}) {
  const promptVersion = promptVersionFor(input.operation);
  const cacheKey = decisionFingerprint({
    userCourseId: input.userCourseId,
    operation: input.operation,
    model: input.model,
    promptVersion,
    dimensions: input.dimensions,
  });
  const sourceHash = decisionFingerprint(input.source);
  const expiresAt = new Date(Date.now() + Math.max(60, input.ttlSeconds) * 1000);

  await db.aiDecisionCache.upsert({
    where: { cacheKey },
    create: {
      userCourseId: input.userCourseId,
      operation: input.operation,
      cacheKey,
      promptVersion,
      model: input.model,
      sourceHash,
      payload: input.payload as Prisma.InputJsonValue,
      expiresAt,
    },
    update: {
      promptVersion,
      model: input.model,
      sourceHash,
      payload: input.payload as Prisma.InputJsonValue,
      expiresAt,
      updatedAt: new Date(),
    },
  });
}
