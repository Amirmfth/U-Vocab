"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  CefrLevel,
  TargetLanguage,
  TranslationLanguage,
} from "@prisma/client";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  GraduationCap,
  MessageCircle,
  Plus,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n/core";
import type { UiLocale } from "@/i18n/config";
import { CEFR_LEVELS, CEFR_RANK } from "@/lib/grammar/levels";
import { ONBOARDING_STEP_COUNT } from "@/lib/onboarding";
import { targetLanguageConfig } from "@/lib/languages";
import {
  completeOnboarding,
  finishCoreLoopStep,
  recordOnboardingStarted,
  saveOnboardingCourse,
  saveOnboardingCurrentLevel,
  saveOnboardingExplanation,
  saveOnboardingLocale,
  saveOnboardingTargetLevel,
  setOnboardingStep,
} from "./actions";

const levelKeys: Record<CefrLevel, MessageKey> = {
  A1: "onboarding.level.a1",
  A2: "onboarding.level.a2",
  B1: "onboarding.level.b1",
  B2: "onboarding.level.b2",
  C1: "onboarding.level.c1",
  C2: "onboarding.level.c2",
};

export function OnboardingWizard({
  initialStep,
  initialLocale,
  targetLanguage,
  currentLevel,
  targetLevel,
  explanationLanguage,
  enabledLanguages,
}: {
  initialStep: number;
  initialLocale: UiLocale;
  targetLanguage: TargetLanguage;
  currentLevel: CefrLevel;
  targetLevel: CefrLevel;
  explanationLanguage: TranslationLanguage;
  enabledLanguages: TargetLanguage[];
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [step, setStep] = useState(initialStep);
  const [selectedLocale, setSelectedLocale] = useState<UiLocale>(initialLocale);
  const [selectedLanguage, setSelectedLanguage] = useState<TargetLanguage>(targetLanguage);
  const [selectedCurrent, setSelectedCurrent] = useState<CefrLevel>(currentLevel);
  const [selectedTarget, setSelectedTarget] = useState<CefrLevel>(targetLevel);
  const [selectedExplanation, setSelectedExplanation] =
    useState<TranslationLanguage>(explanationLanguage);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void recordOnboardingStarted();
  }, []);

  const validTargets = useMemo(
    () => CEFR_LEVELS.filter((level) => CEFR_RANK[level] >= CEFR_RANK[selectedCurrent]),
    [selectedCurrent],
  );

  function run(action: () => Promise<{ ok: boolean; step?: number; destination?: string; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? t("onboarding.error"));
        return;
      }
      if (result.step) setStep(result.step);
      if (result.destination) {
        router.replace(result.destination);
        router.refresh();
      }
    });
  }

  function back() {
    if (step <= 1 || pending) return;
    run(() => setOnboardingStep(step - 1));
  }

  const NextIcon = locale === "fa" ? ArrowLeft : ArrowRight;

  return (
    <main className="onboarding-page min-h-dvh grid place-items-center padding-clamp-1rem-4vw-3rem uv-max640:items-start uv-max640:padding-0p75rem">
      <section className="onboarding-shell panel border-1px-solid-border-2 bg-linear-gradient-180deg-rgb-255-255-255-0p025-transparent-sur box-shadow-inset-0-1px-0-rgb-255-255-255-0p025 p-4.5 width-min-100pct-720px grid gap-1p5rem uv-max640:rounded-exact-18px rounded-exact-18px">
        <div className="onboarding-progress grid gap-0p6rem text-exact-0p82rem text-uv-c7dbd63a13e" aria-label={t("onboarding.progress", { step, total: ONBOARDING_STEP_COUNT })}>
          <span>{t("onboarding.step", { step, total: ONBOARDING_STEP_COUNT })}</span>
          <div className="onboarding-progress-track h-1.5 overflow-hidden rounded-exact-999px bg-uv-c687589579d in-span-2:block in-span-2:h-full in-span-2:rounded-exact-inherit in-span-2:bg-current in-span-2:transition-width-180ms-ease motion-reduce:in-span-2:transition-none">
            <span style={{ width: (step / ONBOARDING_STEP_COUNT) * 100 + "%" }} />
          </div>
        </div>

        {step === 1 ? (
          <div className="onboarding-step grid gap-1p25rem">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("onboarding.welcomeEyebrow")}</p>
            <h1>{t("onboarding.welcomeTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">{t("onboarding.welcomeBody")}</p>
            <fieldset className="onboarding-options grid gap-0p75rem border-0 p-0 m-0 in-legend:margin-bottom-0p75rem in-legend:font-bold">
              <legend>{t("onboarding.uiLanguage")}</legend>
              {(["en", "fa"] as UiLocale[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={"onboarding-option w-full min-h-16 border-1px-solid-border-2 rounded-exact-14px bg-uv-surface text-inherit text-start padding-0p9rem-1rem flex items-center justify-between gap-1rem cursor-pointer hover:border-uv-c57ff151414 focus-visible:border-uv-c57ff151414 in-is-selected:border-uv-c57ff151414 in-small:block in-small:margin-top-0p2rem in-small:text-uv-c7dbd63a13e " + (selectedLocale === value ? "is-selected" : "")}
                  onClick={() => setSelectedLocale(value)}
                  aria-pressed={selectedLocale === value}
                >
                  <strong>{value === "en" ? "English" : "فارسی"}</strong>
                  {selectedLocale === value ? <Check size={18} /> : null}
                </button>
              ))}
            </fieldset>
            <button
              className="button button-primary onboarding-continue w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto justify-self-end in-button-danger:border-current min-height-tap-target"
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await saveOnboardingLocale(selectedLocale);
                  if (result.ok) {
                    router.refresh();
                  }
                  return result;
                })
              }
            >
              {t("common.continue")} <NextIcon size={18} />
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="onboarding-step grid gap-1p25rem">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("onboarding.courseEyebrow")}</p>
            <h1>{t("onboarding.courseTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">{t("onboarding.courseBody")}</p>
            <div className="onboarding-options grid gap-0p75rem border-0 p-0 m-0 in-legend:margin-bottom-0p75rem in-legend:font-bold">
              {enabledLanguages.map((language) => (
                <button
                  key={language}
                  type="button"
                  className={"onboarding-option w-full min-h-16 border-1px-solid-border-2 rounded-exact-14px bg-uv-surface text-inherit text-start padding-0p9rem-1rem flex items-center justify-between gap-1rem cursor-pointer hover:border-uv-c57ff151414 focus-visible:border-uv-c57ff151414 in-is-selected:border-uv-c57ff151414 in-small:block in-small:margin-top-0p2rem in-small:text-uv-c7dbd63a13e " + (selectedLanguage === language ? "is-selected" : "")}
                  onClick={() => setSelectedLanguage(language)}
                  aria-pressed={selectedLanguage === language}
                >
                  <span>
                    <strong>
                      {language === "GERMAN"
                        ? t("common.german")
                        : language === "FRENCH"
                          ? t("common.french")
                          : targetLanguageConfig(language).label}
                    </strong>
                    <small>{targetLanguageConfig(language).nativeLabel}</small>
                  </span>
                  {selectedLanguage === language ? <Check size={18} /> : null}
                </button>
              ))}
            </div>
            <OnboardingControls
              back={back}
              next={() => run(() => saveOnboardingCourse(selectedLanguage))}
              pending={pending}
              backLabel={t("common.back")}
              nextLabel={t("common.continue")}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="onboarding-step grid gap-1p25rem">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("onboarding.currentEyebrow")}</p>
            <h1>{t("onboarding.currentTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">{t("onboarding.currentBody")}</p>
            <div className="onboarding-level-grid grid gap-0p75rem border-0 p-0 m-0 grid-template-columns-repeat-2-minmax-0-1fr uv-max640:grid-template-columns-1fr">
              {CEFR_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={"onboarding-level w-full min-h-16 border-1px-solid-border-2 rounded-exact-14px bg-uv-surface text-inherit text-start padding-0p9rem-1rem flex gap-1rem cursor-pointer hover:border-uv-c57ff151414 focus-visible:border-uv-c57ff151414 in-is-selected:border-uv-c57ff151414 items-start justify-start in-strong-2:min-width-2p25rem in-strong-2:text-exact-1p1rem in-span:text-uv-c7dbd63a13e in-span:line-height-1p35 " + (selectedCurrent === level ? "is-selected" : "")}
                  onClick={() => {
                    setSelectedCurrent(level);
                    if (CEFR_RANK[selectedTarget] < CEFR_RANK[level]) setSelectedTarget(level);
                  }}
                  aria-pressed={selectedCurrent === level}
                >
                  <strong>{level}</strong>
                  <span>{t(levelKeys[level])}</span>
                </button>
              ))}
            </div>
            <p className="muted text-uv-text-muted">{t("onboarding.levelEstimate")}</p>
            <OnboardingControls
              back={back}
              next={() => run(() => saveOnboardingCurrentLevel(selectedCurrent))}
              pending={pending}
              backLabel={t("common.back")}
              nextLabel={t("common.continue")}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="onboarding-step grid gap-1p25rem">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("onboarding.targetEyebrow")}</p>
            <h1>{t("onboarding.targetTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">{t("onboarding.targetBody")}</p>
            <div className="onboarding-level-grid grid gap-0p75rem border-0 p-0 m-0 grid-template-columns-repeat-2-minmax-0-1fr uv-max640:grid-template-columns-1fr">
              {validTargets.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={"onboarding-level w-full min-h-16 border-1px-solid-border-2 rounded-exact-14px bg-uv-surface text-inherit text-start padding-0p9rem-1rem flex gap-1rem cursor-pointer hover:border-uv-c57ff151414 focus-visible:border-uv-c57ff151414 in-is-selected:border-uv-c57ff151414 items-start justify-start in-strong-2:min-width-2p25rem in-strong-2:text-exact-1p1rem in-span:text-uv-c7dbd63a13e in-span:line-height-1p35 " + (selectedTarget === level ? "is-selected" : "")}
                  onClick={() => setSelectedTarget(level)}
                  aria-pressed={selectedTarget === level}
                >
                  <strong>{level}</strong>
                  <span>{t(levelKeys[level])}</span>
                </button>
              ))}
            </div>
            <OnboardingControls
              back={back}
              next={() => run(() => saveOnboardingTargetLevel(selectedTarget))}
              pending={pending}
              backLabel={t("common.back")}
              nextLabel={t("common.continue")}
            />
          </div>
        ) : null}

        {step === 5 ? (
          <div className="onboarding-step grid gap-1p25rem">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("onboarding.explanationEyebrow")}</p>
            <h1>{t("onboarding.explanationTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">{t("onboarding.explanationBody")}</p>
            <div className="onboarding-options grid gap-0p75rem border-0 p-0 m-0 in-legend:margin-bottom-0p75rem in-legend:font-bold">
              {([
                ["ENGLISH", t("common.english")],
                ["PERSIAN", t("common.persian")],
                ["BOTH", t("common.englishPersian")],
              ] as Array<[TranslationLanguage, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={"onboarding-option w-full min-h-16 border-1px-solid-border-2 rounded-exact-14px bg-uv-surface text-inherit text-start padding-0p9rem-1rem flex items-center justify-between gap-1rem cursor-pointer hover:border-uv-c57ff151414 focus-visible:border-uv-c57ff151414 in-is-selected:border-uv-c57ff151414 in-small:block in-small:margin-top-0p2rem in-small:text-uv-c7dbd63a13e " + (selectedExplanation === value ? "is-selected" : "")}
                  onClick={() => setSelectedExplanation(value)}
                  aria-pressed={selectedExplanation === value}
                >
                  <strong>{label}</strong>
                  {selectedExplanation === value ? <Check size={18} /> : null}
                </button>
              ))}
            </div>
            <OnboardingControls
              back={back}
              next={() => run(() => saveOnboardingExplanation(selectedExplanation))}
              pending={pending}
              backLabel={t("common.back")}
              nextLabel={t("common.continue")}
            />
          </div>
        ) : null}

        {step === 6 ? (
          <div className="onboarding-step grid gap-1p25rem">
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("onboarding.loopEyebrow")}</p>
            <h1>{t("onboarding.loopTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">{t("onboarding.loopBody")}</p>
            <div className="onboarding-loop grid gap-0p65rem">
              <LoopItem icon={<Plus size={20} />} number="1" text={t("onboarding.loop.add")} />
              <LoopItem icon={<BookOpen size={20} />} number="2" text={t("onboarding.loop.learn")} />
              <LoopItem icon={<Brain size={20} />} number="3" text={t("onboarding.loop.review")} />
              <LoopItem icon={<Sparkles size={20} />} number="4" text={t("onboarding.loop.apply")} />
              <LoopItem icon={<GraduationCap size={20} />} number="5" text={t("onboarding.loop.progress")} />
            </div>
            <OnboardingControls
              back={back}
              next={() => run(finishCoreLoopStep)}
              pending={pending}
              backLabel={t("common.back")}
              nextLabel={t("common.continue")}
            />
          </div>
        ) : null}

        {step === 7 ? (
          <div className="onboarding-step onboarding-finish grid gap-1p25rem text-start">
            <div className="onboarding-finish-icon display-inline-grid place-items-center w-10 h-10 rounded-exact-12px bg-uv-c687589579d"><MessageCircle size={24} /></div>
            <p className="eyebrow text-uv-text-muted m-0 font-font-geist-mono-geist-mono-monospace text-exact-0p68rem letter-spacing-0p12em font-semibold">{t("onboarding.readyEyebrow")}</p>
            <h1>{t("onboarding.readyTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-exact-0p98rem line-height-1p65">{t("onboarding.readyBody")}</p>
            <button
              className="button button-primary onboarding-continue w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto justify-self-end in-button-danger:border-current min-height-tap-target"
              type="button"
              disabled={pending}
              onClick={() => run(completeOnboarding)}
            >
              <Plus size={18} />
              {t("onboarding.addFirstWord")}
            </button>
            <button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" type="button" disabled={pending} onClick={back}>
              {t("common.back")}
            </button>
          </div>
        ) : null}

        {error ? <p className="status-notice error flex items-start gap-2.5 padding-13px-14px border-1px-solid-border-2 rounded-exact-14px text-exact-0p86rem line-height-1p5" role="alert">{error}</p> : null}
      </section>
    </main>
  );
}

function OnboardingControls({
  back,
  next,
  pending,
  backLabel,
  nextLabel,
}: {
  back: () => void;
  next: () => void;
  pending: boolean;
  backLabel: string;
  nextLabel: string;
}) {
  return (
    <div className="onboarding-controls flex justify-between gap-0p75rem">
      <button type="button" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text in-button-primary:text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised bg-uv-surface-raised in-button-secondary:border-uv-border border-uv-border in-button-secondary:text-uv-text text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" onClick={back} disabled={pending}>
        {backLabel}
      </button>
      <button type="button" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 padding-0-16px border-1px-solid-transparent rounded-exact-14px font-semibold text-exact-0p9rem cursor-pointer transition-transform-150ms-ease-border-color-150ms-ease-backgro in-active-not-disabled:transform-scale-0p985 disabled:opacity-0p58 disabled:cursor-wait in-button-primary:bg-uv-text bg-uv-text in-button-primary:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 in-button-secondary:bg-uv-surface-raised in-button-secondary:border-uv-border in-button-secondary:text-uv-text in-button-success:bg-uv-success in-button-success:text-uv-c1667a9177b in-button-danger:bg-uv-danger in-button-danger:text-uv-cb667f4b109 uv-min940:w-auto in-button-danger:border-current min-height-tap-target" onClick={next} disabled={pending}>
        {nextLabel}
      </button>
    </div>
  );
}

function LoopItem({
  icon,
  number,
  text,
}: {
  icon: React.ReactNode;
  number: string;
  text: string;
}) {
  return (
    <div className="onboarding-loop-item grid grid-template-columns-auto-auto-1fr items-center gap-0p75rem padding-0p8rem-0 border-1px-solid-border last:border-0-3">
      <span className="onboarding-loop-icon display-inline-grid place-items-center w-10 h-10 rounded-exact-12px bg-uv-c687589579d">{icon}</span>
      <span className="onboarding-loop-number text-uv-c7dbd63a13e font-tabular-nums">{number}</span>
      <strong>{text}</strong>
    </div>
  );
}
