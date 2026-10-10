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
        className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
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
          className="teach-sheet-overlay fixed z-index-120 inset-0 flex items-end justify-center padding-0-16px uv-max619:p-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
        >
          <button className="teach-sheet-backdrop absolute inset-0 border-0 bg-uv-c2b40fd9c9b backdrop-filter-blur-5px" type="button" aria-label={t("word.closeLesson")} onClick={close} />
          <motion.section
            className="teach-sheet relative z-index-1 width-min-640px-100pct max-height-min-76dvh-680px flex flex-col overflow-hidden border-1px-solid-border-strong border-0-3 rounded-exact-24px-24px-0-0 bg-uv-surface box-shadow-shadow uv-max619:w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teach-sheet-title"
            ref={sheetRef}
            initial={reduceMotion ? { opacity: 0 } : { y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: 90, opacity: 0 }}
            transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
          >
            <div className="teach-sheet-handle w-9.5 h-1 flex-0-0-auto margin-10px-auto-0 rounded-exact-999px bg-uv-border-strong" aria-hidden="true" />
            <header className="teach-sheet-header flex items-start justify-between gap-4 padding-18px-22px-12px border-1px-solid-border in-h2:margin-4px-0-0 in-h2:text-exact-clamp-1p35rem-4vw-1p8rem">
              <div>
                <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("word.quickLesson")}</p>
                <h2 id="teach-sheet-title" className="learning-content" lang="de" dir="ltr">{label}</h2>
              </div>
              <button className="icon-button w-11 h-11 grid place-items-center border-1px-solid-border-2 rounded-exact-13px bg-uv-surface text-uv-text-soft min-height-tap-target" type="button" aria-label="Close lesson" ref={closeRef} onClick={close}>
                <X size={18} />
              </button>
            </header>
            <div className="teach-sheet-content min-h-32.5 overflow-y-auto overscroll-contain padding-20px-22px" aria-live="polite">
              {loading ? <p className="muted text-uv-text-muted" role="status">{t("word.generatingLesson")}</p> : null}
              {error ? <p className="optimistic-error width-min-100pct-760px mx-auto grid grid-template-columns-20px-minmax-0-1fr-auto items-center gap-2.25 padding-10px-12px border-1px-solid-rgb-239-91-91-0p35 rounded-exact-13px bg-uv-c4aa6e841de text-uv-text-soft text-exact-0p74rem in-svg:text-uv-danger in-text-button:min-h-9 uv-max480:grid-template-columns-20px-minmax-0-1fr uv-max480:in-text-button:grid-column-2 uv-max480:in-text-button:justify-self-start" role="alert">{error}</p> : null}
              {lesson ? (
                <div
                  className={"teach-sheet-lesson line-height-1p7 overflow-wrap-anywhere in-teach-sheet-lesson-fa:text-right in-teach-sheet-lesson-en:text-left in-first-child:mt-0 in-last-child:mb-0 in-p-2:margin-0-0-14px in-ul:margin-0-0-14px in-ol:margin-0-0-14px in-blockquote:margin-0-0-14px in-h1:margin-18px-0-8px in-h1:text-exact-1rem in-h1:line-height-1p4 in-h2:margin-18px-0-8px in-h2:text-exact-1rem in-h2:line-height-1p4 in-h3:margin-18px-0-8px in-h3:text-exact-1rem in-h3:line-height-1p4 in-ul:padding-inline-start-1p4rem in-ol:padding-inline-start-1p4rem in-li-li:mt-1.5 in-strong-2:text-uv-text in-a:text-uv-primary-strong in-a:underline in-blockquote:ps-3 in-blockquote:border-2px-solid-primary in-blockquote:text-uv-text-soft in-pre:overflow-x-auto in-pre:p-3 in-pre:rounded-exact-10px in-pre:bg-uv-surface-soft in-pre:direction-ltr in-pre:text-left in-code:direction-ltr in-code:unicode-bidi-isolate in-table:block in-table:max-w-full in-table:overflow-x-auto in-table:border-collapse in-th:padding-7px-10px in-th:border-1px-solid-border-2 in-td:padding-7px-10px in-td:border-1px-solid-border-2 teach-sheet-lesson--" + language}
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
            <div className="teach-sheet-footer flex justify-end padding-12px-22px-max-16px-env-safe-area-inset-bottom border-1px-solid-border-3">
              <button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" type="button" disabled={loading} onClick={() => void generate()}>
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
