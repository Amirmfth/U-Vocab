import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { promptVersionFor } from "./prompt-versions";

export function generationFingerprint(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

export async function getGenerationCache<T>(input: {
  operation: string;
  dimensions: unknown;
  source: unknown;
  schemaVersion: string;
}): Promise<T | null> {
  const promptVersion = promptVersionFor(input.operation);
  const cacheKey = generationFingerprint({
    operation: input.operation,
    dimensions: input.dimensions,
    promptVersion,
    schemaVersion: input.schemaVersion,
  });
  const sourceHash = generationFingerprint(input.source);

  const cached = await db.aiGenerationCache.findUnique({ where: { cacheKey } });
  if (!cached || cached.sourceHash !== sourceHash) return null;
  return cached.payload as T;
}

export async function putGenerationCache(input: {
  operation: string;
  dimensions: unknown;
  source: unknown;
  schemaVersion: string;
  payload: unknown;
}) {
  const promptVersion = promptVersionFor(input.operation);
  const cacheKey = generationFingerprint({
    operation: input.operation,
    dimensions: input.dimensions,
    promptVersion,
    schemaVersion: input.schemaVersion,
  });
  const sourceHash = generationFingerprint(input.source);

  await db.aiGenerationCache.upsert({
    where: { cacheKey },
    create: {
      cacheKey,
      operation: input.operation,
      promptVersion,
      schemaVersion: input.schemaVersion,
      sourceHash,
      payload: input.payload,
    },
    update: {
      promptVersion,
      schemaVersion: input.schemaVersion,
      sourceHash,
      payload: input.payload,
      updatedAt: new Date(),
    },
  });
}
