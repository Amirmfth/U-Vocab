"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpenCheck, Plus, X } from "lucide-react";
import { AddReadingLexemeForm } from "./AddReadingLexemeForm";
import { formatLexemeLabel } from "@/lib/lexeme-display";

type ReadingLexeme = {
  id: string;
  lexemeId: string;
  surfaceText: string;
  surfaceForms: string[];
  lemma: string;
  article: string | null;
  partOfSpeech: string;
  state: "KNOWN" | "LEARNING" | "UNKNOWN";
  translations: Array<{ language: string; text: string }>;
  patterns: Array<{ pattern: string; explanation: string | null }>;
  examples: Array<{ german: string; english: string | null; persian: string | null }>;
  collocations: string[];
};

function escapeRegex(value: string) {
  const special = "\\^$.*+?()[]{}|";
  return value
    .split("")
    .map((character) => (special.includes(character) ? "\\" + character : character))
    .join("");
}

function classForState(state: ReadingLexeme["state"]) {
  if (state === "KNOWN") return "reading-token known";
  if (state === "LEARNING") return "reading-token learning";
  return "reading-token unknown";
}

function ReadingDetail({
  documentId,
  selected,
  translationPreference,
}: {
  documentId: string;
  selected: ReadingLexeme;
  translationPreference: "ENGLISH" | "PERSIAN" | "BOTH";
}) {
  return (
    <>
      <div className="word-meta">
        <span className="badge">{selected.partOfSpeech}</span>
        <span className={"badge reading-state-" + selected.state.toLocaleLowerCase()}>
          {selected.state.toLocaleLowerCase()}
        </span>
      </div>

      <h2>
        {formatLexemeLabel(selected)}
      </h2>

      <div className="reading-meanings">
        {selected.translations
          .filter((translation) => {
            if (translationPreference === "BOTH") return true;
            if (translationPreference === "PERSIAN") return translation.language === "fa";
            return translation.language === "en";
          })
          .map((translation) => (
            <p
              key={translation.language + translation.text}
              className={translation.language === "fa" ? "rtl" : undefined}
            >
              {translation.text}
            </p>
          ))}
      </div>

      {selected.patterns.length ? (
        <div className="reading-detail-section">
          <span className="eyebrow">PATTERN</span>
          {selected.patterns.map((pattern) => (
            <div key={pattern.pattern}>
              <strong>{pattern.pattern}</strong>
              {pattern.explanation ? <p className="muted">{pattern.explanation}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {selected.collocations.length ? (
        <div className="reading-detail-section">
          <span className="eyebrow">COLLOCATIONS</span>
          <div className="relation-list">
            {selected.collocations.map((collocation) => (
              <span className="relation-chip" key={collocation}>
                <span>{collocation}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {selected.examples[0] ? (
        <div className="reading-detail-section">
          <span className="eyebrow">EXAMPLE</span>
          <p>{selected.examples[0].german}</p>
        </div>
      ) : null}

      {selected.state === "UNKNOWN" ? (
        <AddReadingLexemeForm documentId={documentId} lexemeId={selected.lexemeId} />
      ) : (
        <Link href={"/vocabulary/" + selected.lexemeId} className="button button-secondary">
          <BookOpenCheck size={17} />
          Open word
        </Link>
      )}
    </>
  );
}

export function ReadingViewer({
  documentId,
  content,
  items,
  translationPreference,
}: {
  documentId: string;
  content: string;
  items: ReadingLexeme[];
  translationPreference: "ENGLISH" | "PERSIAN" | "BOTH";
}) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const sheetRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }

      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [mobileOpen]);

  const rendered = useMemo(() => {
    const pairs = items.flatMap((item) =>
      Array.from(new Set([item.surfaceText, ...item.surfaceForms]))
        .filter(Boolean)
        .map((surface) => [
          surface.toLocaleLowerCase("de-DE"),
          item,
        ] as const),
    );

    const bySurface = new Map(
      pairs.sort((a, b) => b[0].length - a[0].length),
    );

    if (!bySurface.size) return [content];

    const regex = new RegExp(
      "(?<![\\p{L}\\p{N}])(" +
        Array.from(bySurface.keys())
          .map(escapeRegex)
          .join("|") +
        ")(?![\\p{L}\\p{N}])",
      "giu",
    );

    return content.split(regex).map((part, index) => {
      const item = bySurface.get(part.toLocaleLowerCase("de-DE"));
      if (!item) return part;

      return (
        <button
          className={classForState(item.state)}
          key={index}
          onClick={(event) => {
            setSelectedId(item.id);
            if (window.matchMedia("(max-width: 759px)").matches) {
              triggerRef.current = event.currentTarget;
              setMobileOpen(true);
            }
          }}
          type="button"
        >
          {part}
        </button>
      );
    });
  }, [content, items]);

  return (
    <div className="reading-layout">
      <article className="reading-text-panel">
        <div className="reading-legend">
          <span><i className="legend-dot known" /> known</span>
          <span><i className="legend-dot learning" /> learning</span>
          <span><i className="legend-dot unknown" /> unknown</span>
        </div>
        <div className="reading-text">{rendered}</div>
      </article>

      {selected ? (
        <aside className="panel reading-detail reading-detail-desktop">
          <ReadingDetail
            documentId={documentId}
            selected={selected}
            translationPreference={translationPreference}
          />
        </aside>
      ) : (
        <aside className="panel reading-detail reading-detail-desktop">
          <Plus size={18} />
          <p className="muted">Select highlighted vocabulary to inspect it.</p>
        </aside>
      )}

      <AnimatePresence>
        {selected && mobileOpen ? (
          <>
            <motion.button
              aria-label="Close word details"
              className="reading-detail-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
              type="button"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              ref={sheetRef}
              tabIndex={-1}
              animate={{ opacity: 1, y: 0 }}
              aria-label={`Details for ${selected.lemma}`}
              aria-modal="true"
              className="panel reading-detail reading-detail-mobile"
              exit={{ opacity: 0, y: 28 }}
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              key="reading-mobile-detail"
              role="dialog"
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
            >
              <div className="reading-sheet-handle" aria-hidden="true" />
              <div className="reading-sheet-header">
                <span>Word details</span>
                <button
                  ref={closeButtonRef}
                  aria-label="Close word details"
                  className="icon-button"
                  type="button"
                  onClick={() => setMobileOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <ReadingDetail
                documentId={documentId}
                selected={selected}
                translationPreference={translationPreference}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
