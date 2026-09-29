"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, ScanText, Upload } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { parseWordList } from "@/lib/ingestion/word-list";
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
    const previousKeys = new Set(parseWordList(csvText).map((word) => `csv:${word.toLocaleLowerCase("de-DE")}`));
    const keys = words.map((word) => `csv:${word.toLocaleLowerCase("de-DE")}`);
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
    const csvJobs = csvWords.map((word) => ({ key: `csv:${word.toLocaleLowerCase("de-DE")}`, word }))
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
    ? csvWords.map((word) => ({ key: `csv:${word.toLocaleLowerCase("de-DE")}`, label: word }))
    : textCandidates.map((candidate) => ({ key: `text:${candidate.key}`, label: formatLexemeLabel(candidate), candidate }));
  const remaining = rows.filter((row) => selected.has(row.key) && statuses[row.key]?.state !== "saved").length;

  return (
    <div className="import-workspace">
      <div className="import-tabs" role="tablist" aria-label={t("vocab.add.input")}>
        <button type="button" role="tab" aria-selected={tab === "text"} onClick={() => setTab("text")} disabled={processing}>{t("vocab.add.text")}</button>
        <button type="button" role="tab" aria-selected={tab === "csv"} onClick={() => setTab("csv")} disabled={processing}>{t("vocab.add.csv")}</button>
      </div>

      {tab === "text" ? (
        <form action={previewAction} className="form-panel">
          <div className="field">
            <textarea id="text" name="text" placeholder={t("vocab.add.textPlaceholder")} lang="de" dir="ltr" rows={8} autoComplete="off" required disabled={processing} />
          </div>
          {preview.status === "error" ? <StatusNotice tone="error">{preview.message}</StatusNotice> : null}
          <ActionButton pendingLabel={t("vocab.add.analyzing")} disabled={processing}><ScanText size={18} /> {t("vocab.add.analyze")}</ActionButton>
        </form>
      ) : (
        <div className="form-panel">
          <textarea id="csv-words" value={csvText} onChange={(event) => updateCsv(event.target.value)} placeholder={t("vocab.add.csvPlaceholder")} lang="de" dir="ltr" rows={6} disabled={processing} />
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="import-file-input" aria-label={t("vocab.add.uploadAria")} onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) updateCsv(await file.text());
            event.target.value = "";
          }} />
          <button type="button" className="button button-secondary" onClick={() => fileRef.current?.click()} disabled={processing}><Upload size={17} /> {t("vocab.add.upload")}</button>
        </div>
      )}

      {rows.length > 0 ? (
        <section className="panel import-preview">
          <div className="import-preview-head">
            <h2>{tab === "csv" ? t("vocab.add.words", { count: formatNumber(locale, rows.length) }) : preview.message}</h2>
            <span className="muted">{t("vocab.add.select")}</span>
          </div>
          {importError ? <StatusNotice tone="error">{importError}</StatusNotice> : null}
          <div className="import-list">
            {rows.map((row) => {
              const status = statuses[row.key];
              return (
                <label className={`import-row${status?.state === "saved" ? " import-row--saved" : ""}`} key={row.key}>
                  {status?.state === "loading" ? <LoaderCircle className="import-row-spinner" size={20} aria-label={t("vocab.add.adding")} />
                    : status?.state === "saved" ? <Check className="import-row-check" size={20} aria-label={t("vocab.add.added")} />
                      : <input type="checkbox" checked={selected.has(row.key)} onChange={() => toggle(row.key)} disabled={processing} />}
                  <div className="import-row-copy">
                    <div className="word-meta">
                      <strong className="learning-content" lang="de" dir="ltr">{row.label}</strong>
                      {row.candidate ? (
                        <>
                          <span className="badge">{row.candidate.partOfSpeech}</span>
                          <span className="badge">{row.candidate.cefrLevel}</span>
                          <span className="badge">{row.candidate.userVocabularyId ? t("vocab.add.inVocabulary") : t("vocab.add.new")}</span>
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
                    {status?.state === "error" ? <small className="optimistic-error">{status.message}</small> : null}
                  </div>
                </label>
              );
            })}
          </div>
          <button className="button button-primary" type="button" onClick={addSelected} disabled={processing || remaining === 0}>
            {processing ? <LoaderCircle className="import-row-spinner" size={18} /> : <Check size={18} />}
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
