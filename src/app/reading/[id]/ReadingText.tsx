"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TranslationLanguage } from "@prisma/client";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { isTranslationVisible } from "@/lib/translations";
import { useTranslations } from "@/i18n/client";
import type { MessageKey } from "@/i18n/core";

const partOfSpeechKeys: Record<string, MessageKey> = {
  NOUN: "vocab.pos.noun",
  VERB: "vocab.pos.verb",
  ADJECTIVE: "vocab.pos.adjective",
  ADVERB: "vocab.pos.adverb",
  PRONOUN: "vocab.pos.pronoun",
  PREPOSITION: "vocab.pos.preposition",
  CONJUNCTION: "vocab.pos.conjunction",
  INTERJECTION: "vocab.pos.interjection",
  PHRASE: "vocab.pos.phrase",
  OTHER: "vocab.pos.other",
};

type Target = {
  id: string;
  lemma: string;
  article: string | null;
  partOfSpeech: string;
  cefrLevel: string | null;
  translations: { language: string; text: string }[];
};

function visibleMeanings(target: Target, preference: TranslationLanguage) {
  const preferred = target.translations.filter((translation) =>
    isTranslationVisible(preference, translation.language),
  );
  return preferred.length
    ? preferred
    : target.translations.filter((translation) => translation.language === "en" || translation.language === "fa").slice(0, 1);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function popoverPosition(button: HTMLButtonElement) {
  const rect = button.getBoundingClientRect();
  const width = 280;
  const isRtl = document.documentElement.dir === "rtl";
  const inlineStart = isRtl
    ? Math.max(12, Math.min(window.innerWidth - rect.right, window.innerWidth - width - 12))
    : Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
  return {
    top: rect.bottom + 170 <= window.innerHeight
      ? rect.bottom + 8
      : Math.max(8, rect.top - 170),
    inlineStart,
  };
}

export function ReadingText({
  content,
  targets,
  preference,
}: {
  content: string;
  targets: Target[];
  preference: TranslationLanguage;
}) {
  const [active, setActive] = useState<{ target: Target; occurrence: string; top: number; inlineStart: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations();

  const { pattern, byLemma } = useMemo(() => {
    const byLemma = new Map(targets.map((target) => [target.lemma.toLocaleLowerCase("de-DE"), target]));
    const alternatives = [...byLemma.keys()].sort((a, b) => b.length - a.length).map(escapeRegex);
    return {
      byLemma,
      pattern: alternatives.length
        ? new RegExp(`(?<![\\p{L}\\p{N}_])(${alternatives.join("|")})(?![\\p{L}\\p{N}_])`, "giu")
        : null,
    };
  }, [targets]);

  useEffect(() => {
    if (!active) return;
    const closeOnScroll = () => setActive(null);
    const closeOnPointer = (event: PointerEvent) => {
      const node = event.target as Node;
      if (!popoverRef.current?.contains(node) && !buttonRef.current?.contains(node)) setActive(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActive(null);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("scroll", closeOnScroll, true);
    document.addEventListener("pointerdown", closeOnPointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("scroll", closeOnScroll, true);
      document.removeEventListener("pointerdown", closeOnPointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [active]);

  return (
    <article className="panel generated-reading-text learning-content uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 uv-max-width-ff0948b971 mx-auto uv-padding-3adff930ea text-uv-fe2022883cc uv-line-height-93ec1d5b0e uv-v3696a6f5e9:uv-margin-top-03a660ae63 uv-max720:p-4.5 uv-max720:uv-line-height-3d827c0dc2 rounded-uv-r6d27d54c6c uv-v3aa23311a7:inline uv-v3aa23311a7:uv-padding-a03728e684 uv-v3aa23311a7:border-0 uv-v3aa23311a7:rounded-uv-r5e0d704b33 uv-v3aa23311a7:uv-background-19dd733243 uv-v3aa23311a7:text-uv-primary-strong uv-v3aa23311a7:uv-font-3e26d67509 uv-v3aa23311a7:uv-weight-680 uv-v3aa23311a7:uv-line-height-3e26d67509 uv-v3aa23311a7:cursor-pointer uv-v3aa23311a7:uv-box-decoration-break-5e0072329d uv-vf10a1b1a22:uv-background-53af3ed932 uv-vdd060a9ceb:uv-background-53af3ed932" lang="de" dir="ltr">
      {content.split(/\n{2,}/u).map((paragraph, paragraphIndex) => {
        if (!pattern) return <p key={paragraphIndex}>{paragraph}</p>;
        const pieces: React.ReactNode[] = [];
        let cursor = 0;
        for (const match of paragraph.matchAll(pattern)) {
          const index = match.index ?? 0;
          if (index > cursor) pieces.push(paragraph.slice(cursor, index));
          const target = byLemma.get(match[1].toLocaleLowerCase("de-DE"));
          if (target) {
            const occurrence = `${paragraphIndex}-${index}`;
            pieces.push(
              <button
                className="reading-target-word"
                key={occurrence}
                type="button"
                aria-label={t("reading.detail.showMeaning", { word: match[1] })}
                aria-expanded={active?.occurrence === occurrence}
                onClick={(event) => {
                  buttonRef.current = event.currentTarget;
                  setActive(active?.occurrence === occurrence ? null : {
                    target,
                    occurrence,
                    ...popoverPosition(event.currentTarget),
                  });
                }}
              >
                {match[1]}
              </button>,
            );
          } else {
            pieces.push(match[1]);
          }
          cursor = index + match[0].length;
        }
        pieces.push(paragraph.slice(cursor));
        return <p key={paragraphIndex}>{pieces}</p>;
      })}
      {active
        ? createPortal(
            <div
              className="reading-word-popover fixed uv-z-index-2d0c8af807 uv-width-a5dde6895c uv-max-height-ff42f1ab80 overflow-auto grid gap-2.25 p-3.75 uv-border-488f4b382f rounded-uv-rd65225386d bg-uv-surface-raised uv-box-shadow-4ee177db8b text-uv-f9601fe81a7 uv-line-height-a26f83404b uv-vb19eb067c9:m-0 uv-vb19eb067c9:uv-overflow-wrap-112c2a063a uv-vffc37e4c0f:mt-0.5 uv-vffc37e4c0f:text-uv-fe9d5fd6635"
              ref={popoverRef}
              role="dialog"
              aria-label={t("reading.detail.meaningOf", { word: active.target.lemma })}
              style={{ top: active.top, insetInlineStart: active.inlineStart }}
            >
              <div className="reading-word-popover-head grid gap-0.75 uv-veda02a0adb:text-uv-text uv-veda02a0adb:text-uv-f19feeb881c uv-v982220ddd5:text-uv-text-muted">
                <strong className="learning-content" lang="de" dir="ltr">{formatLexemeLabel(active.target)}</strong>
                <small>
                  {partOfSpeechKeys[active.target.partOfSpeech] ? t(partOfSpeechKeys[active.target.partOfSpeech]) : active.target.partOfSpeech.toLowerCase().replaceAll("_", " ")}
                  {active.target.cefrLevel ? ` · ${active.target.cefrLevel}` : ""}
                </small>
              </div>
              {visibleMeanings(active.target, preference)
                .map((translation, index) => (
                  <p className="learning-content" key={`${translation.language}-${index}`} dir={translation.language === "fa" ? "rtl" : "ltr"} lang={translation.language === "fa" ? "fa" : "en"}>
                    {translation.text}
                  </p>
                ))}
              <Link href={`/vocabulary/${active.target.id}`} className="text-link text-uv-primary-strong uv-weight-560 inline-flex items-center gap-1.5">{t("reading.detail.openWord")}</Link>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}
