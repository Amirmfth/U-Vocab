"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { AddLexemeForm } from "@/app/vocabulary/new/AddLexemeForm";

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
        <motion.div key="mobile-add-sheet" id="mobile-add-sheet" className="mobile-add-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-add-sheet-title">
          <motion.button
            aria-label="Close add vocabulary"
            className="mobile-add-sheet-backdrop"
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
            key="mobile-add-sheet-panel"
            className="mobile-add-sheet-panel"
            initial={reduceMotion ? false : { opacity: 0, y: 44 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 44 }}
            transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.8 }}
          >
            <div className="mobile-add-sheet-handle" aria-hidden="true" />
            <header className="mobile-add-sheet-header">
              <div>
                <h2 id="mobile-add-sheet-title">Add vocabulary</h2>
              </div>
              <button ref={closeButtonRef} className="icon-button" type="button" onClick={onClose} aria-label="Close">
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
