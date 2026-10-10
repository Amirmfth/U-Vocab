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
        className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
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
          className="teach-sheet-overlay fixed uv-z-index-775bc5c30e inset-0 flex items-end justify-center uv-padding-14a564f8da uv-max619:p-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
        >
          <button className="teach-sheet-backdrop absolute inset-0 border-0 bg-uv-c2b40fd9c9b uv-backdrop-filter-f609dff645" type="button" aria-label={t("word.closeLesson")} onClick={close} />
          <motion.section
            className="teach-sheet relative uv-z-index-356a192b79 uv-width-f60c721dd8 uv-max-height-77f780b701 flex flex-col overflow-hidden uv-border-488f4b382f uv-border-bottom-b6589fc6ab rounded-uv-r36e46e09d8 bg-uv-surface uv-box-shadow-4ee177db8b uv-max619:w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teach-sheet-title"
            ref={sheetRef}
            initial={reduceMotion ? { opacity: 0 } : { y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: 90, opacity: 0 }}
            transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
          >
            <div className="teach-sheet-handle w-9.5 h-1 uv-flex-18ba0b6e31 uv-margin-7c0d32cb01 rounded-uv-red9ab892c5 bg-uv-border-strong" aria-hidden="true" />
            <header className="teach-sheet-header flex items-start justify-between gap-4 uv-padding-8b47c96508 uv-border-bottom-8d7f82f403 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:text-uv-ff65c5a7834">
              <div>
                <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("word.quickLesson")}</p>
                <h2 id="teach-sheet-title" className="learning-content" lang="de" dir="ltr">{label}</h2>
              </div>
              <button className="icon-button w-11 h-11 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface text-uv-text-soft uv-min-height-e45618b383" type="button" aria-label="Close lesson" ref={closeRef} onClick={close}>
                <X size={18} />
              </button>
            </header>
            <div className="teach-sheet-content min-h-32.5 overflow-y-auto overscroll-contain uv-padding-8111484bf4" aria-live="polite">
              {loading ? <p className="muted text-uv-text-muted" role="status">{t("word.generatingLesson")}</p> : null}
              {error ? <p className="optimistic-error uv-width-2e40884b7a mx-auto grid uv-grid-template-columns-7e830708d5 items-center gap-2.25 uv-padding-df857c6c31 uv-border-d12aa08a65 rounded-uv-r233710a71e bg-uv-c4aa6e841de text-uv-text-soft text-uv-f63777cce16 uv-v872d6ea02a:text-uv-danger uv-v0012ce6f5a:min-h-9 uv-max480:uv-grid-template-columns-eef7441aab uv-max480:uv-v0012ce6f5a:uv-grid-column-da4b9237ba uv-max480:uv-v0012ce6f5a:uv-justify-self-2b020927d3" role="alert">{error}</p> : null}
              {lesson ? (
                <div
                  className={"teach-sheet-lesson uv-line-height-58e6d386c3 uv-overflow-wrap-112c2a063a uv-vf51ff57e3d:text-right uv-v88d82c4fc6:text-left uv-v463206003e:mt-0 uv-v87e7c148d8:mb-0 uv-vb19eb067c9:uv-margin-222c7e5b85 uv-v10010674ad:uv-margin-222c7e5b85 uv-v420f89edb5:uv-margin-222c7e5b85 uv-v40f68432a8:uv-margin-222c7e5b85 uv-v3bccf64584:uv-margin-569590c818 uv-v3bccf64584:text-uv-f19feeb881c uv-v3bccf64584:uv-line-height-a26f83404b uv-vd552c26874:uv-margin-569590c818 uv-vd552c26874:text-uv-f19feeb881c uv-vd552c26874:uv-line-height-a26f83404b uv-v55c53ce4b9:uv-margin-569590c818 uv-v55c53ce4b9:text-uv-f19feeb881c uv-v55c53ce4b9:uv-line-height-a26f83404b uv-v10010674ad:uv-padding-inline-start-581ef1c0e1 uv-v420f89edb5:uv-padding-inline-start-581ef1c0e1 uv-vfe836888b7:mt-1.5 uv-veda02a0adb:text-uv-text uv-v99777dc5b4:text-uv-primary-strong uv-v99777dc5b4:underline uv-v40f68432a8:ps-3 uv-v40f68432a8:uv-border-inline-start-60840fcc61 uv-v40f68432a8:text-uv-text-soft uv-v465306b89e:overflow-x-auto uv-v465306b89e:p-3 uv-v465306b89e:rounded-uv-r933cc73310 uv-v465306b89e:bg-uv-surface-soft uv-v465306b89e:uv-direction-61ac44aaab uv-v465306b89e:text-left uv-ve192526015:uv-direction-61ac44aaab uv-ve192526015:uv-unicode-bidi-eb5779e2b2 uv-v40b5778120:block uv-v40b5778120:max-w-full uv-v40b5778120:overflow-x-auto uv-v40b5778120:uv-border-collapse-86d3bfb618 uv-v91df30fa0b:uv-padding-1eec12de18 uv-v91df30fa0b:uv-border-8d7f82f403 uv-v96e4348bba:uv-padding-1eec12de18 uv-v96e4348bba:uv-border-8d7f82f403 teach-sheet-lesson--" + language}
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
            <div className="teach-sheet-footer flex justify-end uv-padding-90a5280988 uv-border-top-8d7f82f403">
              <button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" type="button" disabled={loading} onClick={() => void generate()}>
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
