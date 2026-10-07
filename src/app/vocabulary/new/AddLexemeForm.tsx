"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, ScanText, Upload } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { germanWordListKey, parseWordList } from "@/lib/ingestion/word-list";
import type { CandidateWithState } from "@/lib/ingestion/types";
import { addVocabularyItem, analyzeVocabularyBatch, finishVocabularyImport, previewVocabularyText, type VocabularyPreviewState } from "./actions";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";

type RowStatus = { state: "loading" | "saved" | "error"; message?: string };
type PreviewRow = { key: string; label: string; candidate?: CandidateWithState };
const previewInitial: VocabularyPreviewState = { status: "idle" };

export function AddLexemeForm({ translationPreference }: {
  translationPreference: "ENGLISH" | "PERSIAN" | "BOTH";
}) {
  const [tab, setTab] = useState<"text" | "csv">("text");
  const [preview, previewAction] = useActionState(previewVocabularyText, previewInitial);
  const [csvText, setCsvText] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const [processing, setProcessing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const csvWords = parseWordList(csvText);
  const textCandidates = preview.candidates ?? [];
  const { locale, t } = useI18n();

  useEffect(() => {
    setSelected(new Set((preview.candidates ?? []).filter((item) => !item.userVocabularyId).map((item) => `text:${item.key}`)));
    setStatuses({});
  }, [preview.candidates]);

  function updateCsv(value: string) {
    const words = parseWordList(value);
    const previousKeys = new Set(parseWordList(csvText).map((word) => `csv:${germanWordListKey(word)}`));
    const keys = words.map((word) => `csv:${germanWordListKey(word)}`);
    setCsvText(value);
    setSelected((current) => new Set(keys.filter((key) => !previousKeys.has(key) || current.has(key))));
    setStatuses((current) => Object.fromEntries(keys.filter((key) => current[key]).map((key) => [key, current[key]])));
  }

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setRowStatus(key: string, status: RowStatus) {
    setStatuses((current) => ({ ...current, [key]: status }));
  }

  function addSelected() {
    if (processing) return;
    const csvJobs = csvWords.map((word) => ({ key: `csv:${germanWordListKey(word)}`, word }))
      .filter((job) => selected.has(job.key) && statuses[job.key]?.state !== "saved");
    const textJobs = textCandidates.map((candidate) => ({ key: `text:${candidate.key}`, candidate }))
      .filter((job) => selected.has(job.key) && statuses[job.key]?.state !== "saved");
    if (tab === "csv" ? !csvJobs.length : !textJobs.length) return;

    setImportError(null);
    setProcessing(true);
    void (async () => {
      async function save(key: string, input: Parameters<typeof addVocabularyItem>[0]) {
        setRowStatus(key, { state: "loading" });
        try {
          const result = await addVocabularyItem({ ...input, deferRevalidation: true });
          setRowStatus(key, result.status === "success"
            ? { state: "saved" }
            : { state: "error", message: result.message });
          return result.status === "success" ? result.lexemeId : null;
        } catch (error) {
          setRowStatus(key, {
            state: "error",
            message: error instanceof Error ? error.message : t("vocab.add.wordError"),
          });
          return null;
        }
      }

      if (tab === "csv") {
        const batches = Array.from({ length: Math.ceil(csvJobs.length / 8) }, (_, index) => csvJobs.slice(index * 8, index * 8 + 8));
        let nextBatch = 0;
        async function batchWorker() {
          while (nextBatch < batches.length) {
            const batch = batches[nextBatch++];
            const savedIds: string[] = [];
            batch.forEach((job) => setRowStatus(job.key, { state: "loading" }));
            let analyzed: Awaited<ReturnType<typeof analyzeVocabularyBatch>>;
            try {
              analyzed = await analyzeVocabularyBatch(batch.map((job) => job.word));
            } catch {
              analyzed = { status: "error", message: t("vocab.add.batchError") };
            }
            const candidates = analyzed.status === "success"
              ? new Map(analyzed.results.map((result) => [result.index, result.candidate]))
              : new Map();
            let nextSave = 0;
            async function saveWorker() {
              while (nextSave < batch.length) {
                const index = nextSave++;
                const candidate = candidates.get(index);
                const id = await save(batch[index].key, candidate ? { candidate } : { word: batch[index].word });
                if (id) savedIds.push(id);
              }
            }
            await Promise.all(Array.from({ length: Math.min(2, batch.length) }, () => saveWorker()));
            if (savedIds.length) {
              await finishVocabularyImport(savedIds);
              window.dispatchEvent(new Event("u-vocab:review-count-changed"));
            }
          }
        }
        await Promise.all(Array.from({ length: Math.min(2, batches.length) }, () => batchWorker()));
      } else {
        let nextIndex = 0;
        const savedIds: string[] = [];
        async function worker() {
          while (nextIndex < textJobs.length) {
            const job = textJobs[nextIndex++];
            const id = await save(job.key, { candidate: job.candidate });
            if (id) savedIds.push(id);
          }
        }
        await Promise.all(Array.from({ length: Math.min(3, textJobs.length) }, () => worker()));
        if (savedIds.length) {
          await finishVocabularyImport(savedIds);
          window.dispatchEvent(new Event("u-vocab:review-count-changed"));
        }
      }
    })().catch((error) => {
      setImportError(error instanceof Error ? error.message : t("vocab.add.importError"));
    }).finally(() => setProcessing(false));
  }

  const rows: PreviewRow[] = tab === "csv"
    ? csvWords.map((word) => ({ key: `csv:${germanWordListKey(word)}`, label: word }))
    : textCandidates.map((candidate) => ({ key: `text:${candidate.key}`, label: formatLexemeLabel(candidate), candidate }));
  const remaining = rows.filter((row) => selected.has(row.key) && statuses[row.key]?.state !== "saved").length;

  return (
    <div className="import-workspace [display:flex] [flex-direction:column] [gap:14px] [width:100%] [max-width:820px]">
      <div className="import-tabs [display:flex] [gap:4px] [padding:4px] [width:fit-content] [border-radius:12px] [background:var(--surface-raised)] [border:1px_solid_var(--border)] [&_button]:[padding:8px_18px] [&_button]:[border:0] [&_button]:[border-radius:9px] [&_button]:[background:transparent] [&_button]:[color:var(--text-muted)] [&_button]:[cursor:pointer] [&_button[aria-selected=true]]:[background:var(--surface)] [&_button[aria-selected=true]]:[color:var(--text)] [&_button[aria-selected=true]]:[box-shadow:0_1px_4px_rgba(0,_0,_0,_0.12)]" role="tablist" aria-label={t("vocab.add.input")}>
        <button type="button" role="tab" aria-selected={tab === "text"} onClick={() => setTab("text")} disabled={processing}>{t("vocab.add.text")}</button>
        <button type="button" role="tab" aria-selected={tab === "csv"} onClick={() => setTab("csv")} disabled={processing}>{t("vocab.add.csv")}</button>
      </div>

      {tab === "text" ? (
        <form action={previewAction} className="form-panel [width:100%] [max-width:680px]">
          <div className="field [display:flex] [flex-direction:column] [gap:8px] [&_label]:[color:var(--text-soft)] [&_label]:[font-size:0.83rem] [&_label]:[font-weight:560]">
            <textarea id="text" name="text" placeholder={t("vocab.add.textPlaceholder")} lang="de" dir="ltr" rows={8} autoComplete="off" required disabled={processing} />
          </div>
          {preview.status === "error" ? <StatusNotice tone="error">{preview.message}</StatusNotice> : null}
          <ActionButton pendingLabel={t("vocab.add.analyzing")} disabled={processing}><ScanText size={18} /> {t("vocab.add.analyze")}</ActionButton>
        </form>
      ) : (
        <div className="form-panel [width:100%] [max-width:680px]">
          <textarea id="csv-words" value={csvText} onChange={(event) => updateCsv(event.target.value)} placeholder={t("vocab.add.csvPlaceholder")} lang="de" dir="ltr" rows={6} disabled={processing} />
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="import-file-input [display:none]" aria-label={t("vocab.add.uploadAria")} onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) updateCsv(await file.text());
            event.target.value = "";
          }} />
          <button type="button" className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" onClick={() => fileRef.current?.click()} disabled={processing}><Upload size={17} /> {t("vocab.add.upload")}</button>
        </div>
      )}

      {rows.length > 0 ? (
        <section className="panel import-preview [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [display:flex] [flex-direction:column] [gap:14px] [border-radius:18px]">
          <div className="import-preview-head [display:flex] [flex-direction:column] [gap:5px] [&_h2]:[margin:3px_0_0] [&_h2]:[font-size:1rem] [&_h2]:[letter-spacing:-0.02em] min-[760px]:[flex-direction:row] min-[760px]:[align-items:center] min-[760px]:[justify-content:space-between]">
            <h2>{tab === "csv" ? t("vocab.add.words", { count: formatNumber(locale, rows.length) }) : preview.message}</h2>
            <span className="muted [color:var(--text-muted)]">{t("vocab.add.select")}</span>
          </div>
          {importError ? <StatusNotice tone="error">{importError}</StatusNotice> : null}
          <div className="import-list [display:flex] [flex-direction:column] [border-top:1px_solid_var(--border)]">
            {rows.map((row) => {
              const status = statuses[row.key];
              return (
                <label className={`import-row [display:grid] [grid-template-columns:auto_minmax(0,_1fr)] [gap:12px] [align-items:start] [padding:14px_0] [border-bottom:1px_solid_var(--border)] [cursor:pointer] [&_>_input]:[width:18px] [&_>_input]:[height:18px] [&_>_input]:[min-height:auto] [&_>_input]:[margin:3px_0_0]${status?.state === "saved" ? " import-row--saved [padding-inline:12px] [border-radius:10px] [background:rgba(47,_160,_102,_0.12)] [cursor:default]" : ""}`} key={row.key}>
                  {status?.state === "loading" ? <LoaderCircle className="import-row-spinner [flex:none] [animation:import-spin_0.8s_linear_infinite]" size={20} aria-label={t("vocab.add.adding")} />
                    : status?.state === "saved" ? <Check className="import-row-check [color:#23965a] [margin-top:2px]" size={20} aria-label={t("vocab.add.added")} />
                      : <input type="checkbox" checked={selected.has(row.key)} onChange={() => toggle(row.key)} disabled={processing} />}
                  <div className="import-row-copy [min-width:0] [display:flex] [flex-direction:column] [gap:5px] [&_>_span]:[color:var(--text-muted)] [&_>_span]:[font-size:0.78rem] [&_>_span]:[line-height:1.45] [&_>_small]:[color:var(--text-muted)] [&_>_small]:[font-size:0.78rem] [&_>_small]:[line-height:1.45]">
                    <div className="word-meta [display:flex] [flex-wrap:wrap] [gap:7px] [align-items:center]">
                      <strong className="learning-content" lang="de" dir="ltr">{row.label}</strong>
                      {row.candidate ? (
                        <>
                          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{row.candidate.partOfSpeech}</span>
                          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{row.candidate.cefrLevel}</span>
                          <span className="badge [min-height:26px] [display:inline-flex] [align-items:center] [padding:0_9px] [border:1px_solid_var(--border)] [border-radius:999px] [color:var(--text-soft)] [background:var(--surface-raised)] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.67rem] [letter-spacing:0.02em]">{row.candidate.userVocabularyId ? t("vocab.add.inVocabulary") : t("vocab.add.new")}</span>
                        </>
                      ) : null}
                    </div>
                    {row.candidate ? (
                      <>
                        {translationPreference !== "PERSIAN" ? <span className="learning-content" lang="en" dir="ltr">{row.candidate.englishMeaning}</span> : null}
                        {translationPreference !== "ENGLISH" ? <span className="learning-content" lang="fa" dir="rtl">{row.candidate.persianMeaning}</span> : null}
                        {row.candidate.pattern ? <small className="learning-content" lang="de" dir="ltr">{row.candidate.pattern}</small> : null}
                      </>
                    ) : null}
                    {status?.state === "error" ? <small className="optimistic-error [width:min(100%,_760px)] [margin-inline:auto] [display:grid] [grid-template-columns:20px_minmax(0,_1fr)_auto] [align-items:center] [gap:9px] [padding:10px_12px] [border:1px_solid_rgba(239,_91,_91,_0.35)] [border-radius:13px] [background:rgba(239,_91,_91,_0.08)] [color:var(--text-soft)] [font-size:0.74rem] [&_>_svg]:[color:var(--danger)] [&_.text-button]:[min-height:36px] max-[480px]:[grid-template-columns:20px_minmax(0,_1fr)] max-[480px]:[&_.text-button]:[grid-column:2] max-[480px]:[&_.text-button]:[justify-self:start]">{status.message}</small> : null}
                  </div>
                </label>
              );
            })}
          </div>
          <button className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" type="button" onClick={addSelected} disabled={processing || remaining === 0}>
            {processing ? <LoaderCircle className="import-row-spinner [flex:none] [animation:import-spin_0.8s_linear_infinite]" size={18} /> : <Check size={18} />}
            {processing
              ? t("vocab.add.addingWords")
              : remaining
                ? t("vocab.add.addSelected", { count: formatNumber(locale, remaining) })
                : t("vocab.add.allAdded")}
          </button>
        </section>
      ) : null}
    </div>
  );
}
