"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, RefreshCcw, X } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import {
  conjugationTabs,
  type VerbConjugation as VerbConjugationData,
} from "@/lib/verb-conjugation";
import { useTranslations } from "@/i18n/client";
import type { MessageKey } from "@/i18n/core";

type ResponseShape = {
  status: "ok";
  cache: "hit" | "miss";
  data: VerbConjugationData;
};

const tenseLabelKeys: Record<string, MessageKey> = {
  present: "word.tense.present",
  past: "word.tense.past",
  perfect: "word.tense.perfect",
  pluperfect: "word.tense.pluperfect",
  "future-i": "word.tense.future-i",
  "future-ii": "word.tense.future-ii",
  "konjunktiv-i": "word.tense.konjunktiv-i",
  "konjunktiv-i-perfect": "word.tense.konjunktiv-i-perfect",
  "konjunktiv-ii": "word.tense.konjunktiv-ii",
  "konjunktiv-ii-perfect": "word.tense.konjunktiv-ii-perfect",
  wurde: "word.tense.wurde",
};

const verbClassKeys: Record<string, MessageKey> = {
  strong: "word.verbClass.strong",
  weak: "word.verbClass.weak",
  mixed: "word.verbClass.mixed",
  irregular: "word.verbClass.irregular",
};

async function fetchConjugation(
  lexemeId: string,
  fallbackError: string,
): Promise<ResponseShape> {
  const response = await fetch("/api/vocabulary/" + lexemeId + "/conjugation", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json();
  if (response.status === 401) {
    window.location.assign(
      "/login?returnTo=" +
        encodeURIComponent(window.location.pathname + window.location.search),
    );
    throw new Error("Unauthorized");
  }
  if (!response.ok) throw new Error(payload.error ?? fallbackError);
  return payload as ResponseShape;
}

export function VerbConjugation({
  lexemeId,
  userScope,
}: {
  lexemeId: string;
  userScope: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("present");
  const reduceMotion = useReducedMotion();
  const t = useTranslations();
  const query = useQuery({
    queryKey: queryKeys.word.conjugation(userScope, lexemeId),
    queryFn: () => fetchConjugation(lexemeId, t("word.conjugationError")),
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

  const tabs = useMemo(
    () => (query.data ? conjugationTabs(query.data.data) : []),
    [query.data],
  );
  const selected = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <>
      <button
        aria-controls="conjugation-sheet"
        aria-expanded={open}
        className="word-quick-action-button"
        type="button"
        onClick={() => setOpen(true)}
      >
        <BookOpenCheck size={17} /> {t("word.conjugate")}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="conjugation-sheet"
            id="conjugation-sheet"
            className="conjugation-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="conjugation-title"
          >
            <motion.button
              aria-label={t("word.closeConjugation")}
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
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 44, scale: 0.98 }
              }
              transition={{
                type: "spring",
                stiffness: 360,
                damping: 32,
                mass: 0.8,
              }}
            >
              <div className="conjugation-sheet-handle" aria-hidden="true" />
              <div className="conjugation-shell">
                <header className="conjugation-header">
                  <div>
                    <p className="eyebrow">{t("word.verbReference")}</p>
                    <h2 id="conjugation-title">
                      {query.data?.data.lemma
                        ? t("word.conjugateLemma", {
                            lemma: query.data.data.lemma,
                          })
                        : t("word.conjugation")}
                    </h2>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("word.closeConjugation")}
                  >
                    <X size={18} />
                  </button>
                </header>

                {query.isPending ? (
                  <div className="conjugation-state" role="status">
                    <div className="skeleton skeleton-title" />
                    <div className="skeleton skeleton-card" />
                    <span>{t("word.generatingConjugation")}</span>
                  </div>
                ) : null}

                {query.isError ? (
                  <div className="conjugation-state" role="alert">
                    <strong>{t("word.conjugationUnavailable")}</strong>
                    <span>
                      {query.error instanceof Error
                        ? query.error.message
                        : t("word.conjugationError")}
                    </span>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => query.refetch()}
                    >
                      <RefreshCcw size={16} /> {t("word.retry")}
                    </button>
                  </div>
                ) : null}

                {query.data ? (
                  <>
                    <div className="conjugation-meta">
                      <span className="learning-content" lang="de" dir="ltr">
                        {query.data.data.metadata.auxiliary}
                      </span>
                      <span>
                        {t(
                          verbClassKeys[query.data.data.metadata.verbClass] ??
                            "word.verbClass.irregular",
                        )}
                      </span>
                      {query.data.data.metadata.separable ? (
                        <span>{t("word.separable")}</span>
                      ) : null}
                      {query.data.data.metadata.reflexive ? (
                        <span>{t("word.reflexive")}</span>
                      ) : null}
                    </div>

                    <div
                      className="conjugation-tabs"
                      role="tablist"
                      aria-label={t("word.conjugationTense")}
                    >
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          id={"tab-" + tab.id}
                          type="button"
                          role="tab"
                          aria-selected={
                            selected?.id === tab.id &&
                            active !== "imperative" &&
                            active !== "forms"
                          }
                          aria-controls="conjugation-tense-panel"
                          className={
                            selected?.id === tab.id &&
                            active !== "imperative" &&
                            active !== "forms"
                              ? "is-active"
                              : ""
                          }
                          onClick={() => setActive(tab.id)}
                        >
                          {t(tenseLabelKeys[tab.id] ?? "word.tense.present")}
                          <small className="learning-content" lang="de" dir="ltr">
                            {tab.german}
                          </small>
                        </button>
                      ))}
                      <button
                        type="button"
                        role="tab"
                        aria-selected={active === "imperative"}
                        aria-controls="conjugation-tense-panel"
                        className={active === "imperative" ? "is-active" : ""}
                        onClick={() => setActive("imperative")}
                      >
                        {t("word.imperative")}
                        <small className="learning-content" lang="de" dir="ltr">
                          Imperativ
                        </small>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={active === "forms"}
                        aria-controls="conjugation-tense-panel"
                        className={active === "forms" ? "is-active" : ""}
                        onClick={() => setActive("forms")}
                      >
                        {t("word.forms")}
                        <small className="learning-content" lang="de" dir="ltr">
                          Stammformen
                        </small>
                      </button>
                    </div>

                    <section
                      id="conjugation-tense-panel"
                      className="conjugation-content"
                      role="tabpanel"
                      aria-live="polite"
                    >
                      {active === "imperative" ? (
                        <div className="conjugation-reference-grid">
                          <div lang="de" dir="ltr" className="learning-content">
                            <span>du</span>
                            <strong>{query.data.data.imperative.du}</strong>
                          </div>
                          <div lang="de" dir="ltr" className="learning-content">
                            <span>ihr</span>
                            <strong>{query.data.data.imperative.ihr}</strong>
                          </div>
                          <div lang="de" dir="ltr" className="learning-content">
                            <span>Sie</span>
                            <strong>{query.data.data.imperative.sie}</strong>
                          </div>
                          {query.data.data.imperative.note ? (
                            <p className="learning-content" lang="en" dir="ltr">
                              {query.data.data.imperative.note}
                            </p>
                          ) : null}
                        </div>
                      ) : active === "forms" ? (
                        <div className="conjugation-reference-grid">
                          <div>
                            <span>{t("word.infinitive")}</span>
                            <strong className="learning-content" lang="de" dir="ltr">
                              {query.data.data.principalForms.infinitive}
                            </strong>
                          </div>
                          <div>
                            <span>{t("word.zuInfinitive")}</span>
                            <strong className="learning-content" lang="de" dir="ltr">
                              {query.data.data.principalForms.zuInfinitive}
                            </strong>
                          </div>
                          <div>
                            <span className="learning-content" lang="de" dir="ltr">
                              Partizip I
                            </span>
                            <strong className="learning-content" lang="de" dir="ltr">
                              {query.data.data.principalForms.participleI}
                            </strong>
                          </div>
                          <div>
                            <span className="learning-content" lang="de" dir="ltr">
                              Partizip II
                            </span>
                            <strong className="learning-content" lang="de" dir="ltr">
                              {query.data.data.principalForms.participleII}
                            </strong>
                          </div>
                          <div>
                            <span>{t("word.auxiliary")}</span>
                            <strong className="learning-content" lang="de" dir="ltr">
                              {query.data.data.metadata.auxiliary}
                            </strong>
                          </div>
                          {query.data.data.metadata.stemChange ? (
                            <div>
                              <span>{t("word.stemChange")}</span>
                              <strong className="learning-content" lang="de" dir="ltr">
                                {query.data.data.metadata.stemChange}
                              </strong>
                            </div>
                          ) : null}
                          {query.data.data.metadata.usageNote ? (
                            <p className="learning-content" lang="en" dir="ltr">
                              {query.data.data.metadata.usageNote}
                            </p>
                          ) : null}
                        </div>
                      ) : selected ? (
                        <>
                          <div className="conjugation-tense-heading">
                            <strong>
                              {t(
                                tenseLabelKeys[selected.id] ??
                                  "word.tense.present",
                              )}
                            </strong>
                            {selected.tense.note ? (
                              <span
                                className="learning-content"
                                lang="en"
                                dir="ltr"
                              >
                                {selected.tense.note}
                              </span>
                            ) : null}
                          </div>
                          <table className="conjugation-table">
                            <thead>
                              <tr>
                                <th>{t("word.person")}</th>
                                <th>{t("word.conjugatedForm")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selected.tense.forms.map((row) => (
                                <tr key={row.person} lang="de" dir="ltr">
                                  <th scope="row">{row.person}</th>
                                  <td>{row.form}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      ) : null}
                    </section>
                  </>
                ) : null}
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
