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
    <div className="import-workspace flex flex-col gap-3.5 w-full max-w-uv-d1f4d3e141">
      <div className="import-tabs flex gap-1 p-1 w-fit rounded-uv-r0939007802 bg-uv-surface-raised border-1px-solid-border-2 in-button-3:padding-8px-18px in-button-3:border-0 in-button-3:rounded-uv-r22be94e0a1 in-button-3:bg-transparent in-button-3:text-uv-text-muted in-button-3:cursor-pointer in-button-aria-selected-true:bg-uv-surface in-button-aria-selected-true:text-uv-text in-button-aria-selected-true:box-shadow-0-1px-4px-rgb-0-0-0-0p12" role="tablist" aria-label={t("vocab.add.input")}>
        <button type="button" role="tab" aria-selected={tab === "text"} onClick={() => setTab("text")} disabled={processing}>{t("vocab.add.text")}</button>
        <button type="button" role="tab" aria-selected={tab === "csv"} onClick={() => setTab("csv")} disabled={processing}>{t("vocab.add.csv")}</button>
      </div>

      {tab === "text" ? (
        <form action={previewAction} className="form-panel w-full max-w-uv-74487d394e">
          <div className="field flex flex-col gap-2 in-label:text-uv-text-soft in-label:text-uv-f845cf53f3a in-label:font-560">
            <textarea id="text" name="text" placeholder={t("vocab.add.textPlaceholder")} lang="de" dir="ltr" rows={8} autoComplete="off" required disabled={processing} />
          </div>
          {preview.status === "error" ? <StatusNotice tone="error">{preview.message}</StatusNotice> : null}
          <ActionButton pendingLabel={t("vocab.add.analyzing")} disabled={processing}><ScanText size={18} /> {t("vocab.add.analyze")}</ActionButton>
        </form>
      ) : (
        <div className="form-panel w-full max-w-uv-74487d394e">
          <textarea id="csv-words" value={csvText} onChange={(event) => updateCsv(event.target.value)} placeholder={t("vocab.add.csvPlaceholder")} lang="de" dir="ltr" rows={6} disabled={processing} />
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="import-file-input hidden" aria-label={t("vocab.add.uploadAria")} onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) updateCsv(await file.text());
            event.target.value = "";
          }} />
          <button type="button" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" onClick={() => fileRef.current?.click()} disabled={processing}><Upload size={17} /> {t("vocab.add.upload")}</button>
        </div>
      )}

      {rows.length > 0 ? (
        <section className="panel import-preview border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 flex flex-col gap-3.5 rounded-uv-r6d27d54c6c">
          <div className="import-preview-head flex flex-col gap-1.25 in-h2:margin-3px-0-0 in-h2:text-uv-f19feeb881c in-h2:letter-spacing-0p02em-2 uv-min760:flex-row uv-min760:items-center uv-min760:justify-between">
            <h2>{tab === "csv" ? t("vocab.add.words", { count: formatNumber(locale, rows.length) }) : preview.message}</h2>
            <span className="muted text-uv-text-muted">{t("vocab.add.select")}</span>
          </div>
          {importError ? <StatusNotice tone="error">{importError}</StatusNotice> : null}
          <div className="import-list flex flex-col border-1px-solid-border-3">
            {rows.map((row) => {
              const status = statuses[row.key];
              return (
                <label className={`import-row grid grid-template-columns-auto-minmax-0-1fr-2 gap-3 items-start padding-14px-0 border-1px-solid-border cursor-pointer in-input-2:w-4.5 in-input-2:h-4.5 in-input-2:min-h-auto in-input-2:margin-3px-0-0${status?.state === "saved" ? " import-row--saved px-3 rounded-uv-r933cc73310 bg-uv-cecaca9698c cursor-default" : ""}`} key={row.key}>
                  {status?.state === "loading" ? <LoaderCircle className="import-row-spinner flex-none animation-import-spin-0p8s-linear-infinite" size={20} aria-label={t("vocab.add.adding")} />
                    : status?.state === "saved" ? <Check className="import-row-check text-uv-ccbecfd37ca mt-0.5" size={20} aria-label={t("vocab.add.added")} />
                      : <input type="checkbox" checked={selected.has(row.key)} onChange={() => toggle(row.key)} disabled={processing} />}
                  <div className="import-row-copy min-w-0 flex flex-col gap-1.25 in-span-2:text-uv-text-muted in-span-2:text-uv-fe9d5fd6635 in-span-2:line-height-1p45 in-small-2:text-uv-text-muted in-small-2:text-uv-fe9d5fd6635 in-small-2:line-height-1p45">
                    <div className="word-meta flex flex-wrap gap-1.75 items-center">
                      <strong className="learning-content" lang="de" dir="ltr">{row.label}</strong>
                      {row.candidate ? (
                        <>
                          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{row.candidate.partOfSpeech}</span>
                          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{row.candidate.cefrLevel}</span>
                          <span className="badge min-h-6.5 inline-flex items-center padding-0-9px border-1px-solid-border-2 rounded-uv-red9ab892c5 text-uv-text-soft bg-uv-surface-raised font-font-geist-mono-geist-mono-monospace text-uv-fe22288a701 letter-spacing-0p02em">{row.candidate.userVocabularyId ? t("vocab.add.inVocabulary") : t("vocab.add.new")}</span>
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
                    {status?.state === "error" ? <small className="optimistic-error width-min-100pct-760px mx-auto grid grid-template-columns-20px-minmax-0-1fr-auto items-center gap-2.25 padding-10px-12px border-1px-solid-rgb-239-91-91-0p35 rounded-uv-r233710a71e bg-uv-c4aa6e841de text-uv-text-soft text-uv-f63777cce16 in-svg:text-uv-danger in-text-button:min-h-9 uv-max480:grid-template-columns-20px-minmax-0-1fr uv-max480:in-text-button:grid-column-2 uv-max480:in-text-button:justify-self-start">{status.message}</small> : null}
                  </div>
                </label>
              );
            })}
          </div>
          <button className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" type="button" onClick={addSelected} disabled={processing || remaining === 0}>
            {processing ? <LoaderCircle className="import-row-spinner flex-none animation-import-spin-0p8s-linear-infinite" size={18} /> : <Check size={18} />}
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
