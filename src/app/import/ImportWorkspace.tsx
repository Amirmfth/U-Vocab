"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, FileSpreadsheet, ScanText, Type } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { ActivitySelect } from "@/components/ui/activity-select";
import {
  confirmImport,
  previewImport,
  type ImportCommitState,
  type ImportPreviewState,
} from "./actions";

const previewInitial: ImportPreviewState = { status: "idle" };
const commitInitial: ImportCommitState = { status: "idle" };

const sourceOptions = [
  { value: "MANUAL", label: "Word or phrase", description: "Analyze one German lexical unit" },
  { value: "PASTED_TEXT", label: "Pasted text", description: "Extract useful lexical units" },
  { value: "CSV", label: "CSV", description: "Import a spreadsheet export" },
];

export function ImportWorkspace({
  translationPreference,
}: {
  translationPreference: "ENGLISH" | "PERSIAN" | "BOTH";
}) {
  const [sourceType, setSourceType] = useState("MANUAL");
  const [preview, previewAction] = useActionState(previewImport, previewInitial);
  const [commit, commitAction] = useActionState(confirmImport, commitInitial);

  const payload = useMemo(
    () => JSON.stringify(preview.candidates ?? []),
    [preview.candidates],
  );

  return (
    <div className="import-workspace">
      <form action={previewAction} className="panel form-panel">
        <div className="field">
          <label htmlFor="sourceType-trigger">Source</label>
          <ActivitySelect
            id="sourceType"
            name="sourceType"
            defaultValue="MANUAL"
            options={sourceOptions}
            onValueChange={setSourceType}
          />
        </div>

        {sourceType === "MANUAL" ? (
          <div className="field">
            <label htmlFor="manual">German word or phrase</label>
            <input
              id="manual"
              name="manual"
              placeholder="sich um eine Stelle bewerben"
              autoComplete="off"
            />
          </div>
        ) : null}

        {sourceType === "PASTED_TEXT" ? (
          <div className="field">
            <label htmlFor="text">German text</label>
            <textarea
              id="text"
              name="text"
              rows={10}
              placeholder="Paste an article, email, transcript, or other German text…"
            />
          </div>
        ) : null}

        {sourceType === "CSV" ? (
          <>
            <div className="field">
              <label htmlFor="csvFile">CSV file</label>
              <input id="csvFile" name="csvFile" type="file" accept=".csv,text/csv" />
            </div>
            <div className="field">
              <label htmlFor="csvText">Or paste CSV</label>
              <textarea
                id="csvText"
                name="csvText"
                rows={6}
                placeholder={"german,english,persian,pos\nEntscheidung,decision,تصمیم,NOUN"}
              />
            </div>
          </>
        ) : null}

        {preview.status === "error" ? (
          <StatusNotice tone="error">{preview.message}</StatusNotice>
        ) : null}

        <ActionButton pendingLabel="Analyzing…">
          {sourceType === "MANUAL" ? <Type size={18} /> : sourceType === "CSV" ? <FileSpreadsheet size={18} /> : <ScanText size={18} />}
          Preview import
        </ActionButton>
      </form>

      {preview.status === "success" && preview.candidates?.length ? (
        <form action={commitAction} className="panel import-preview">
          <input type="hidden" name="sourceType" value={preview.sourceType} />
          <input type="hidden" name="payload" value={payload} />

          <div className="import-preview-head">
            <div>
              <p className="eyebrow">PREVIEW</p>
              <h2>{preview.message}</h2>
            </div>
            <span className="muted">Select what to add</span>
          </div>

          <div className="import-list">
            {preview.candidates.map((candidate) => (
              <label className="import-row" key={candidate.key}>
                <input
                  type="checkbox"
                  name="selectedKeys"
                  value={candidate.key}
                  defaultChecked={!candidate.userVocabularyId}
                />
                <div className="import-row-copy">
                  <div className="word-meta">
                    <strong>
                      {candidate.article ? candidate.article + " " : ""}
                      {candidate.lemma}
                    </strong>
                    <span className="badge">{candidate.partOfSpeech}</span>
                    <span className="badge">
                      {candidate.userVocabularyId ? candidate.state?.toLowerCase() : candidate.existingLexemeId ? "known lexeme" : "new"}
                    </span>
                  </div>
{translationPreference !== "PERSIAN" ? (
                    <span>{candidate.englishMeaning}</span>
                  ) : null}
                  {translationPreference !== "ENGLISH" ? (
                    <span className="rtl">{candidate.persianMeaning}</span>
                  ) : null}
                  {candidate.pattern ? <small>{candidate.pattern}</small> : null}
                </div>
              </label>
            ))}
          </div>

          {commit.status === "success" ? (
            <StatusNotice tone="success">
              <Check size={17} />
              {commit.message}
            </StatusNotice>
          ) : null}
          {commit.status === "error" ? (
            <StatusNotice tone="error">{commit.message}</StatusNotice>
          ) : null}

          <ActionButton pendingLabel="Adding selected vocabulary…">
            <Check size={18} />
            Add selected
          </ActionButton>
        </form>
      ) : null}
    </div>
  );
}
