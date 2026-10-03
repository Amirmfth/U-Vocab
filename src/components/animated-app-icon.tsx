"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { BookTextIcon, type BookTextIconHandle } from "@/components/icons/book-text";
import { GraduationCapIcon } from "@/components/icons/graduation-cap";
import { BrainIcon } from "@/components/icons/brain";
import { SparklesIcon } from "@/components/icons/sparkles";
import { MessageCircleIcon } from "@/components/icons/message-circle";
import { PenToolIcon } from "@/components/icons/pen-tool";
import { SettingsIcon } from "@/components/icons/settings";
import { ChartNoAxesColumnIncreasingIcon } from "@/components/icons/chart-no-axes-column-increasing";
import { PlusIcon } from "@/components/icons/plus";

const icons = {
  words: BookTextIcon,
  grammar: GraduationCapIcon,
  review: BrainIcon,
  practice: SparklesIcon,
  writing: PenToolIcon,
  reading: BookTextIcon,
  conversation: MessageCircleIcon,
  drill: SparklesIcon,
  progress: ChartNoAxesColumnIncreasingIcon,
  settings: SettingsIcon,
  add: PlusIcon,
};

export type AnimatedAppIconName = keyof typeof icons;

export function AnimatedAppIcon({ name, size }: { name: AnimatedAppIconName; size: number }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<BookTextIconHandle>(null);
  const reducedMotion = useReducedMotion();
  const Icon = icons[name];

  useEffect(() => {
    const target = containerRef.current?.closest("a, button");
    if (!target || reducedMotion) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const start = () => iconRef.current?.startAnimation();
    const stop = () => iconRef.current?.stopAnimation();
    const press = () => {
      start();
      clearTimeout(timeout);
      timeout = setTimeout(stop, 700);
    };
    target.addEventListener("pointerenter", start);
    target.addEventListener("pointerleave", stop);
    target.addEventListener("focusin", start);
    target.addEventListener("focusout", stop);
    target.addEventListener("pointerdown", press);
    return () => {
      clearTimeout(timeout);
      target.removeEventListener("pointerenter", start);
      target.removeEventListener("pointerleave", stop);
      target.removeEventListener("focusin", start);
      target.removeEventListener("focusout", stop);
      target.removeEventListener("pointerdown", press);
      stop();
    };
  }, [reducedMotion]);

  return <span ref={containerRef} aria-hidden="true"><Icon ref={iconRef} size={size} /></span>;
}
