"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, RefreshCcw, X } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { conjugationTabs, type VerbConjugation as VerbConjugationData } from "@/lib/verb-conjugation";

type ResponseShape = { status: "ok"; cache: "hit" | "miss"; data: VerbConjugationData };

async function fetchConjugation(lexemeId: string): Promise<ResponseShape> {
  const response = await fetch("/api/vocabulary/" + lexemeId + "/conjugation", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Could not load conjugation.");
  return payload as ResponseShape;
}

export function VerbConjugation({ lexemeId }: { lexemeId: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("present");
  const reduceMotion = useReducedMotion();
  const query = useQuery({
    queryKey: queryKeys.word.conjugation(lexemeId),
    queryFn: () => fetchConjugation(lexemeId),
    enabled: open,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const previousStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    Object.assign(document.body.style, {
      overflow: "hidden",
      position: "fixed",
      top: `-${scrollY}px`,
      width: "100%",
    });
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      Object.assign(document.body.style, previousStyles);
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const tabs = useMemo(() => query.data ? conjugationTabs(query.data.data) : [], [query.data]);
  const selected = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return <>
    <button
      aria-controls="conjugation-sheet"
      aria-expanded={open}
      className="word-quick-action-button"
      type="button"
      onClick={() => setOpen(true)}
    >
      <BookOpenCheck size={17} /> Conjugate
    </button>

    <AnimatePresence>
      {open ? <motion.div
        key="conjugation-sheet"
        id="conjugation-sheet"
        className="conjugation-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conjugation-title"
      >
        <motion.button
          aria-label="Close conjugation"
          className="conjugation-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          type="button"
          onClick={() => setOpen(false)}
        />
        <motion.section
          className="conjugation-panel"
          initial={reduceMotion ? false : { opacity: 0, y: 44, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 44, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 360, damping: 32, mass: 0.8 }}
        >
          <div className="conjugation-sheet-handle" aria-hidden="true" />
          <div className="conjugation-shell">
            <header className="conjugation-header">
              <div>
                <p className="eyebrow">VERB REFERENCE</p>
                <h2 id="conjugation-title">{query.data?.data.lemma ? "Conjugate " + query.data.data.lemma : "Conjugation"}</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close conjugation"><X size={18} /></button>
            </header>

            {query.isPending ? <div className="conjugation-state" role="status">
              <div className="skeleton skeleton-title" /><div className="skeleton skeleton-card" /><span>Generating conjugations…</span>
            </div> : null}

            {query.isError ? <div className="conjugation-state" role="alert">
              <strong>Conjugation unavailable</strong>
              <span>{query.error instanceof Error ? query.error.message : "Could not load conjugation."}</span>
              <button className="button button-secondary" type="button" onClick={() => query.refetch()}><RefreshCcw size={16} /> Retry</button>
            </div> : null}

            {query.data ? <>
              <div className="conjugation-meta">
                <span>{query.data.data.metadata.auxiliary}</span>
                <span>{query.data.data.metadata.verbClass}</span>
                {query.data.data.metadata.separable ? <span>separable</span> : null}
                {query.data.data.metadata.reflexive ? <span>reflexive</span> : null}
              </div>

              <div className="conjugation-tabs" role="tablist" aria-label="Conjugation tense">
                {tabs.map((tab) => <button key={tab.id} id={"tab-" + tab.id} type="button" role="tab" aria-selected={selected?.id === tab.id && active !== "imperative" && active !== "forms"} aria-controls="conjugation-tense-panel" className={selected?.id === tab.id && active !== "imperative" && active !== "forms" ? "is-active" : ""} onClick={() => setActive(tab.id)}>{tab.label}<small>{tab.german}</small></button>)}
                <button type="button" role="tab" aria-selected={active === "imperative"} aria-controls="conjugation-tense-panel" className={active === "imperative" ? "is-active" : ""} onClick={() => setActive("imperative")}>Imperative<small>Imperativ</small></button>
                <button type="button" role="tab" aria-selected={active === "forms"} aria-controls="conjugation-tense-panel" className={active === "forms" ? "is-active" : ""} onClick={() => setActive("forms")}>Forms<small>Stammformen</small></button>
              </div>

              <section id="conjugation-tense-panel" className="conjugation-content" role="tabpanel" aria-live="polite">
                {active === "imperative" ? <div className="conjugation-reference-grid">
                  <div><span>du</span><strong>{query.data.data.imperative.du}</strong></div>
                  <div><span>ihr</span><strong>{query.data.data.imperative.ihr}</strong></div>
                  <div><span>Sie</span><strong>{query.data.data.imperative.sie}</strong></div>
                  {query.data.data.imperative.note ? <p>{query.data.data.imperative.note}</p> : null}
                </div> : active === "forms" ? <div className="conjugation-reference-grid">
                  <div><span>Infinitive</span><strong>{query.data.data.principalForms.infinitive}</strong></div>
                  <div><span>zu + infinitive</span><strong>{query.data.data.principalForms.zuInfinitive}</strong></div>
                  <div><span>Partizip I</span><strong>{query.data.data.principalForms.participleI}</strong></div>
                  <div><span>Partizip II</span><strong>{query.data.data.principalForms.participleII}</strong></div>
                  <div><span>Auxiliary</span><strong>{query.data.data.metadata.auxiliary}</strong></div>
                  {query.data.data.metadata.stemChange ? <div><span>Stem change</span><strong>{query.data.data.metadata.stemChange}</strong></div> : null}
                  {query.data.data.metadata.usageNote ? <p>{query.data.data.metadata.usageNote}</p> : null}
                </div> : selected ? <>
                  <div className="conjugation-tense-heading"><strong>{selected.tense.label}</strong>{selected.tense.note ? <span>{selected.tense.note}</span> : null}</div>
                  <table className="conjugation-table"><thead><tr><th>Person</th><th>Conjugated form</th></tr></thead><tbody>{selected.tense.forms.map((row) => <tr key={row.person}><th scope="row">{row.person}</th><td>{row.form}</td></tr>)}</tbody></table>
                </> : null}
              </section>
            </> : null}
          </div>
        </motion.section>
      </motion.div> : null}
    </AnimatePresence>
  </>;
}
