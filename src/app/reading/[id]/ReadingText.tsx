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
    <article className="panel generated-reading-text learning-content border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 max-width-reading-measure mx-auto padding-clamp-22px-4vw-40px text-uv-fe2022883cc line-height-1p8 in-p-p:margin-top-1p15em uv-max720:p-4.5 uv-max720:line-height-1p72 rounded-uv-r6d27d54c6c in-reading-target-word:inline in-reading-target-word:padding-0-2px in-reading-target-word:border-0 in-reading-target-word:rounded-uv-r5e0d704b33 in-reading-target-word:bg-color-mix-in-srgb-primary-22pct-transparent in-reading-target-word:text-uv-primary-strong in-reading-target-word:font-inherit in-reading-target-word:font-680 in-reading-target-word:line-height-inherit in-reading-target-word:cursor-pointer in-reading-target-word:box-decoration-break-clone in-reading-target-word-hover:bg-color-mix-in-srgb-primary-36pct-transparent in-reading-target-word-aria-expanded-true:bg-color-mix-in-srgb-primary-36pct-transparent" lang="de" dir="ltr">
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
              className="reading-word-popover fixed z-index-90 width-min-280px-calc-100vw-24px max-height-min-300px-calc-100dvh-24px overflow-auto grid gap-2.25 p-3.75 border-1px-solid-border-strong rounded-uv-rd65225386d bg-uv-surface-raised box-shadow-shadow text-uv-f9601fe81a7 line-height-1p4 in-p-2:m-0 in-p-2:overflow-wrap-anywhere in-text-link:mt-0.5 in-text-link:text-uv-fe9d5fd6635"
              ref={popoverRef}
              role="dialog"
              aria-label={t("reading.detail.meaningOf", { word: active.target.lemma })}
              style={{ top: active.top, insetInlineStart: active.inlineStart }}
            >
              <div className="reading-word-popover-head grid gap-0.75 in-strong-2:text-uv-text in-strong-2:text-uv-f19feeb881c in-small:text-uv-text-muted">
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
              <Link href={`/vocabulary/${active.target.id}`} className="text-link text-uv-primary-strong font-560 inline-flex items-center gap-1.5">{t("reading.detail.openWord")}</Link>
            </div>,
            document.body,
          )
        : null}
    </article>
  );
}
