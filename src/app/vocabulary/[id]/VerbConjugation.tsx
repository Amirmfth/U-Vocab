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
        className="word-quick-action-button appearance-none inline-flex items-center justify-center gap-1.75 min-h-11 uv-padding-e76eae74a0 uv-border-8d7f82f403 rounded-uv-r0939007802 bg-uv-surface-raised text-uv-text-soft cursor-pointer uv-font-3e26d67509 text-uv-f68df68d03a uv-weight-620 active:uv-transform-9c10e35e08"
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
            className="conjugation-overlay fixed uv-z-index-310b86e0b6 inset-0 flex items-center justify-center p-3 uv-max619:items-end uv-max619:p-0"
            role="dialog"
            aria-modal="true"
            aria-labelledby="conjugation-title"
          >
            <motion.button
              aria-label={t("word.closeConjugation")}
              className="conjugation-backdrop absolute inset-0 border-0 bg-uv-c551182bf8a uv-backdrop-filter-f609dff645"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              type="button"
              onClick={() => setOpen(false)}
            />
            <motion.section
              className="conjugation-panel relative uv-width-e7a610a02c uv-max-height-1242661972 overflow-hidden overscroll-contain uv-border-488f4b382f rounded-uv-r42d92f3218 bg-uv-surface text-uv-text uv-box-shadow-4ee177db8b uv-max619:w-full uv-max619:uv-max-height-65132cd709 uv-max619:uv-border-bottom-b6589fc6ab uv-max619:rounded-uv-re9f29dbce4"
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
              <div className="conjugation-sheet-handle hidden uv-max619:block uv-max619:w-9.5 uv-max619:h-1 uv-max619:uv-margin-7c0d32cb01 uv-max619:rounded-uv-red9ab892c5 uv-max619:bg-uv-border-strong" aria-hidden="true" />
              <div className="conjugation-shell flex flex-col uv-min-height-deda98129e uv-max-height-1242661972 uv-min620:min-h-uv-e6fb97d224 uv-max619:min-h-0 uv-max619:uv-max-height-65132cd709 uv-max619:uv-padding-bottom-49b583ae64">
                <header className="conjugation-header flex items-start justify-between gap-4 uv-padding-eec66b4496 uv-border-bottom-8d7f82f403 uv-vd552c26874:uv-margin-02a5349d58 uv-vd552c26874:text-uv-fab62110780">
                  <div>
                    <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("word.verbReference")}</p>
                    <h2 id="conjugation-title">
                      {query.data?.data.lemma
                        ? t("word.conjugateLemma", {
                            lemma: query.data.data.lemma,
                          })
                        : t("word.conjugation")}
                    </h2>
                  </div>
                  <button
                    className="icon-button w-11 h-11 grid uv-place-items-305047e96e uv-border-8d7f82f403 rounded-uv-r233710a71e bg-uv-surface text-uv-text-soft uv-min-height-e45618b383"
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("word.closeConjugation")}
                  >
                    <X size={18} />
                  </button>
                </header>

                {query.isPending ? (
                  <div className="conjugation-state uv-flex-356a192b79 flex flex-col justify-center gap-3 p-6 uv-v22810335d8:text-uv-text-muted" role="status">
                    <div className="skeleton skeleton-title rounded-uv-r933cc73310 uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b uv-width-86fd0a9d90 h-13.5" />
                    <div className="skeleton skeleton-card uv-background-f9cc7f1a35 uv-background-size-6f7b2cd4e5 uv-animation-78b09c2c3b h-28 rounded-uv-r02a0a889dd" />
                    <span>{t("word.generatingConjugation")}</span>
                  </div>
                ) : null}

                {query.isError ? (
                  <div className="conjugation-state uv-flex-356a192b79 flex flex-col justify-center gap-3 p-6 uv-v22810335d8:text-uv-text-muted" role="alert">
                    <strong>{t("word.conjugationUnavailable")}</strong>
                    <span>
                      {query.error instanceof Error
                        ? query.error.message
                        : t("word.conjugationError")}
                    </span>
                    <button
                      className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383"
                      type="button"
                      onClick={() => query.refetch()}
                    >
                      <RefreshCcw size={16} /> {t("word.retry")}
                    </button>
                  </div>
                ) : null}

                {query.data ? (
                  <>
                    <div className="conjugation-meta flex flex-wrap gap-1.5 uv-padding-cb7b9f1f30 uv-v36c0309a03:uv-padding-24a7c581e4 uv-v36c0309a03:uv-border-8d7f82f403 uv-v36c0309a03:rounded-uv-red9ab892c5 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-ff051c59395">
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
                      className="conjugation-tabs flex gap-1.5 overflow-x-auto uv-padding-a3f9842c21 uv-border-bottom-8d7f82f403 uv-v513a7112a0:min-h-12 uv-v513a7112a0:uv-flex-18ba0b6e31 uv-v513a7112a0:flex uv-v513a7112a0:flex-col uv-v513a7112a0:justify-center uv-v513a7112a0:gap-0.5 uv-v513a7112a0:uv-padding-8297b577da uv-v513a7112a0:uv-border-8d7f82f403 uv-v513a7112a0:rounded-uv-r4bd46d4017 uv-v513a7112a0:bg-uv-surface-raised uv-v513a7112a0:text-uv-text-soft uv-v513a7112a0:cursor-pointer uv-v9628fc471b:text-uv-text-muted uv-v9628fc471b:text-uv-ff13a2a157c uv-v169acfe1bb:border-uv-primary uv-v169acfe1bb:bg-uv-cbdfd7cd038 uv-v169acfe1bb:text-uv-text"
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
                      className="conjugation-content uv-flex-356a192b79 overflow-auto p-4.5"
                      role="tabpanel"
                      aria-live="polite"
                    >
                      {active === "imperative" ? (
                        <div className="conjugation-reference-grid grid uv-grid-template-columns-6a5c4d4d49 gap-2.25 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-1 uv-vcbb57f4d35:p-3.25 uv-vcbb57f4d35:uv-border-8d7f82f403 uv-vcbb57f4d35:rounded-uv-r0939007802 uv-vcbb57f4d35:bg-uv-surface-raised uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-ff051c59395 uv-vb19eb067c9:uv-grid-column-5f9213811d uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-05c248da4c uv-min620:uv-grid-template-columns-6ed5bb837d">
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
                        <div className="conjugation-reference-grid grid uv-grid-template-columns-6a5c4d4d49 gap-2.25 uv-vcbb57f4d35:flex uv-vcbb57f4d35:flex-col uv-vcbb57f4d35:gap-1 uv-vcbb57f4d35:p-3.25 uv-vcbb57f4d35:uv-border-8d7f82f403 uv-vcbb57f4d35:rounded-uv-r0939007802 uv-vcbb57f4d35:bg-uv-surface-raised uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-ff051c59395 uv-vb19eb067c9:uv-grid-column-5f9213811d uv-vb19eb067c9:text-uv-text-soft uv-vb19eb067c9:uv-line-height-05c248da4c uv-min620:uv-grid-template-columns-6ed5bb837d">
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
                          <div className="conjugation-tense-heading flex flex-col gap-1.25 mb-3 uv-v36c0309a03:text-uv-text-muted uv-v36c0309a03:text-uv-fb0a544cd05 uv-v36c0309a03:uv-line-height-aa8f289ebe">
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
                          <table className="conjugation-table w-full uv-border-collapse-86d3bfb618 uv-v91df30fa0b:uv-padding-c4e72a1e2c uv-v91df30fa0b:uv-border-bottom-8d7f82f403 uv-v91df30fa0b:text-left uv-v96e4348bba:uv-padding-c4e72a1e2c uv-v96e4348bba:uv-border-bottom-8d7f82f403 uv-v96e4348bba:text-left uv-v1717b45db1:text-uv-text-muted uv-v1717b45db1:text-uv-ff73364d9bf uv-v1717b45db1:uv-weight-550 uv-va13082df36:uv-width-5be8ff9cc2 uv-va13082df36:text-uv-text-muted uv-va13082df36:uv-weight-550 uv-v18e0fc6455:text-uv-f19feeb881c uv-v18e0fc6455:uv-weight-620 uv-max619:uv-v91df30fa0b:uv-padding-b8b41d92d1 uv-max619:uv-v96e4348bba:uv-padding-b8b41d92d1">
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
