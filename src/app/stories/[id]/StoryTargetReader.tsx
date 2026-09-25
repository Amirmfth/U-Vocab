"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck } from "lucide-react";
import { formatLexemeLabel } from "@/lib/lexeme-display";

type StoryTarget = {
  id: string;
  lexeme: {
    id: string;
    lemma: string;
    article: string | null;
    partOfSpeech: string;
    translations: Array<{ id: string; language: string; text: string }>;
  };
};

function escapeRegex(value: string) {
  const special = "\\^$.*+?()[]{}|";
  return value
    .split("")
    .map((character) => (special.includes(character) ? "\\" + character : character))
    .join("");
}

function afterScrollSettles(element: HTMLElement, callback: () => void) {
  let previousTop = element.getBoundingClientRect().top;
  let stableFrames = 0;
  const startedAt = performance.now();

  function check() {
    const top = element.getBoundingClientRect().top;
    stableFrames = Math.abs(top - previousTop) < 0.5 ? stableFrames + 1 : 0;
    previousTop = top;

    if (stableFrames >= 3 || performance.now() - startedAt > 900) {
      callback();
      return;
    }

    requestAnimationFrame(check);
  }

  requestAnimationFrame(check);
}

export function StoryTargetReader({
  content,
  targets,
  translationPreference,
}: {
  content: string;
  targets: StoryTarget[];
  translationPreference: "ENGLISH" | "PERSIAN" | "BOTH";
}) {
  const [selected, setSelected] = useState<StoryTarget | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    function closeDetail(event: PointerEvent) {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        (!target.closest(".story-word-popover") && !target.closest(".story-target"))
      ) {
        setAnchor(null);
      }
    }

    function closeOnScroll() {
      setAnchor(null);
    }

    document.addEventListener("pointerdown", closeDetail);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("pointerdown", closeDetail);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, []);

  const rendered = useMemo(() => {
    const sorted = [...targets].sort((a, b) => b.lexeme.lemma.length - a.lexeme.lemma.length);
    if (!sorted.length) return [content];

    const regex = new RegExp(
      "(?<![\\p{L}\\p{N}_])(" +
        sorted.map((target) => escapeRegex(target.lexeme.lemma)).join("|") +
        ")(?![\\p{L}\\p{N}_])",
      "giu",
    );
    const lookup = new Map(
      sorted.map((target) => [target.lexeme.lemma.toLocaleLowerCase("de-DE"), target]),
    );

    return content.split(regex).map((part, index) => {
      const target = lookup.get(part.toLocaleLowerCase("de-DE"));
      if (!target) return part;

      return (
        <button
          className="story-target"
          key={index}
          onClick={(event) => {
            const trigger = event.currentTarget;
            const panelHeight = Math.min(440, window.innerHeight - 32);
            const token = trigger.getBoundingClientRect();
            const desiredBottom = token.bottom + 8 + panelHeight;
            const overflow = desiredBottom - (window.innerHeight - 16);

            const positionDetail = () => {
              const nextToken = trigger.getBoundingClientRect();
              const panelWidth = Math.min(320, window.innerWidth - 32);
              const below = nextToken.bottom + 8;
              const reachedPageEnd =
                window.scrollY + window.innerHeight >=
                document.documentElement.scrollHeight - 2;
              const top =
                reachedPageEnd && below + panelHeight > window.innerHeight - 16
                  ? Math.max(16, nextToken.top - panelHeight - 8)
                  : below;

              setSelected(target);
              setAnchor({
                left: Math.min(Math.max(nextToken.left, 16), window.innerWidth - panelWidth - 16),
                top,
              });
            };

            if (overflow > 0) {
              window.scrollBy({ top: overflow, behavior: reduceMotion ? "auto" : "smooth" });
              afterScrollSettles(trigger, positionDetail);
            } else {
              positionDetail();
            }
          }}
          type="button"
        >
          {part}
        </button>
      );
    });
  }, [content, reduceMotion, targets]);

  const translations = selected?.lexeme.translations.filter((translation) => {
    if (translationPreference === "BOTH") return true;
    return translationPreference === "PERSIAN"
      ? translation.language === "fa"
      : translation.language === "en";
  });

  return (
    <>
      <div className="story-content">{rendered}</div>

      <AnimatePresence>
        {selected && anchor ? (
          <motion.aside
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-label={`Details for ${selected.lexeme.lemma}`}
            className="panel story-word-popover"
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98, y: -4 }}
            key="story-word-popover"
            style={{ left: anchor.left, top: anchor.top }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
          >
            <div className="word-meta">
              <span className="badge">{selected.lexeme.partOfSpeech}</span>
            </div>
            <h2>{formatLexemeLabel(selected.lexeme)}</h2>
            <div className="story-word-meanings">
              {translations?.map((translation) => (
                <p className={translation.language === "fa" ? "rtl" : undefined} key={translation.id}>
                  {translation.text}
                </p>
              ))}
            </div>
            <Link className="button button-secondary" href={"/vocabulary/" + selected.lexeme.id}>
              <BookOpenCheck size={17} />
              Open word
            </Link>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
