"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
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
              <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
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
