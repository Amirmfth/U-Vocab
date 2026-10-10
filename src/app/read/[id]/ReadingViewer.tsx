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
        <span className="badge min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6">{selected.partOfSpeech}</span>
        <span className={"badge reading-state min-h-6.5 inline-flex items-center uv-padding-16c4636e97 uv-border-8d7f82f403 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised uv-font-family-320794573f text-uv-fe22288a701 uv-letter-spacing-6a477777e6 uv-v40eaf30c5d:text-uv-text-soft uv-v3bc17d51bf:text-uv-cf9b86be2da uv-vf290eea127:text-uv-primary-strong reading-state-" + selected.state.toLocaleLowerCase()}>
          {selected.state.toLocaleLowerCase()}
        </span>
      </div>

      <h2>
        {formatLexemeLabel(selected)}
      </h2>

      <div className="reading-meanings uv-vb19eb067c9:uv-margin-397bb87e55 uv-vb19eb067c9:uv-line-height-05c248da4c">
        {selected.translations
          .filter((translation) => {
            if (translationPreference === "BOTH") return true;
            if (translationPreference === "PERSIAN") return translation.language === "fa";
            return translation.language === "en";
          })
          .map((translation) => (
            <p
              key={translation.language + translation.text}
              className={translation.language === "fa" ? "rtl uv-direction-dbc9052979 text-right" : undefined}
            >
              {translation.text}
            </p>
          ))}
      </div>

      {selected.patterns.length ? (
        <div className="reading-detail-section uv-vb19eb067c9:uv-margin-397bb87e55 uv-vb19eb067c9:uv-line-height-05c248da4c pt-3 uv-border-top-8d7f82f403">
          <span className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">PATTERN</span>
          {selected.patterns.map((pattern) => (
            <div key={pattern.pattern}>
              <strong>{pattern.pattern}</strong>
              {pattern.explanation ? <p className="muted text-uv-text-muted">{pattern.explanation}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {selected.collocations.length ? (
        <div className="reading-detail-section uv-vb19eb067c9:uv-margin-397bb87e55 uv-vb19eb067c9:uv-line-height-05c248da4c pt-3 uv-border-top-8d7f82f403">
          <span className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">COLLOCATIONS</span>
          <div className="relation-list flex flex-wrap gap-2">
            {selected.collocations.map((collocation) => (
              <span className="relation-chip min-h-12 min-w-27.5 inline-flex flex-col justify-center gap-0.75 uv-padding-e4accf4b2b uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface-raised uv-v36c0309a03:font-semibold uv-v982220ddd5:text-uv-text-muted uv-v982220ddd5:text-uv-ff7862da171" key={collocation}>
                <span>{collocation}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {selected.examples[0] ? (
        <div className="reading-detail-section uv-vb19eb067c9:uv-margin-397bb87e55 uv-vb19eb067c9:uv-line-height-05c248da4c pt-3 uv-border-top-8d7f82f403">
          <span className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">EXAMPLE</span>
          <p>{selected.examples[0].german}</p>
        </div>
      ) : null}

      {selected.state === "UNKNOWN" ? (
        <AddReadingLexemeForm documentId={documentId} lexemeId={selected.lexemeId} />
      ) : (
        <Link href={"/vocabulary/" + selected.lexemeId} className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383">
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
    <div className="reading-layout grid uv-grid-template-columns-6a5c4d4d49 gap-3.5 items-start uv-min760:uv-grid-template-columns-fef45c2a2b uv-min760:gap-6">
      <article className="reading-text-panel min-w-0">
        <div className="reading-legend flex flex-wrap gap-3 mb-3 text-uv-text-muted text-uv-ff1713651e0 uv-v36c0309a03:inline-flex uv-v36c0309a03:items-center uv-v36c0309a03:gap-1.5">
          <span><i className="legend-dot known w-2 h-2 rounded-uv-red9ab892c5 inline-block uv-v62a9d16506:bg-uv-ceb5d327b54 uv-vff7d05c727:bg-uv-warning uv-v3714481b42:bg-uv-primary-strong" /> known</span>
          <span><i className="legend-dot learning w-2 h-2 rounded-uv-red9ab892c5 inline-block uv-v62a9d16506:bg-uv-ceb5d327b54 uv-vff7d05c727:bg-uv-warning uv-v3714481b42:bg-uv-primary-strong" /> learning</span>
          <span><i className="legend-dot unknown w-2 h-2 rounded-uv-red9ab892c5 inline-block uv-v62a9d16506:bg-uv-ceb5d327b54 uv-vff7d05c727:bg-uv-warning uv-v3714481b42:bg-uv-primary-strong" /> unknown</span>
        </div>
        <div className="reading-text whitespace-pre-wrap text-uv-text-soft text-uv-fe3296cd469 uv-line-height-da4b9237ba">{rendered}</div>
      </article>

      {selected ? (
        <aside className="panel reading-detail reading-detail-desktop uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex-col gap-3.5 uv-vd552c26874:m-0 uv-vd552c26874:text-uv-f3951047c34 uv-vd552c26874:uv-letter-spacing-b22247dbaf uv-min760:sticky uv-min760:top-7.5 uv-min760:flex rounded-uv-r6d27d54c6c hidden uv-min940:flex uv-min940:sticky uv-min940:top-7 uv-min940:uv-max-height-0330ea2289 uv-min940:overflow-y-auto uv-min940:overscroll-contain">
          <ReadingDetail
            documentId={documentId}
            selected={selected}
            translationPreference={translationPreference}
          />
        </aside>
      ) : (
        <aside className="panel reading-detail reading-detail-desktop uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 flex-col gap-3.5 uv-vd552c26874:m-0 uv-vd552c26874:text-uv-f3951047c34 uv-vd552c26874:uv-letter-spacing-b22247dbaf uv-min760:sticky uv-min760:top-7.5 uv-min760:flex rounded-uv-r6d27d54c6c hidden uv-min940:flex uv-min940:sticky uv-min940:top-7 uv-min940:uv-max-height-0330ea2289 uv-min940:overflow-y-auto uv-min940:overscroll-contain">
          <Plus size={18} />
          <p className="muted text-uv-text-muted">Select highlighted vocabulary to inspect it.</p>
        </aside>
      )}

      <AnimatePresence>
        {selected && mobileOpen ? (
          <>
            <motion.button
              aria-label="Close word details"
              className="reading-detail-backdrop fixed uv-z-index-a72b20062e inset-0 border-0 bg-uv-c53e6311db9 uv-backdrop-filter-3d54fe1e26 uv-min940:hidden"
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
              className="panel reading-detail reading-detail-mobile uv-border-8d7f82f403 flex flex-col gap-3.5 uv-vd552c26874:m-0 uv-vd552c26874:text-uv-f3951047c34 uv-vd552c26874:uv-letter-spacing-b22247dbaf uv-min760:sticky uv-min760:top-7.5 uv-min760:hidden fixed uv-z-index-b7103ca278 uv-inset-dfaa8d6342 w-auto uv-max-height-e53102cc3c overflow-y-auto overscroll-contain uv-padding-5c5a34ecdc border-uv-border-strong rounded-uv-r42d92f3218 bg-uv-surface uv-box-shadow-c873b34949 uv-min940:hidden"
              exit={{ opacity: 0, y: 28 }}
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              key="reading-mobile-detail"
              role="dialog"
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
            >
              <div className="reading-sheet-handle w-9.5 h-1 uv-margin-4841c6f0e6 rounded-uv-red9ab892c5 bg-uv-border-strong" aria-hidden="true" />
              <div className="reading-sheet-header flex items-center justify-between gap-3 min-h-11 mb-0.75 uv-v22810335d8:text-uv-text-muted uv-v22810335d8:text-uv-f58b84cc6f5 uv-v22810335d8:uv-weight-650 uv-v22810335d8:uv-letter-spacing-70fabcad9b uv-v22810335d8:uppercase uv-v907997862c:w-10 uv-v907997862c:h-10 uv-v907997862c:min-h-10 uv-v907997862c:border-0 uv-v907997862c:bg-transparent">
                <span>Word details</span>
                <button
                  ref={closeButtonRef}
                  aria-label="Close word details"
                  className="icon-button w-11 h-11 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface text-uv-text-soft uv-min-height-e45618b383"
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
