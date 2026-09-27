"use client";

import { useLayoutEffect } from "react";

export function WordPageScrollReset({ wordId }: { wordId: string }) {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [wordId]);

  return null;
}
