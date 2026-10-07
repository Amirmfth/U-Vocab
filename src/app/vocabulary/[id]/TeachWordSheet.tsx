"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpenCheck, RefreshCcw, X } from "lucide-react";
import { generateQuickTeachAction } from "./actions";
import { useWordLanguage } from "./WordLanguage";
import { useTranslations } from "@/i18n/client";

export function TeachWordSheet({ lexemeId, label }: {
  lexemeId: string;
  label: string;
}) {
  const { language: selectedLanguage } = useWordLanguage();
  const language = selectedLanguage === "PERSIAN" ? "fa" : "en";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const t = useTranslations();

  const close = useCallback(() => {
    requestId.current += 1;
    setOpen(false);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const previousStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    const previousHtmlOverflow = document.documentElement.style.overflow;
    Object.assign(document.body.style, {
      overflow: "hidden",
      position: "fixed",
      top: `-${scrollY}px`,
      width: "100%",
    });
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab") {
        const focusable = Array.from(sheetRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first && last) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last && first) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      Object.assign(document.body.style, previousStyles);
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.scrollTo({ top: scrollY, behavior: "auto" });
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open]);

  async function generate() {
    const id = ++requestId.current;
    setLoading(true);
    setLesson(null);
    setError(null);
    try {
      const result = await generateQuickTeachAction(lexemeId, language);
      if (requestId.current !== id) return;
      if (result.status === "error") setError(result.message);
      else setLesson(result.lesson);
    } catch (cause) {
      if (requestId.current !== id) return;
      setError(cause instanceof Error ? cause.message : t("word.lessonError"));
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }

  return (
    <>
      <button
        className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
        type="button"
        ref={triggerRef}
        onClick={() => {
          setOpen(true);
          void generate();
        }}
      >
        <BookOpenCheck size={18} /> {t("word.teach")}
      </button>
      <AnimatePresence onExitComplete={() => triggerRef.current?.focus()}>
      {open ? (
        <motion.div
          className="teach-sheet-overlay [position:fixed] [z-index:120] [inset:0] [display:flex] [align-items:flex-end] [justify-content:center] [padding:0_16px] max-[619px]:[padding:0]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
        >
          <button className="teach-sheet-backdrop [position:absolute] [inset:0] [border:0] [background:rgba(0,_0,_0,_0.72)] [backdrop-filter:blur(5px)]" type="button" aria-label={t("word.closeLesson")} onClick={close} />
          <motion.section
            className="teach-sheet [position:relative] [z-index:1] [width:min(640px,_100%)] [max-height:min(76dvh,_680px)] [display:flex] [flex-direction:column] [overflow:hidden] [border:1px_solid_var(--border-strong)] [border-bottom:0] [border-radius:24px_24px_0_0] [background:var(--surface)] [box-shadow:var(--shadow)] max-[619px]:[width:100%]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teach-sheet-title"
            ref={sheetRef}
            initial={reduceMotion ? { opacity: 0 } : { y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: 90, opacity: 0 }}
            transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
          >
            <div className="teach-sheet-handle [width:38px] [height:4px] [flex:0_0_auto] [margin:10px_auto_0] [border-radius:999px] [background:var(--border-strong)]" aria-hidden="true" />
            <header className="teach-sheet-header [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:16px] [padding:18px_22px_12px] [border-bottom:1px_solid_var(--border)] [&_h2]:[margin:4px_0_0] [&_h2]:[font-size:clamp(1.35rem,_4vw,_1.8rem)]">
              <div>
                <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("word.quickLesson")}</p>
                <h2 id="teach-sheet-title" className="learning-content" lang="de" dir="ltr">{label}</h2>
              </div>
              <button className="icon-button [width:44px] [height:44px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:13px] [background:var(--surface)] [color:var(--text-soft)] [min-height:var(--tap-target)]" type="button" aria-label="Close lesson" ref={closeRef} onClick={close}>
                <X size={18} />
              </button>
            </header>
            <div className="teach-sheet-content [min-height:130px] [overflow-y:auto] [overscroll-behavior:contain] [padding:20px_22px]" aria-live="polite">
              {loading ? <p className="muted [color:var(--text-muted)]" role="status">{t("word.generatingLesson")}</p> : null}
              {error ? <p className="optimistic-error [width:min(100%,_760px)] [margin-inline:auto] [display:grid] [grid-template-columns:20px_minmax(0,_1fr)_auto] [align-items:center] [gap:9px] [padding:10px_12px] [border:1px_solid_rgba(239,_91,_91,_0.35)] [border-radius:13px] [background:rgba(239,_91,_91,_0.08)] [color:var(--text-soft)] [font-size:0.74rem] [&_>_svg]:[color:var(--danger)] [&_.text-button]:[min-height:36px] max-[480px]:[grid-template-columns:20px_minmax(0,_1fr)] max-[480px]:[&_.text-button]:[grid-column:2] max-[480px]:[&_.text-button]:[justify-self:start]" role="alert">{error}</p> : null}
              {lesson ? (
                <div
                  className={"teach-sheet-lesson [line-height:1.7] [overflow-wrap:anywhere] [&.teach-sheet-lesson--fa]:[text-align:right] [&.teach-sheet-lesson--en]:[text-align:left] [&_>_:first-child]:[margin-top:0] [&_>_:last-child]:[margin-bottom:0] [&_p]:[margin:0_0_14px] [&_ul]:[margin:0_0_14px] [&_ol]:[margin:0_0_14px] [&_blockquote]:[margin:0_0_14px] [&_h1]:[margin:18px_0_8px] [&_h1]:[font-size:1rem] [&_h1]:[line-height:1.4] [&_h2]:[margin:18px_0_8px] [&_h2]:[font-size:1rem] [&_h2]:[line-height:1.4] [&_h3]:[margin:18px_0_8px] [&_h3]:[font-size:1rem] [&_h3]:[line-height:1.4] [&_ul]:[padding-inline-start:1.4rem] [&_ol]:[padding-inline-start:1.4rem] [&_li_+_li]:[margin-top:6px] [&_strong]:[color:var(--text)] [&_a]:[color:var(--primary-strong)] [&_a]:[text-decoration:underline] [&_blockquote]:[padding-inline-start:12px] [&_blockquote]:[border-inline-start:2px_solid_var(--primary)] [&_blockquote]:[color:var(--text-soft)] [&_pre]:[overflow-x:auto] [&_pre]:[padding:12px] [&_pre]:[border-radius:10px] [&_pre]:[background:var(--surface-soft)] [&_pre]:[direction:ltr] [&_pre]:[text-align:left] [&_code]:[direction:ltr] [&_code]:[unicode-bidi:isolate] [&_table]:[display:block] [&_table]:[max-width:100%] [&_table]:[overflow-x:auto] [&_table]:[border-collapse:collapse] [&_th]:[padding:7px_10px] [&_th]:[border:1px_solid_var(--border)] [&_td]:[padding:7px_10px] [&_td]:[border:1px_solid_var(--border)] teach-sheet-lesson--" + language}
                  dir={language === "fa" ? "rtl" : "ltr"}
                  lang={language}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                    }}
                  >
                    {lesson}
                  </ReactMarkdown>
                </div>
              ) : null}
            </div>
            <div className="teach-sheet-footer [display:flex] [justify-content:flex-end] [padding:12px_22px_max(16px,_env(safe-area-inset-bottom))] [border-top:1px_solid_var(--border)]">
              <button className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" type="button" disabled={loading} onClick={() => void generate()}>
                <RefreshCcw size={17} /> {t("word.regenerate")}
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </>
  );
}
