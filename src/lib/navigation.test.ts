import assert from "node:assert/strict";
import test from "node:test";
import { routeOwner, sectionForPath } from "./navigation";

test("root and secondary Words routes map to Words", () => {
  assert.equal(sectionForPath("/"), "words");
  assert.equal(sectionForPath("/vocabulary/lexeme-1/teach"), "words");
});

test("Grammar is a first-class learning section, including nested routes", () => {
  assert.equal(sectionForPath("/grammar"), "grammar");
  assert.equal(sectionForPath("/grammar/konjunktiv-ii"), "grammar");
});

test("review maintenance routes map to Review", () => {
  assert.equal(sectionForPath("/mistakes"), "review");
  assert.equal(sectionForPath("/rescue?step=1"), "review");
});

test("application-oriented skill routes and battles map to Practice", () => {
  assert.equal(sectionForPath("/practice?drill=1"), "practice");
  assert.equal(sectionForPath("/writing/session-1"), "practice");
  assert.equal(sectionForPath("/reading/session-1"), "practice");
  assert.equal(sectionForPath("/read/document-1"), "practice");
  assert.equal(sectionForPath("/stories/story-1"), "practice");
  assert.equal(sectionForPath("/conversation/session-1"), "practice");
  assert.equal(sectionForPath("/battles"), "practice");
});

test("Progress and system routes have no learning owner", () => {
  assert.equal(sectionForPath("/progress"), null);
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
