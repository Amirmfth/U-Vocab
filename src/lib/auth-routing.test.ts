import assert from "node:assert/strict";
import test from "node:test";
import { isAuthPage, safeReturnTo } from "./auth-routing";

test("safeReturnTo accepts internal application paths", () => {
  assert.equal(safeReturnTo("/review?from=login#queue"), "/review?from=login#queue");
  assert.equal(safeReturnTo("/vocabulary"), "/vocabulary");
});

test("safeReturnTo rejects external, malformed, and auth-loop destinations", () => {
  assert.equal(safeReturnTo("https://evil.example"), "/");
  assert.equal(safeReturnTo("//evil.example/path"), "/");
  assert.equal(safeReturnTo("/\\evil.example"), "/");
  assert.equal(safeReturnTo("/login?returnTo=/review"), "/");
  assert.equal(safeReturnTo("/reset-password?token=secret"), "/");
});

test("auth pages are recognized without treating normal app routes as public auth", () => {
  assert.equal(isAuthPage("/signup"), true);
  assert.equal(isAuthPage("/forgot-password"), true);
  assert.equal(isAuthPage("/review"), false);
  assert.equal(isAuthPage("/api/auth/get-session"), false);
});
