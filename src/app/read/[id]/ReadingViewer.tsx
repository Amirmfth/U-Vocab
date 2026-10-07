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
      <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
        <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{selected.partOfSpeech}</span>
        <span className={"badge reading-state [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em] [&.reading-state-known]:[color:var(--text-soft)] [&.reading-state-learning]:[color:#f5c77e] [&.reading-state-unknown]:[color:var(--primary-strong)] reading-state-" + selected.state.toLocaleLowerCase()}>
          {selected.state.toLocaleLowerCase()}
        </span>
      </div>

      <h2>
        {formatLexemeLabel(selected)}
      </h2>

      <div className="reading-meanings [&_p]:[margin:5px_0] [&_p]:[line-height:1.55]">
        {selected.translations
          .filter((translation) => {
            if (translationPreference === "BOTH") return true;
            if (translationPreference === "PERSIAN") return translation.language === "fa";
            return translation.language === "en";
          })
          .map((translation) => (
            <p
              key={translation.language + translation.text}
              className={translation.language === "fa" ? "rtl [direction:rtl] [text-align:right]" : undefined}
            >
              {translation.text}
            </p>
          ))}
      </div>

      {selected.patterns.length ? (
        <div className="reading-detail-section [&_p]:[margin:5px_0] [&_p]:[line-height:1.55] [padding-top:12px] [border-top:1px_solid_var(--border)]">
          <span className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">PATTERN</span>
          {selected.patterns.map((pattern) => (
            <div key={pattern.pattern}>
              <strong>{pattern.pattern}</strong>
              {pattern.explanation ? <p className="muted [color:var(--text-muted)]">{pattern.explanation}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {selected.collocations.length ? (
        <div className="reading-detail-section [&_p]:[margin:5px_0] [&_p]:[line-height:1.55] [padding-top:12px] [border-top:1px_solid_var(--border)]">
          <span className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">COLLOCATIONS</span>
          <div className="relation-list [display:flex] [flex-wrap:wrap] [gap:8px]">
            {selected.collocations.map((collocation) => (
              <span className="relation-chip [min-height:48px] [min-width:110px] [display:inline-flex] [flex-direction:column] [justify-content:center] [gap:3px] [padding:8px_12px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface-raised)] [&_span]:[font-weight:600] [&_small]:[color:var(--text-muted)] [&_small]:[font-size:0.66rem]" key={collocation}>
                <span>{collocation}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {selected.examples[0] ? (
        <div className="reading-detail-section [&_p]:[margin:5px_0] [&_p]:[line-height:1.55] [padding-top:12px] [border-top:1px_solid_var(--border)]">
          <span className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">EXAMPLE</span>
          <p>{selected.examples[0].german}</p>
        </div>
      ) : null}

      {selected.state === "UNKNOWN" ? (
        <AddReadingLexemeForm documentId={documentId} lexemeId={selected.lexemeId} />
      ) : (
        <Link href={"/vocabulary/" + selected.lexemeId} className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]">
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
    <div className="reading-layout [display:grid] [grid-template-columns:1fr] [gap:14px] [align-items:start] min-[760px]:[grid-template-columns:minmax(0,_1.7fr)_minmax(250px,_0.8fr)] min-[760px]:[gap:24px]">
      <article className="reading-text-panel [min-width:0]">
        <div className="reading-legend [display:flex] [flex-wrap:wrap] [gap:12px] [margin-bottom:12px] [color:var(--text-muted)] [font-size:0.72rem] [&_span]:[display:inline-flex] [&_span]:[align-items:center] [&_span]:[gap:6px]">
          <span><i className="legend-dot known [width:8px] [height:8px] [border-radius:999px] [display:inline-block] [&.known]:[background:#5e636f] [&.learning]:[background:var(--warning)] [&.unknown]:[background:var(--primary-strong)]" /> known</span>
          <span><i className="legend-dot learning [width:8px] [height:8px] [border-radius:999px] [display:inline-block] [&.known]:[background:#5e636f] [&.learning]:[background:var(--warning)] [&.unknown]:[background:var(--primary-strong)]" /> learning</span>
          <span><i className="legend-dot unknown [width:8px] [height:8px] [border-radius:999px] [display:inline-block] [&.known]:[background:#5e636f] [&.learning]:[background:var(--warning)] [&.unknown]:[background:var(--primary-strong)]" /> unknown</span>
        </div>
        <div className="reading-text [white-space:pre-wrap] [color:var(--text-soft)] [font-size:clamp(1.05rem,_3.8vw,_1.22rem)] [line-height:2]">{rendered}</div>
      </article>

      {selected ? (
        <aside className="panel reading-detail reading-detail-desktop [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [flex-direction:column] [gap:14px] [&_h2]:[margin:0] [&_h2]:[font-size:1.35rem] [&_h2]:[letter-spacing:-0.035em] min-[760px]:[position:sticky] min-[760px]:[top:30px] min-[760px]:[display:flex] [border-radius:18px] [display:none] min-[940px]:[display:flex] min-[940px]:[position:sticky] min-[940px]:[top:28px] min-[940px]:[max-height:calc(100dvh_-_56px)] min-[940px]:[overflow-y:auto] min-[940px]:[overscroll-behavior:contain]">
          <ReadingDetail
            documentId={documentId}
            selected={selected}
            translationPreference={translationPreference}
          />
        </aside>
      ) : (
        <aside className="panel reading-detail reading-detail-desktop [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [flex-direction:column] [gap:14px] [&_h2]:[margin:0] [&_h2]:[font-size:1.35rem] [&_h2]:[letter-spacing:-0.035em] min-[760px]:[position:sticky] min-[760px]:[top:30px] min-[760px]:[display:flex] [border-radius:18px] [display:none] min-[940px]:[display:flex] min-[940px]:[position:sticky] min-[940px]:[top:28px] min-[940px]:[max-height:calc(100dvh_-_56px)] min-[940px]:[overflow-y:auto] min-[940px]:[overscroll-behavior:contain]">
          <Plus size={18} />
          <p className="muted [color:var(--text-muted)]">Select highlighted vocabulary to inspect it.</p>
        </aside>
      )}

      <AnimatePresence>
        {selected && mobileOpen ? (
          <>
            <motion.button
              aria-label="Close word details"
              className="reading-detail-backdrop [position:fixed] [z-index:69] [inset:0] [border:0] [background:rgba(0,_0,_0,_0.56)] [backdrop-filter:blur(2px)] min-[940px]:[display:none]"
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
              className="panel reading-detail reading-detail-mobile [border:1px_solid_var(--border)] [display:flex] [flex-direction:column] [gap:14px] [&_h2]:[margin:0] [&_h2]:[font-size:1.35rem] [&_h2]:[letter-spacing:-0.035em] min-[760px]:[position:sticky] min-[760px]:[top:30px] min-[760px]:[display:none] [position:fixed] [z-index:70] [inset:auto_10px_calc(82px_+_env(safe-area-inset-bottom))_10px] [width:auto] [max-height:min(66dvh,_620px)] [overflow-y:auto] [overscroll-behavior:contain] [padding:10px_16px_18px] [border-color:var(--border-strong)] [border-radius:22px] [background:var(--surface)] [box-shadow:0_24px_70px_rgba(0,0,0,0.5)] min-[940px]:[display:none]"
              exit={{ opacity: 0, y: 28 }}
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              key="reading-mobile-detail"
              role="dialog"
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
            >
              <div className="reading-sheet-handle [width:38px] [height:4px] [margin:0_auto_7px] [border-radius:999px] [background:var(--border-strong)]" aria-hidden="true" />
              <div className="reading-sheet-header [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [min-height:44px] [margin-bottom:3px] [&_>_span]:[color:var(--text-muted)] [&_>_span]:[font-size:0.7rem] [&_>_span]:[font-weight:650] [&_>_span]:[letter-spacing:0.05em] [&_>_span]:[text-transform:uppercase] [&_.icon-button]:[width:40px] [&_.icon-button]:[height:40px] [&_.icon-button]:[min-height:40px] [&_.icon-button]:[border:0] [&_.icon-button]:[background:transparent]">
                <span>Word details</span>
                <button
                  ref={closeButtonRef}
                  aria-label="Close word details"
                  className="icon-button [width:44px] [height:44px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:13px] [background:var(--surface)] [color:var(--text-soft)] [min-height:var(--tap-target)]"
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
