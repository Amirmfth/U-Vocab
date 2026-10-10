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
        className="word-quick-action-button appearance-none inline-flex items-center justify-center gap-1.75 min-h-11 padding-0-11px border-1px-solid-border-2 rounded-uv-r0939007802 bg-uv-surface-raised text-uv-text-soft cursor-pointer font-inherit text-uv-f68df68d03a font-620 active:transform-scale-p97"
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
            className="conjugation-overlay fixed z-index-100 inset-0 flex items-center justify-center p-3 uv-max619:items-end uv-max619:p-0"
            role="dialog"
            aria-modal="true"
            aria-labelledby="conjugation-title"
          >
            <motion.button
              aria-label={t("word.closeConjugation")}
              className="conjugation-backdrop absolute inset-0 border-0 bg-uv-c551182bf8a backdrop-filter-blur-5px"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              type="button"
              onClick={() => setOpen(false)}
            />
            <motion.section
              className="conjugation-panel relative width-min-940px-100pct max-height-min-860px-calc-100dvh-24px overflow-hidden overscroll-contain border-1px-solid-border-strong rounded-uv-r42d92f3218 bg-uv-surface text-uv-text box-shadow-shadow uv-max619:w-full uv-max619:max-height-min-88dvh-760px uv-max619:border-0-3 uv-max619:rounded-uv-re9f29dbce4"
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
              <div className="conjugation-sheet-handle hidden uv-max619:block uv-max619:w-9.5 uv-max619:h-1 uv-max619:margin-10px-auto-0 uv-max619:rounded-uv-red9ab892c5 uv-max619:bg-uv-border-strong" aria-hidden="true" />
              <div className="conjugation-shell flex flex-col min-height-min-720px-calc-100dvh-24px max-height-min-860px-calc-100dvh-24px uv-min620:min-h-uv-e6fb97d224 uv-max619:min-h-0 uv-max619:max-height-min-88dvh-760px uv-max619:padding-bottom-env-safe-area-inset-bottom">
                <header className="conjugation-header flex items-start justify-between gap-4 padding-18px-18px-14px border-1px-solid-border in-h2:margin-4px-0-0 in-h2:text-uv-fab62110780">
                  <div>
                    <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-uv-f78eb7000a9 letter-spacing-0p12em font-semibold">{t("word.verbReference")}</p>
                    <h2 id="conjugation-title">
                      {query.data?.data.lemma
                        ? t("word.conjugateLemma", {
                            lemma: query.data.data.lemma,
                          })
                        : t("word.conjugation")}
                    </h2>
                  </div>
                  <button
                    className="icon-button w-11 h-11 grid place-items-center border-1px-solid-border-2 rounded-uv-r233710a71e bg-uv-surface text-uv-text-soft min-height-tap-target"
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("word.closeConjugation")}
                  >
                    <X size={18} />
                  </button>
                </header>

                {query.isPending ? (
                  <div className="conjugation-state flex-1 flex flex-col justify-center gap-3 p-6 in-span-2:text-uv-text-muted" role="status">
                    <div className="skeleton skeleton-title rounded-uv-r933cc73310 bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite width-min-88pct-560px h-13.5" />
                    <div className="skeleton skeleton-card bg-linear-gradient-90deg-hex-16161a-25pct-hex-202026-50pct-hex bg-200pct-100pct animation-shimmer-1p4s-infinite h-28 rounded-uv-r02a0a889dd" />
                    <span>{t("word.generatingConjugation")}</span>
                  </div>
                ) : null}

                {query.isError ? (
                  <div className="conjugation-state flex-1 flex flex-col justify-center gap-3 p-6 in-span-2:text-uv-text-muted" role="alert">
                    <strong>{t("word.conjugationUnavailable")}</strong>
                    <span>
                      {query.error instanceof Error
                        ? query.error.message
                        : t("word.conjugationError")}
                    </span>
                    <button
                      className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target"
                      type="button"
                      onClick={() => query.refetch()}
                    >
                      <RefreshCcw size={16} /> {t("word.retry")}
                    </button>
                  </div>
                ) : null}

                {query.data ? (
                  <>
                    <div className="conjugation-meta flex flex-wrap gap-1.5 padding-12px-18px-0 in-span:padding-5px-8px in-span:border-1px-solid-border-2 in-span:rounded-uv-red9ab892c5 in-span:text-uv-text-muted in-span:text-uv-ff051c59395">
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
                      className="conjugation-tabs flex gap-1.5 overflow-x-auto padding-12px-18px border-1px-solid-border in-button-3:min-h-12 in-button-3:flex-0-0-auto in-button-3:flex in-button-3:flex-col in-button-3:justify-center in-button-3:gap-0.5 in-button-3:padding-7px-11px in-button-3:border-1px-solid-border-2 in-button-3:rounded-uv-r4bd46d4017 in-button-3:bg-uv-surface-raised in-button-3:text-uv-text-soft in-button-3:cursor-pointer in-button-small:text-uv-text-muted in-button-small:text-uv-ff13a2a157c in-button-is-active:border-uv-primary in-button-is-active:bg-uv-cbdfd7cd038 in-button-is-active:text-uv-text"
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
                      className="conjugation-content flex-1 overflow-auto p-4.5"
                      role="tabpanel"
                      aria-live="polite"
                    >
                      {active === "imperative" ? (
                        <div className="conjugation-reference-grid grid grid-template-columns-1fr gap-2.25 in-div:flex in-div:flex-col in-div:gap-1 in-div:p-3.25 in-div:border-1px-solid-border-2 in-div:rounded-uv-r0939007802 in-div:bg-uv-surface-raised in-span:text-uv-text-muted in-span:text-uv-ff051c59395 in-p-2:grid-column-1-1-2 in-p-2:text-uv-text-soft in-p-2:line-height-1p55 uv-min620:grid-template-columns-repeat-2-minmax-0-1fr-2">
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
                        <div className="conjugation-reference-grid grid grid-template-columns-1fr gap-2.25 in-div:flex in-div:flex-col in-div:gap-1 in-div:p-3.25 in-div:border-1px-solid-border-2 in-div:rounded-uv-r0939007802 in-div:bg-uv-surface-raised in-span:text-uv-text-muted in-span:text-uv-ff051c59395 in-p-2:grid-column-1-1-2 in-p-2:text-uv-text-soft in-p-2:line-height-1p55 uv-min620:grid-template-columns-repeat-2-minmax-0-1fr-2">
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
                          <div className="conjugation-tense-heading flex flex-col gap-1.25 mb-3 in-span:text-uv-text-muted in-span:text-uv-fb0a544cd05 in-span:line-height-1p5">
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
                          <table className="conjugation-table w-full border-collapse in-th:padding-13px-10px in-th:border-1px-solid-border in-th:text-left in-td:padding-13px-10px in-td:border-1px-solid-border in-td:text-left in-thead-th:text-uv-text-muted in-thead-th:text-uv-ff73364d9bf in-thead-th:font-550 in-tbody-th:width-32pct in-tbody-th:text-uv-text-muted in-tbody-th:font-550 in-tbody-td:text-uv-f19feeb881c in-tbody-td:font-620 uv-max619:in-th:padding-12px-6px uv-max619:in-td:padding-12px-6px">
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
