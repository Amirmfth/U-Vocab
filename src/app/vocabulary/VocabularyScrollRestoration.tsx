"use client";

import { useEffect } from "react";

const PREFIX = "u-vocab:vocabulary-scroll:";

export function VocabularyScrollRestoration() {
  useEffect(() => {
    const key = PREFIX + window.location.pathname + window.location.search;
    const saved = Number(sessionStorage.getItem(key) ?? "0");

    if (Number.isFinite(saved) && saved > 0) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: saved, behavior: "auto" });
      });
    }

    const save = () => {
      sessionStorage.setItem(key, String(Math.max(0, window.scrollY)));
    };

    window.addEventListener("pagehide", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
    };
  }, []);

  return null;
}
