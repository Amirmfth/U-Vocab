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
  if (state === "KNOWN") return "reading-token known [display:inline] [padding:1px_2px] [margin:0_1px] [border:0] [border-bottom:1px_solid_transparent] [border-radius:4px] [background:transparent] [color:inherit] [cursor:pointer] [font:inherit] [line-height:inherit] [transition:background_140ms_ease,_color_140ms_ease,_border-color_140ms_ease] [&.known]:[color:var(--text-soft)] [&.known]:[border-bottom-color:rgba(180,_180,_191,_0.18)] [&.learning]:[color:#f5c77e] [&.learning]:[background:rgba(240,_179,_91,_0.08)] [&.learning]:[border-bottom-color:rgba(240,_179,_91,_0.28)] [&.unknown]:[color:var(--primary-strong)] [&.unknown]:[background:var(--primary-soft)] [&.unknown]:[border-bottom-color:rgba(167,_157,_255,_0.32)] [&:focus-visible]:[outline:2px_solid_var(--primary)] [&:focus-visible]:[outline-offset:2px]";
  if (state === "LEARNING") return "reading-token learning [display:inline] [padding:1px_2px] [margin:0_1px] [border:0] [border-bottom:1px_solid_transparent] [border-radius:4px] [background:transparent] [color:inherit] [cursor:pointer] [font:inherit] [line-height:inherit] [transition:background_140ms_ease,_color_140ms_ease,_border-color_140ms_ease] [&.known]:[color:var(--text-soft)] [&.known]:[border-bottom-color:rgba(180,_180,_191,_0.18)] [&.learning]:[color:#f5c77e] [&.learning]:[background:rgba(240,_179,_91,_0.08)] [&.learning]:[border-bottom-color:rgba(240,_179,_91,_0.28)] [&.unknown]:[color:var(--primary-strong)] [&.unknown]:[background:var(--primary-soft)] [&.unknown]:[border-bottom-color:rgba(167,_157,_255,_0.32)] [&:focus-visible]:[outline:2px_solid_var(--primary)] [&:focus-visible]:[outline-offset:2px]";
  return "reading-token unknown [display:inline] [padding:1px_2px] [margin:0_1px] [border:0] [border-bottom:1px_solid_transparent] [border-radius:4px] [background:transparent] [color:inherit] [cursor:pointer] [font:inherit] [line-height:inherit] [transition:background_140ms_ease,_color_140ms_ease,_border-color_140ms_ease] [&.known]:[color:var(--text-soft)] [&.known]:[border-bottom-color:rgba(180,_180,_191,_0.18)] [&.learning]:[color:#f5c77e] [&.learning]:[background:rgba(240,_179,_91,_0.08)] [&.learning]:[border-bottom-color:rgba(240,_179,_91,_0.28)] [&.unknown]:[color:var(--primary-strong)] [&.unknown]:[background:var(--primary-soft)] [&.unknown]:[border-bottom-color:rgba(167,_157,_255,_0.32)] [&:focus-visible]:[outline:2px_solid_var(--primary)] [&:focus-visible]:[outline-offset:2px]";
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
      <div className="word-meta flex flex-wrap gap-1.75 items-center">
        <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em">{selected.partOfSpeech}</span>
        <span className={"badge reading-state min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-exact-999px text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-exact-0p67rem letter-spacing-0p02em in-reading-state-known:text-uv-text-soft in-reading-state-learning:text-uv-cf9b86be2da in-reading-state-unknown:text-uv-primary-strong reading-state-" + selected.state.toLocaleLowerCase()}>
          {selected.state.toLocaleLowerCase()}
        </span>
      </div>

      <h2>
        {formatLexemeLabel(selected)}
      </h2>

      <div className="reading-meanings in-p-2:margin-5px-0 in-p-2:line-height-1p55">
        {selected.translations
          .filter((translation) => {
            if (translationPreference === "BOTH") return true;
            if (translationPreference === "PERSIAN") return translation.language === "fa";
            return translation.language === "en";
          })
          .map((translation) => (
            <p
              key={translation.language + translation.text}
              className={translation.language === "fa" ? "rtl direction-rtl text-right" : undefined}
            >
              {translation.text}
            </p>
          ))}
      </div>

      {selected.patterns.length ? (
        <div className="reading-detail-section in-p-2:margin-5px-0 in-p-2:line-height-1p55 pt-3 border-1px-solid-border-3">
          <span className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">PATTERN</span>
          {selected.patterns.map((pattern) => (
            <div key={pattern.pattern}>
              <strong>{pattern.pattern}</strong>
              {pattern.explanation ? <p className="muted text-uv-text-muted">{pattern.explanation}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {selected.collocations.length ? (
        <div className="reading-detail-section in-p-2:margin-5px-0 in-p-2:line-height-1p55 pt-3 border-1px-solid-border-3">
          <span className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">COLLOCATIONS</span>
          <div className="relation-list flex flex-wrap gap-2">
            {selected.collocations.map((collocation) => (
              <span className="relation-chip min-h-12 min-w-27.5 inline-flex flex-col justify-center gap-0.75 padding-8px-12px border-1px-solid-border-2 rounded-exact-14px bg-uv-surface-raised in-span:font-semibold in-small:text-uv-text-muted in-small:text-exact-0p66rem" key={collocation}>
                <span>{collocation}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {selected.examples[0] ? (
        <div className="reading-detail-section in-p-2:margin-5px-0 in-p-2:line-height-1p55 pt-3 border-1px-solid-border-3">
          <span className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">EXAMPLE</span>
          <p>{selected.examples[0].german}</p>
        </div>
      ) : null}

      {selected.state === "UNKNOWN" ? (
        <AddReadingLexemeForm documentId={documentId} lexemeId={selected.lexemeId} />
      ) : (
        <Link href={"/vocabulary/" + selected.lexemeId} className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target">
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
    <div className="reading-layout grid grid-template-columns-1fr gap-3.5 items-start uv-min760:grid-template-columns-minmax-0-1p7fr-minmax-250px-0p8fr uv-min760:gap-6">
      <article className="reading-text-panel min-w-0">
        <div className="reading-legend flex flex-wrap gap-3 mb-3 text-uv-text-muted text-exact-0p72rem in-span:inline-flex in-span:items-center in-span:gap-1.5">
          <span><i className="legend-dot known w-2 h-2 rounded-exact-999px inline-block in-known:bg-uv-ceb5d327b54 in-learning:bg-uv-warning in-unknown:bg-uv-primary-strong" /> known</span>
          <span><i className="legend-dot learning w-2 h-2 rounded-exact-999px inline-block in-known:bg-uv-ceb5d327b54 in-learning:bg-uv-warning in-unknown:bg-uv-primary-strong" /> learning</span>
          <span><i className="legend-dot unknown w-2 h-2 rounded-exact-999px inline-block in-known:bg-uv-ceb5d327b54 in-learning:bg-uv-warning in-unknown:bg-uv-primary-strong" /> unknown</span>
        </div>
        <div className="reading-text whitespace-pre-wrap text-uv-text-soft text-exact-clamp-1p05rem-3p8vw-1p22rem line-height-2">{rendered}</div>
      </article>

      {selected ? (
        <aside className="panel reading-detail reading-detail-desktop border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex-col gap-3.5 in-h2:m-0 in-h2:text-exact-1p35rem in-h2:letter-spacing-0p035em uv-min760:sticky uv-min760:top-7.5 uv-min760:flex rounded-exact-18px hidden uv-min940:flex uv-min940:sticky uv-min940:top-7 uv-min940:max-height-calc-100dvh-56px uv-min940:overflow-y-auto uv-min940:overscroll-contain">
          <ReadingDetail
            documentId={documentId}
            selected={selected}
            translationPreference={translationPreference}
          />
        </aside>
      ) : (
        <aside className="panel reading-detail reading-detail-desktop border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex-col gap-3.5 in-h2:m-0 in-h2:text-exact-1p35rem in-h2:letter-spacing-0p035em uv-min760:sticky uv-min760:top-7.5 uv-min760:flex rounded-exact-18px hidden uv-min940:flex uv-min940:sticky uv-min940:top-7 uv-min940:max-height-calc-100dvh-56px uv-min940:overflow-y-auto uv-min940:overscroll-contain">
          <Plus size={18} />
          <p className="muted text-uv-text-muted">Select highlighted vocabulary to inspect it.</p>
        </aside>
      )}

      <AnimatePresence>
        {selected && mobileOpen ? (
          <>
            <motion.button
              aria-label="Close word details"
              className="reading-detail-backdrop fixed z-index-69 inset-0 border-0 bg-uv-c53e6311db9 backdrop-filter-blur-2px uv-min940:hidden"
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
              className="panel reading-detail reading-detail-mobile border-1px-solid-border-2 flex flex-col gap-3.5 in-h2:m-0 in-h2:text-exact-1p35rem in-h2:letter-spacing-0p035em uv-min760:sticky uv-min760:top-7.5 uv-min760:hidden fixed z-index-70 inset-auto-10px-calc-82px-env-safe-area-inset-bottom-10px w-auto max-height-min-66dvh-620px overflow-y-auto overscroll-contain padding-10px-16px-18px border-uv-border-strong rounded-exact-22px bg-uv-surface box-shadow-0-24px-70px-rgb-0-0-0-0p5 uv-min940:hidden"
              exit={{ opacity: 0, y: 28 }}
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              key="reading-mobile-detail"
              role="dialog"
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
            >
              <div className="reading-sheet-handle w-9.5 h-1 margin-0-auto-7px rounded-exact-999px bg-uv-border-strong" aria-hidden="true" />
              <div className="reading-sheet-header flex items-center justify-between gap-3 min-h-11 mb-0.75 in-span-2:text-uv-text-muted in-span-2:text-exact-0p7rem in-span-2:font-650 in-span-2:letter-spacing-0p05em in-span-2:uppercase in-icon-button:w-10 in-icon-button:h-10 in-icon-button:min-h-10 in-icon-button:border-0 in-icon-button:bg-transparent">
                <span>Word details</span>
                <button
                  ref={closeButtonRef}
                  aria-label="Close word details"
                  className="icon-button w-11 h-11 grid place-items-center border-1px-solid-border-2 rounded-exact-13px bg-uv-surface text-uv-text-soft min-height-tap-target"
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
