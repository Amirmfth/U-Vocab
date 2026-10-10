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
    <aside className="first-use-guide panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 grid uv-grid-template-columns-738a8da05d uv-gap-19feeb881c items-start uv-margin-bottom-19feeb881c uv-max640:uv-grid-template-columns-7089a0cef9 rounded-uv-r6d27d54c6c" aria-labelledby={guideId + "-title"}>
      <div className="first-use-guide-icon grid uv-place-items-305047e96e w-9.5 h-9.5 rounded-uv-r0939007802 bg-uv-c687589579d" aria-hidden="true">
        <Info size={20} />
      </div>
      <div className="first-use-guide-copy grid uv-gap-d091e560be uv-vb19eb067c9:m-0 uv-vb19eb067c9:text-uv-c7dbd63a13e uv-v10010674ad:m-0 uv-v10010674ad:text-uv-c7dbd63a13e uv-v10010674ad:uv-padding-inline-start-6d7755962e">
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
        className="button button-secondary first-use-guide-dismiss w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-max640:uv-grid-column-93b665dfb5 uv-max640:w-full uv-max640:justify-center uv-v33c878f16d:border-current uv-min-height-e45618b383"
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
