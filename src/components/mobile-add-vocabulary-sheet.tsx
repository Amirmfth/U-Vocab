"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { AddLexemeForm } from "@/app/vocabulary/new/AddLexemeForm";
import { useTranslations } from "@/i18n/client";

type TranslationPreference = "ENGLISH" | "PERSIAN" | "BOTH";

export function MobileAddVocabularySheet({
  isOpen,
  onClose,
  translationPreference,
}: {
  isOpen: boolean;
  onClose: () => void;
  translationPreference: TranslationPreference;
}) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations();

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hasAttribute("hidden"));

      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

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
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="mobile-add-sheet [position:fixed] [z-index:100] [inset:0] [display:flex] [align-items:flex-end] min-[940px]:[display:none]"
          id="mobile-add-sheet [position:fixed] [z-index:100] [inset:0] [display:flex] [align-items:flex-end] min-[940px]:[display:none]"
          className="mobile-add-sheet fixed uv-z-index-310b86e0b6 inset-0 flex items-end uv-min940:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-add-sheet-title"
        >
          <motion.button
            aria-label={t("common.close")}
            className="mobile-add-sheet-backdrop absolute inset-0 border-0 bg-uv-c1ae88974c6 uv-backdrop-filter-d62a8b0713"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            type="button"
            onClick={onClose}
          />
          <motion.section
            ref={panelRef}
            tabIndex={-1}
            key="mobile-add-sheet-panel [position:relative] [width:100%] [max-height:min(88dvh,_760px)] [min-height:60dvh] [overflow-y:auto] [padding:10px_16px_calc(24px_+_env(safe-area-inset-bottom))] [border-radius:26px_26px_0_0] [background:var(--surface)] [box-shadow:0_-18px_50px_rgba(0,_0,_0,_0.36)] [&_.import-workspace]:[max-width:none] [&_.form-panel]:[max-width:none] [overscroll-behavior:contain]"
            className="mobile-add-sheet-panel relative w-full uv-max-height-65132cd709 uv-min-height-6a44d2a259 overflow-y-auto uv-padding-2725c517ed rounded-uv-re9f29dbce4 bg-uv-surface uv-box-shadow-362613975a uv-v180c0ef1bf:max-w-none uv-v9c24735bb5:max-w-none overscroll-contain"
            initial={reduceMotion ? false : { opacity: 0, y: 44 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 44 }}
            transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.8 }}
          >
            <div className="mobile-add-sheet-handle w-9.5 h-1 uv-margin-87d43423ed rounded-uv-red9ab892c5 bg-uv-border-strong" aria-hidden="true" />
            <header className="mobile-add-sheet-header flex items-start justify-between gap-4 mb-3 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:text-uv-fab62110780 uv-vd552c26874:uv-letter-spacing-7e30c105f8">
              <div>
                <h2 id="mobile-add-sheet-title">{t("common.addVocabulary")}</h2>
              </div>
              <button
                ref={closeButtonRef}
                className="icon-button w-11 h-11 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface text-uv-text-soft uv-min-height-e45618b383"
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
              >
                <X size={20} />
              </button>
            </header>
            <AddLexemeForm translationPreference={translationPreference} />
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
