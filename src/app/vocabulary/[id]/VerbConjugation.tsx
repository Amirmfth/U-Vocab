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
        className="word-quick-action-button [appearance:none] [display:inline-flex] [align-items:center] [justify-content:center] [gap:7px] [min-height:44px] [padding:0_11px] [border:1px_solid_var(--border)] [border-radius:12px] [background:var(--surface-raised)] [color:var(--text-soft)] [cursor:pointer] [font:inherit] [font-size:.82rem] [font-weight:620] [&:active]:[transform:scale(.97)]"
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
            className="conjugation-overlay [position:fixed] [z-index:100] [inset:0] [display:flex] [align-items:center] [justify-content:center] [padding:12px] max-[619px]:[align-items:flex-end] max-[619px]:[padding:0]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="conjugation-title"
          >
            <motion.button
              aria-label={t("word.closeConjugation")}
              className="conjugation-backdrop [position:absolute] [inset:0] [border:0] [background:rgba(0,0,0,.72)] [backdrop-filter:blur(5px)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              type="button"
              onClick={() => setOpen(false)}
            />
            <motion.section
              className="conjugation-panel [position:relative] [width:min(940px,_100%)] [max-height:min(860px,_calc(100dvh_-_24px))] [overflow:hidden] [overscroll-behavior:contain] [border:1px_solid_var(--border-strong)] [border-radius:22px] [background:var(--surface)] [color:var(--text)] [box-shadow:var(--shadow)] max-[619px]:[width:100%] max-[619px]:[max-height:min(88dvh,_760px)] max-[619px]:[border-bottom:0] max-[619px]:[border-radius:26px_26px_0_0]"
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
              <div className="conjugation-sheet-handle [display:none] max-[619px]:[display:block] max-[619px]:[width:38px] max-[619px]:[height:4px] max-[619px]:[margin:10px_auto_0] max-[619px]:[border-radius:999px] max-[619px]:[background:var(--border-strong)]" aria-hidden="true" />
              <div className="conjugation-shell [display:flex] [flex-direction:column] [min-height:min(720px,_calc(100dvh_-_24px))] [max-height:min(860px,_calc(100dvh_-_24px))] min-[620px]:[min-height:640px] max-[619px]:[min-height:0] max-[619px]:[max-height:min(88dvh,_760px)] max-[619px]:[padding-bottom:env(safe-area-inset-bottom)]">
                <header className="conjugation-header [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:16px] [padding:18px_18px_14px] [border-bottom:1px_solid_var(--border)] [&_h2]:[margin:4px_0_0] [&_h2]:[font-size:1.45rem]">
                  <div>
                    <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("word.verbReference")}</p>
                    <h2 id="conjugation-title">
                      {query.data?.data.lemma
                        ? t("word.conjugateLemma", {
                            lemma: query.data.data.lemma,
                          })
                        : t("word.conjugation")}
                    </h2>
                  </div>
                  <button
                    className="icon-button [width:44px] [height:44px] [display:grid] [place-items:center] [border:1px_solid_var(--border)] [border-radius:13px] [background:var(--surface)] [color:var(--text-soft)] [min-height:var(--tap-target)]"
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("word.closeConjugation")}
                  >
                    <X size={18} />
                  </button>
                </header>

                {query.isPending ? (
                  <div className="conjugation-state [flex:1] [display:flex] [flex-direction:column] [justify-content:center] [gap:12px] [padding:24px] [&_>_span]:[color:var(--text-muted)]" role="status">
                    <div className="skeleton skeleton-title [border-radius:10px] [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [width:min(88%,_560px)] [height:54px]" />
                    <div className="skeleton skeleton-card [background:linear-gradient(90deg,_#16161a_25%,_#202026_50%,_#16161a_75%)] [background-size:200%_100%] [animation:shimmer_1.4s_infinite] [height:112px] [border-radius:var(--radius-lg)]" />
                    <span>{t("word.generatingConjugation")}</span>
                  </div>
                ) : null}

                {query.isError ? (
                  <div className="conjugation-state [flex:1] [display:flex] [flex-direction:column] [justify-content:center] [gap:12px] [padding:24px] [&_>_span]:[color:var(--text-muted)]" role="alert">
                    <strong>{t("word.conjugationUnavailable")}</strong>
                    <span>
                      {query.error instanceof Error
                        ? query.error.message
                        : t("word.conjugationError")}
                    </span>
                    <button
                      className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
                      type="button"
                      onClick={() => query.refetch()}
                    >
                      <RefreshCcw size={16} /> {t("word.retry")}
                    </button>
                  </div>
                ) : null}

                {query.data ? (
                  <>
                    <div className="conjugation-meta [display:flex] [flex-wrap:wrap] [gap:6px] [padding:12px_18px_0] [&_span]:[padding:5px_8px] [&_span]:[border:1px_solid_var(--border)] [&_span]:[border-radius:999px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:.68rem]">
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
                      className="conjugation-tabs [display:flex] [gap:6px] [overflow-x:auto] [padding:12px_18px] [border-bottom:1px_solid_var(--border)] [&_button]:[min-height:48px] [&_button]:[flex:0_0_auto] [&_button]:[display:flex] [&_button]:[flex-direction:column] [&_button]:[justify-content:center] [&_button]:[gap:2px] [&_button]:[padding:7px_11px] [&_button]:[border:1px_solid_var(--border)] [&_button]:[border-radius:11px] [&_button]:[background:var(--surface-raised)] [&_button]:[color:var(--text-soft)] [&_button]:[cursor:pointer] [&_button_small]:[color:var(--text-muted)] [&_button_small]:[font-size:.62rem] [&_button.is-active]:[border-color:var(--primary)] [&_button.is-active]:[background:var(--primary-soft)] [&_button.is-active]:[color:var(--text)]"
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
                      className="conjugation-content [flex:1] [overflow:auto] [padding:18px]"
                      role="tabpanel"
                      aria-live="polite"
                    >
                      {active === "imperative" ? (
                        <div className="conjugation-reference-grid [display:grid] [grid-template-columns:1fr] [gap:9px] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:4px] [&_>_div]:[padding:13px] [&_>_div]:[border:1px_solid_var(--border)] [&_>_div]:[border-radius:12px] [&_>_div]:[background:var(--surface-raised)] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:.68rem] [&_p]:[grid-column:1/-1] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.55] min-[620px]:[grid-template-columns:repeat(2,minmax(0,1fr))]">
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
                        <div className="conjugation-reference-grid [display:grid] [grid-template-columns:1fr] [gap:9px] [&_>_div]:[display:flex] [&_>_div]:[flex-direction:column] [&_>_div]:[gap:4px] [&_>_div]:[padding:13px] [&_>_div]:[border:1px_solid_var(--border)] [&_>_div]:[border-radius:12px] [&_>_div]:[background:var(--surface-raised)] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:.68rem] [&_p]:[grid-column:1/-1] [&_p]:[color:var(--text-soft)] [&_p]:[line-height:1.55] min-[620px]:[grid-template-columns:repeat(2,minmax(0,1fr))]">
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
                          <div className="conjugation-tense-heading [display:flex] [flex-direction:column] [gap:5px] [margin-bottom:12px] [&_span]:[color:var(--text-muted)] [&_span]:[font-size:.76rem] [&_span]:[line-height:1.5]">
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
                          <table className="conjugation-table [width:100%] [border-collapse:collapse] [&_th]:[padding:13px_10px] [&_th]:[border-bottom:1px_solid_var(--border)] [&_th]:[text-align:left] [&_td]:[padding:13px_10px] [&_td]:[border-bottom:1px_solid_var(--border)] [&_td]:[text-align:left] [&_thead_th]:[color:var(--text-muted)] [&_thead_th]:[font-size:.7rem] [&_thead_th]:[font-weight:550] [&_tbody_th]:[width:32%] [&_tbody_th]:[color:var(--text-muted)] [&_tbody_th]:[font-weight:550] [&_tbody_td]:[font-size:1rem] [&_tbody_td]:[font-weight:620] max-[619px]:[&_th]:[padding:12px_6px] max-[619px]:[&_td]:[padding:12px_6px]">
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
