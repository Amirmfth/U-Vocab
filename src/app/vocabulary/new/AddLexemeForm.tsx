"use client";

import { useActionState, useMemo } from "react";
import { Check, ScanText } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { StatusNotice } from "@/components/status-notice";
import { formatLexemeLabel } from "@/lib/lexeme-display";
import {
  addSelectedVocabulary,
  previewVocabularyText,
  type VocabularyCommitState,
  type VocabularyPreviewState,
} from "./actions";

const previewInitial: VocabularyPreviewState = { status: "idle" };
const commitInitial: VocabularyCommitState = { status: "idle" };

export function AddLexemeForm({
  translationPreference,
}: {
  translationPreference: "ENGLISH" | "PERSIAN" | "BOTH";
}) {
  const [preview, previewAction] = useActionState(
    previewVocabularyText,
    previewInitial,
  );
  const [commit, commitAction] = useActionState(
    addSelectedVocabulary,
    commitInitial,
  );
  const payload = useMemo(
    () => JSON.stringify(preview.candidates ?? []),
    [preview.candidates],
  );

  return (
    <div className="import-workspace">
      <form action={previewAction} className="form-panel">
        <div className="field">
          <label htmlFor="text">German vocabulary or text</label>
          <textarea
            id="text"
            name="text"
            placeholder="Paste a word, phrase, email, article, or transcript in German…"
            rows={8}
            autoComplete="off"
            required
          />
          <p className="form-help">Paste one word for a focused lookup, or a longer text to extract useful vocabulary.</p>
        </div>

        {preview.status === "error" ? (
          <StatusNotice tone="error">{preview.message}</StatusNotice>
        ) : null}

        <ActionButton pendingLabel="Analyzing text…">
          <ScanText size={18} />
          Analyze text
        </ActionButton>
      </form>

      {preview.status === "success" && preview.candidates?.length ? (
        <form action={commitAction} className="panel import-preview">
          <input type="hidden" name="payload" value={payload} />

          <div className="import-preview-head">
            <div>
              <p className="eyebrow">SUGGESTIONS</p>
              <h2>{preview.message}</h2>
            </div>
            <span className="muted">Select what to add</span>
          </div>

          <div className="import-list">
            {preview.candidates.map((candidate) => (
              <label className="import-row" key={candidate.key}>
                <input
                  defaultChecked={!candidate.userVocabularyId}
                  name="selectedKeys"
                  type="checkbox"
                  value={candidate.key}
                />
                <div className="import-row-copy">
                  <div className="word-meta">
                    <strong>{formatLexemeLabel(candidate)}</strong>
                    <span className="badge">{candidate.partOfSpeech}</span>
                    <span className="badge">
                      {candidate.userVocabularyId
                        ? candidate.state?.toLowerCase()
                        : candidate.existingLexemeId
                          ? "known lexeme"
                          : "new"}
                    </span>
                  </div>
                  {translationPreference !== "PERSIAN" ? (
                    <span>{candidate.englishMeaning}</span>
                  ) : null}
                  {translationPreference !== "ENGLISH" ? (
                    <span className="rtl">{candidate.persianMeaning}</span>
                  ) : null}
                  {candidate.pattern ? (
                    <small>{candidate.pattern}</small>
                  ) : null}
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
