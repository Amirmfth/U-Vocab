"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpenCheck, RefreshCcw, X } from "lucide-react";
import { generateQuickTeachAction } from "./actions";

export function TeachWordSheet({ lexemeId, label, language }: {
  lexemeId: string;
  label: string;
  language: "fa" | "en";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

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
      const result = await generateQuickTeachAction(lexemeId);
      if (requestId.current !== id) return;
      if (result.status === "error") setError(result.message);
      else setLesson(result.lesson);
    } catch (cause) {
      if (requestId.current !== id) return;
      setError(cause instanceof Error ? cause.message : "Could not generate a lesson.");
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }

  return (
    <>
      <button
        className="button button-primary"
        type="button"
        ref={triggerRef}
        onClick={() => {
          setOpen(true);
          void generate();
        }}
      >
        <BookOpenCheck size={18} /> Teach me this word
      </button>
      <AnimatePresence onExitComplete={() => triggerRef.current?.focus()}>
      {open ? (
        <motion.div
          className="teach-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
        >
          <button className="teach-sheet-backdrop" type="button" aria-label="Close lesson" onClick={close} />
          <motion.section
            className="teach-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teach-sheet-title"
            ref={sheetRef}
            initial={reduceMotion ? { opacity: 0 } : { y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: 90, opacity: 0 }}
            transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
          >
            <div className="teach-sheet-handle" aria-hidden="true" />
            <header className="teach-sheet-header">
              <div>
                <p className="eyebrow">QUICK LESSON</p>
                <h2 id="teach-sheet-title" dir="ltr">{label}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close lesson" ref={closeRef} onClick={close}>
                <X size={18} />
              </button>
            </header>
            <div className="teach-sheet-content" aria-live="polite">
              {loading ? <p className="muted" role="status">Generating a short lesson…</p> : null}
              {error ? <p className="optimistic-error" role="alert">{error}</p> : null}
              {lesson ? (
                <div
                  className={"teach-sheet-lesson teach-sheet-lesson--" + language}
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
            <div className="teach-sheet-footer">
              <button className="button button-secondary" type="button" disabled={loading} onClick={() => void generate()}>
                <RefreshCcw size={17} /> Regenerate
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </>
  );
}
