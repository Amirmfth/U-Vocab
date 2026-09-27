"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, ScanText, Upload } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import { parseWordList } from "@/lib/ingestion/word-list";
import type { CandidateWithState } from "@/lib/ingestion/types";
import { addVocabularyItem, analyzeVocabularyBatch, finishVocabularyImport, previewVocabularyText, type VocabularyPreviewState } from "./actions";

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
            message: error instanceof Error ? error.message : "Could not add this word.",
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
              analyzed = { status: "error", message: "Batch analysis failed." };
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
      setImportError(error instanceof Error ? error.message : "Could not finish the import. Saved words remain in your vocabulary.");
    }).finally(() => setProcessing(false));
  }

  const rows: PreviewRow[] = tab === "csv"
    ? csvWords.map((word) => ({ key: `csv:${word.toLocaleLowerCase("de-DE")}`, label: word }))
    : textCandidates.map((candidate) => ({ key: `text:${candidate.key}`, label: formatLexemeLabel(candidate), candidate }));
  const remaining = rows.filter((row) => selected.has(row.key) && statuses[row.key]?.state !== "saved").length;

  return (
    <div className="import-workspace">
      <div className="import-tabs" role="tablist" aria-label="Vocabulary input">
        <button type="button" role="tab" aria-selected={tab === "text"} onClick={() => setTab("text")} disabled={processing}>Text</button>
        <button type="button" role="tab" aria-selected={tab === "csv"} onClick={() => setTab("csv")} disabled={processing}>CSV</button>
      </div>

      {tab === "text" ? (
        <form action={previewAction} className="form-panel">
          <div className="field">
            <textarea id="text" name="text" placeholder="Paste a word, phrase, email, article, or transcript in German…" rows={8} autoComplete="off" required disabled={processing} />
          </div>
          {preview.status === "error" ? <StatusNotice tone="error">{preview.message}</StatusNotice> : null}
          <ActionButton pendingLabel="Analyzing text…" disabled={processing}><ScanText size={18} /> Analyze text</ActionButton>
        </form>
      ) : (
        <div className="form-panel">
          <textarea id="csv-words" value={csvText} onChange={(event) => updateCsv(event.target.value)} placeholder="Haus,gehen,sich erinnern,…" rows={6} disabled={processing} />
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="import-file-input" aria-label="Upload CSV word list" onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) updateCsv(await file.text());
            event.target.value = "";
          }} />
          <button type="button" className="button button-secondary" onClick={() => fileRef.current?.click()} disabled={processing}><Upload size={17} /> Upload CSV file</button>
        </div>
      )}

      {rows.length > 0 ? (
        <section className="panel import-preview">
          <div className="import-preview-head">
            <h2>{tab === "csv" ? `${rows.length} words` : preview.message}</h2>
            <span className="muted">Select what to add</span>
          </div>
          {importError ? <StatusNotice tone="error">{importError}</StatusNotice> : null}
          <div className="import-list">
            {rows.map((row) => {
              const status = statuses[row.key];
              return (
                <label className={`import-row${status?.state === "saved" ? " import-row--saved" : ""}`} key={row.key}>
                  {status?.state === "loading" ? <LoaderCircle className="import-row-spinner" size={20} aria-label="Adding" />
                    : status?.state === "saved" ? <Check className="import-row-check" size={20} aria-label="Added" />
                      : <input type="checkbox" checked={selected.has(row.key)} onChange={() => toggle(row.key)} disabled={processing} />}
                  <div className="import-row-copy">
                    <div className="word-meta">
                      <strong>{row.label}</strong>
                      {row.candidate ? (
                        <>
                          <span className="badge">{row.candidate.partOfSpeech}</span>
                          <span className="badge">{row.candidate.cefrLevel}</span>
                          <span className="badge">{row.candidate.userVocabularyId ? "in vocabulary" : "new"}</span>
                        </>
                      ) : null}
                    </div>
                    {row.candidate ? (
                      <>
                        {translationPreference !== "PERSIAN" ? <span>{row.candidate.englishMeaning}</span> : null}
                        {translationPreference !== "ENGLISH" ? <span className="rtl">{row.candidate.persianMeaning}</span> : null}
                        {row.candidate.pattern ? <small>{row.candidate.pattern}</small> : null}
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
            {processing ? "Adding words…" : remaining ? `Add ${remaining} selected` : "All selected words added"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
