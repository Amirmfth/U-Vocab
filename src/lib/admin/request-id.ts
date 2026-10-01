export function createAdminRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `admin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
