"use client";

import { useEffect, useState, useTransition } from "react";
import { Info, X } from "lucide-react";
import { dismissGuide, markGuideSeen } from "./first-use-guide-actions";

export function FirstUseGuide({
  guideId,
  version,
  title,
  description,
  items = [],
  dismissLabel,
}: {
  guideId: string;
  version: number;
  title: string;
  description: string;
  items?: string[];
  dismissLabel: string;
}) {
  const [visible, setVisible] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void markGuideSeen(guideId, version);
  }, [guideId, version]);

  if (!visible) return null;

  return (
    <aside className="first-use-guide panel" aria-labelledby={guideId + "-title"}>
      <div className="first-use-guide-icon" aria-hidden="true">
        <Info size={20} />
      </div>
      <div className="first-use-guide-copy">
        <strong id={guideId + "-title"}>{title}</strong>
        <p>{description}</p>
        {items.length ? (
          <ul>
            {items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        ) : null}
      </div>
      <button
        type="button"
        className="button button-secondary first-use-guide-dismiss"
        disabled={pending}
        onClick={() => {
          setVisible(false);
          startTransition(() => {
            void dismissGuide(guideId, version);
          });
        }}
      >
        <X size={17} />
        {dismissLabel}
      </button>
    </aside>
  );
}
