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
    <main className="onboarding-page">
      <section className="onboarding-shell panel">
        <div className="onboarding-progress" aria-label={t("onboarding.progress", { step, total: ONBOARDING_STEP_COUNT })}>
          <span>{t("onboarding.step", { step, total: ONBOARDING_STEP_COUNT })}</span>
          <div className="onboarding-progress-track">
            <span style={{ width: (step / ONBOARDING_STEP_COUNT) * 100 + "%" }} />
          </div>
        </div>

        {step === 1 ? (
          <div className="onboarding-step">
            <p className="eyebrow">{t("onboarding.welcomeEyebrow")}</p>
            <h1>{t("onboarding.welcomeTitle")}</h1>
            <p className="page-description">{t("onboarding.welcomeBody")}</p>
            <fieldset className="onboarding-options">
              <legend>{t("onboarding.uiLanguage")}</legend>
              {(["en", "fa"] as UiLocale[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={"onboarding-option " + (selectedLocale === value ? "is-selected" : "")}
                  onClick={() => setSelectedLocale(value)}
                  aria-pressed={selectedLocale === value}
                >
                  <strong>{value === "en" ? "English" : "فارسی"}</strong>
                  {selectedLocale === value ? <Check size={18} /> : null}
                </button>
              ))}
            </fieldset>
            <button
              className="button button-primary onboarding-continue"
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
          <div className="onboarding-step">
            <p className="eyebrow">{t("onboarding.courseEyebrow")}</p>
            <h1>{t("onboarding.courseTitle")}</h1>
            <p className="page-description">{t("onboarding.courseBody")}</p>
            <div className="onboarding-options">
              {enabledLanguages.map((language) => (
                <button
                  key={language}
                  type="button"
                  className={"onboarding-option " + (selectedLanguage === language ? "is-selected" : "")}
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
          <div className="onboarding-step">
            <p className="eyebrow">{t("onboarding.currentEyebrow")}</p>
            <h1>{t("onboarding.currentTitle")}</h1>
            <p className="page-description">{t("onboarding.currentBody")}</p>
            <div className="onboarding-level-grid">
              {CEFR_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={"onboarding-level " + (selectedCurrent === level ? "is-selected" : "")}
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
            <p className="muted">{t("onboarding.levelEstimate")}</p>
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
          <div className="onboarding-step">
            <p className="eyebrow">{t("onboarding.targetEyebrow")}</p>
            <h1>{t("onboarding.targetTitle")}</h1>
            <p className="page-description">{t("onboarding.targetBody")}</p>
            <div className="onboarding-level-grid">
              {validTargets.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={"onboarding-level " + (selectedTarget === level ? "is-selected" : "")}
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
          <div className="onboarding-step">
            <p className="eyebrow">{t("onboarding.explanationEyebrow")}</p>
            <h1>{t("onboarding.explanationTitle")}</h1>
            <p className="page-description">{t("onboarding.explanationBody")}</p>
            <div className="onboarding-options">
              {([
                ["ENGLISH", t("common.english")],
                ["PERSIAN", t("common.persian")],
                ["BOTH", t("common.englishPersian")],
              ] as Array<[TranslationLanguage, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={"onboarding-option " + (selectedExplanation === value ? "is-selected" : "")}
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
          <div className="onboarding-step">
            <p className="eyebrow">{t("onboarding.loopEyebrow")}</p>
            <h1>{t("onboarding.loopTitle")}</h1>
            <p className="page-description">{t("onboarding.loopBody")}</p>
            <div className="onboarding-loop">
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
          <div className="onboarding-step onboarding-finish">
            <div className="onboarding-finish-icon"><MessageCircle size={24} /></div>
            <p className="eyebrow">{t("onboarding.readyEyebrow")}</p>
            <h1>{t("onboarding.readyTitle")}</h1>
            <p className="page-description">{t("onboarding.readyBody")}</p>
            <button
              className="button button-primary onboarding-continue"
              type="button"
              disabled={pending}
              onClick={() => run(completeOnboarding)}
            >
              <Plus size={18} />
              {t("onboarding.addFirstWord")}
            </button>
            <button className="button button-secondary" type="button" disabled={pending} onClick={back}>
              {t("common.back")}
            </button>
          </div>
        ) : null}

        {error ? <p className="status-notice error" role="alert">{error}</p> : null}
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
    <div className="onboarding-controls">
      <button type="button" className="button button-secondary" onClick={back} disabled={pending}>
        {backLabel}
      </button>
      <button type="button" className="button button-primary" onClick={next} disabled={pending}>
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
    <div className="onboarding-loop-item">
      <span className="onboarding-loop-icon">{icon}</span>
      <span className="onboarding-loop-number">{number}</span>
      <strong>{text}</strong>
    </div>
  );
}
