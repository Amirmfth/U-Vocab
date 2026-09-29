import assert from "node:assert/strict";
import test from "node:test";
import { createTranslator, translate } from "./core";
import {
  localeDocumentAttributes,
  uiLocaleFromDb,
  uiLocaleToDb,
} from "./config";
import {
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from "./format";
import { learningContentAttributes } from "./learning-content";

test("locale config maps persisted values and document direction", () => {
  assert.equal(uiLocaleFromDb("EN"), "en");
  assert.equal(uiLocaleFromDb("FA"), "fa");
  assert.equal(uiLocaleToDb("fa"), "FA");
  assert.deepEqual(localeDocumentAttributes("en"), { lang: "en", dir: "ltr" });
  assert.deepEqual(localeDocumentAttributes("fa"), { lang: "fa", dir: "rtl" });
});

test("typed translation lookup supports English and Persian", () => {
  assert.equal(translate("en", "nav.home"), "Home");
  assert.equal(translate("fa", "nav.home"), "خانه");
});

test("messages support parameters and plurals", () => {
  const english = createTranslator("en");
  const persian = createTranslator("fa");

  assert.equal(english("nav.reviewDue", { count: 3 }), "Review, 3 due");
  assert.equal(
    english.plural(
      { one: "format.minutesAgo.one", other: "format.minutesAgo.other" },
      2,
    ),
    "2 minutes ago",
  );
  assert.equal(
    persian.plural(
      { one: "format.minutesAgo.one", other: "format.minutesAgo.other" },
      2,
    ),
    "2 دقیقه پیش",
  );
});

test("locale-aware formatting uses the UI locale", () => {
  assert.equal(formatNumber("en", 1234).includes("1"), true);
  assert.notEqual(formatNumber("fa", 1234), formatNumber("en", 1234));
  assert.equal(formatPercent("en", 0.5), "50%");
  assert.equal(
    formatRelativeTime(
      "en",
      new Date("2026-09-29T10:00:00Z"),
      new Date("2026-09-29T10:02:00Z"),
    ),
    "2 minutes ago",
  );
});

test("mixed-direction learning content stays explicitly directed", () => {
  assert.deepEqual(learningContentAttributes("de"), {
    lang: "de",
    dir: "ltr",
    className: "learning-content",
  });
  assert.deepEqual(learningContentAttributes("fa"), {
    lang: "fa",
    dir: "rtl",
    className: "learning-content",
  });
});
