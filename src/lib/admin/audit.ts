import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const SENSITIVE_KEYS = new Set([
  "answer",
  "authorization",
  "content",
  "conversation",
  "cookie",
  "draft",
  "email",
  "message",
  "password",
  "prompt",
  "response",
  "secret",
  "session",
  "text",
  "token",
]);

function sanitizeAuditValue(value: unknown, depth = 0): Prisma.InputJsonValue {
  if (depth > 4) return "[truncated]";
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => sanitizeAuditValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, item] of Object.entries(input).slice(0, 60)) {
      const normalized = key.toLowerCase();
      if (
        SENSITIVE_KEYS.has(normalized) ||
        normalized.includes("password") ||
        normalized.includes("token") ||
        normalized.includes("secret") ||
        normalized.includes("cookie")
      ) {
        continue;
      }
      output[key] = sanitizeAuditValue(item, depth + 1);
    }
    return output;
  }
  if (typeof value === "string") return value.slice(0, 240);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value === undefined) return null;
  return String(value).slice(0, 240);
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): Prisma.InputJsonObject | undefined {
  if (!metadata) return undefined;
  return sanitizeAuditValue(metadata) as Prisma.InputJsonObject;
}

export async function appendAdminAudit(input: {
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return db.adminAuditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action.slice(0, 120),
      targetType: input.targetType.slice(0, 80),
      targetId: input.targetId.slice(0, 160),
      requestId: input.requestId?.slice(0, 160) ?? null,
      metadata: sanitizeAuditMetadata(input.metadata),
    },
  });
}
