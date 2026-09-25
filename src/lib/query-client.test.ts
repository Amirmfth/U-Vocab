import assert from "node:assert/strict";
import test from "node:test";
import { createQueryClient } from "./query-client";

test("query defaults avoid aggressive stable-data refetching", () => {
  const client = createQueryClient();
  const queries = client.getDefaultOptions().queries;

  assert.equal(queries?.refetchOnWindowFocus, false);
  assert.equal(queries?.retry, 1);
  assert.equal(queries?.staleTime, 60_000);
  assert.equal(queries?.gcTime, 10 * 60_000);
});
