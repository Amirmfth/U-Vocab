import assert from "node:assert/strict";
import test from "node:test";
import { routeOwner, sectionForPath } from "./navigation";

test("secondary Words routes map to Words", () => {
  assert.equal(sectionForPath("/compare"), "words");
  assert.equal(sectionForPath("/topic-packs/pack-1"), "words");
  assert.equal(sectionForPath("/recommendations"), "words");
  assert.equal(sectionForPath("/universe"), "words");
  assert.equal(sectionForPath("/vocabulary/lexeme-1/teach"), "words");
});

test("review maintenance routes map to Review", () => {
  assert.equal(sectionForPath("/mistakes"), "review");
  assert.equal(sectionForPath("/rescue?step=1"), "review");
  assert.equal(sectionForPath("/focus/session-1"), "review");
});

test("skill routes and battles map to Practice", () => {
  assert.equal(sectionForPath("/writing/session-1"), "practice");
  assert.equal(sectionForPath("/read/document-1"), "practice");
  assert.equal(sectionForPath("/stories/story-1"), "practice");
  assert.equal(sectionForPath("/conversation/session-1"), "practice");
  assert.equal(sectionForPath("/missions"), "practice");
  assert.equal(sectionForPath("/battles"), "practice");
});

test("progress belongs to Home while system routes have no learning owner", () => {
  assert.equal(sectionForPath("/progress"), "home");
  assert.equal(sectionForPath("/settings"), null);
  assert.equal(sectionForPath("/usage"), null);
});

test("routeOwner exposes skill context labels for breadcrumbs", () => {
  assert.deepEqual(routeOwner("/conversation/abc"), {
    prefix: "/conversation",
    section: "practice",
    label: "Conversation",
    group: "Speaking",
  });
  assert.equal(routeOwner("/stories/abc").group, "Reading");
});
