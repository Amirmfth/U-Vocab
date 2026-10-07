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
    <main className="onboarding-page [min-height:100dvh] [display:grid] [place-items:center] [padding:clamp(1rem,_4vw,_3rem)] max-[640px]:[align-items:start] max-[640px]:[padding:0.75rem]">
      <section className="onboarding-shell panel [border:1px_solid_var(--border)] [background:linear-gradient(180deg,_rgba(255,255,255,0.025),_transparent),_var(--surface)] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.025)] [padding:18px] [width:min(100%,_720px)] [display:grid] [gap:1.5rem] max-[640px]:[border-radius:18px] [border-radius:18px]">
        <div className="onboarding-progress [display:grid] [gap:0.6rem] [font-size:0.82rem] [color:var(--muted)]" aria-label={t("onboarding.progress", { step, total: ONBOARDING_STEP_COUNT })}>
          <span>{t("onboarding.step", { step, total: ONBOARDING_STEP_COUNT })}</span>
          <div className="onboarding-progress-track [height:6px] [overflow:hidden] [border-radius:999px] [background:var(--surface-strong,_rgba(255,_255,_255,_0.08))] [&_>_span]:[display:block] [&_>_span]:[height:100%] [&_>_span]:[border-radius:inherit] [&_>_span]:[background:currentColor] [&_>_span]:[transition:width_180ms_ease] motion-reduce:[&_>_span]:[transition:none]">
            <span style={{ width: (step / ONBOARDING_STEP_COUNT) * 100 + "%" }} />
          </div>
        </div>

        {step === 1 ? (
          <div className="onboarding-step [display:grid] [gap:1.25rem]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("onboarding.welcomeEyebrow")}</p>
            <h1>{t("onboarding.welcomeTitle")}</h1>
            <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">{t("onboarding.welcomeBody")}</p>
            <fieldset className="onboarding-options [display:grid] [gap:0.75rem] [border:0] [padding:0] [margin:0] [&_legend]:[margin-bottom:0.75rem] [&_legend]:[font-weight:700]">
              <legend>{t("onboarding.uiLanguage")}</legend>
              {(["en", "fa"] as UiLocale[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={"onboarding-option [width:100%] [min-height:64px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface)] [color:inherit] [text-align:start] [padding:0.9rem_1rem] [display:flex] [align-items:center] [justify-content:space-between] [gap:1rem] [cursor:pointer] [&:hover]:[border-color:var(--foreground)] [&:focus-visible]:[border-color:var(--foreground)] [&.is-selected]:[border-color:var(--foreground)] [&_small]:[display:block] [&_small]:[margin-top:0.2rem] [&_small]:[color:var(--muted)] " + (selectedLocale === value ? "is-selected" : "")}
                  onClick={() => setSelectedLocale(value)}
                  aria-pressed={selectedLocale === value}
                >
                  <strong>{value === "en" ? "English" : "فارسی"}</strong>
                  {selectedLocale === value ? <Check size={18} /> : null}
                </button>
              ))}
            </fieldset>
            <button
              className="button button-primary onboarding-continue [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [justify-self:end] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
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
          <div className="onboarding-step [display:grid] [gap:1.25rem]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("onboarding.courseEyebrow")}</p>
            <h1>{t("onboarding.courseTitle")}</h1>
            <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">{t("onboarding.courseBody")}</p>
            <div className="onboarding-options [display:grid] [gap:0.75rem] [border:0] [padding:0] [margin:0] [&_legend]:[margin-bottom:0.75rem] [&_legend]:[font-weight:700]">
              {enabledLanguages.map((language) => (
                <button
                  key={language}
                  type="button"
                  className={"onboarding-option [width:100%] [min-height:64px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface)] [color:inherit] [text-align:start] [padding:0.9rem_1rem] [display:flex] [align-items:center] [justify-content:space-between] [gap:1rem] [cursor:pointer] [&:hover]:[border-color:var(--foreground)] [&:focus-visible]:[border-color:var(--foreground)] [&.is-selected]:[border-color:var(--foreground)] [&_small]:[display:block] [&_small]:[margin-top:0.2rem] [&_small]:[color:var(--muted)] " + (selectedLanguage === language ? "is-selected" : "")}
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
          <div className="onboarding-step [display:grid] [gap:1.25rem]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("onboarding.currentEyebrow")}</p>
            <h1>{t("onboarding.currentTitle")}</h1>
            <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">{t("onboarding.currentBody")}</p>
            <div className="onboarding-level-grid [display:grid] [gap:0.75rem] [border:0] [padding:0] [margin:0] [grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[640px]:[grid-template-columns:1fr]">
              {CEFR_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={"onboarding-level [width:100%] [min-height:64px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface)] [color:inherit] [text-align:start] [padding:0.9rem_1rem] [display:flex] [gap:1rem] [cursor:pointer] [&:hover]:[border-color:var(--foreground)] [&:focus-visible]:[border-color:var(--foreground)] [&.is-selected]:[border-color:var(--foreground)] [align-items:flex-start] [justify-content:flex-start] [&_strong]:[min-width:2.25rem] [&_strong]:[font-size:1.1rem] [&_span]:[color:var(--muted)] [&_span]:[line-height:1.35] " + (selectedCurrent === level ? "is-selected" : "")}
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
            <p className="muted [color:var(--text-muted)]">{t("onboarding.levelEstimate")}</p>
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
          <div className="onboarding-step [display:grid] [gap:1.25rem]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("onboarding.targetEyebrow")}</p>
            <h1>{t("onboarding.targetTitle")}</h1>
            <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">{t("onboarding.targetBody")}</p>
            <div className="onboarding-level-grid [display:grid] [gap:0.75rem] [border:0] [padding:0] [margin:0] [grid-template-columns:repeat(2,_minmax(0,_1fr))] max-[640px]:[grid-template-columns:1fr]">
              {validTargets.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={"onboarding-level [width:100%] [min-height:64px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface)] [color:inherit] [text-align:start] [padding:0.9rem_1rem] [display:flex] [gap:1rem] [cursor:pointer] [&:hover]:[border-color:var(--foreground)] [&:focus-visible]:[border-color:var(--foreground)] [&.is-selected]:[border-color:var(--foreground)] [align-items:flex-start] [justify-content:flex-start] [&_strong]:[min-width:2.25rem] [&_strong]:[font-size:1.1rem] [&_span]:[color:var(--muted)] [&_span]:[line-height:1.35] " + (selectedTarget === level ? "is-selected" : "")}
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
          <div className="onboarding-step [display:grid] [gap:1.25rem]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("onboarding.explanationEyebrow")}</p>
            <h1>{t("onboarding.explanationTitle")}</h1>
            <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">{t("onboarding.explanationBody")}</p>
            <div className="onboarding-options [display:grid] [gap:0.75rem] [border:0] [padding:0] [margin:0] [&_legend]:[margin-bottom:0.75rem] [&_legend]:[font-weight:700]">
              {([
                ["ENGLISH", t("common.english")],
                ["PERSIAN", t("common.persian")],
                ["BOTH", t("common.englishPersian")],
              ] as Array<[TranslationLanguage, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={"onboarding-option [width:100%] [min-height:64px] [border:1px_solid_var(--border)] [border-radius:14px] [background:var(--surface)] [color:inherit] [text-align:start] [padding:0.9rem_1rem] [display:flex] [align-items:center] [justify-content:space-between] [gap:1rem] [cursor:pointer] [&:hover]:[border-color:var(--foreground)] [&:focus-visible]:[border-color:var(--foreground)] [&.is-selected]:[border-color:var(--foreground)] [&_small]:[display:block] [&_small]:[margin-top:0.2rem] [&_small]:[color:var(--muted)] " + (selectedExplanation === value ? "is-selected" : "")}
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
          <div className="onboarding-step [display:grid] [gap:1.25rem]">
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("onboarding.loopEyebrow")}</p>
            <h1>{t("onboarding.loopTitle")}</h1>
            <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">{t("onboarding.loopBody")}</p>
            <div className="onboarding-loop [display:grid] [gap:0.65rem]">
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
          <div className="onboarding-step onboarding-finish [display:grid] [gap:1.25rem] [text-align:start]">
            <div className="onboarding-finish-icon [display:inline-grid] [place-items:center] [width:40px] [height:40px] [border-radius:12px] [background:var(--surface-strong,_rgba(255,_255,_255,_0.08))]"><MessageCircle size={24} /></div>
            <p className="eyebrow [color:var(--text-muted)] [margin:0] [font-family:var(--font-geist-mono),_Geist_Mono,_monospace] [font-size:0.68rem] [letter-spacing:0.12em] [font-weight:600]">{t("onboarding.readyEyebrow")}</p>
            <h1>{t("onboarding.readyTitle")}</h1>
            <p className="page-description [margin:0] [max-width:680px] [color:var(--text-soft)] [font-size:0.98rem] [line-height:1.65]">{t("onboarding.readyBody")}</p>
            <button
              className="button button-primary onboarding-continue [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [justify-self:end] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]"
              type="button"
              disabled={pending}
              onClick={() => run(completeOnboarding)}
            >
              <Plus size={18} />
              {t("onboarding.addFirstWord")}
            </button>
            <button className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" type="button" disabled={pending} onClick={back}>
              {t("common.back")}
            </button>
          </div>
        ) : null}

        {error ? <p className="status-notice error [display:flex] [align-items:flex-start] [gap:10px] [padding:13px_14px] [border:1px_solid_var(--border)] [border-radius:14px] [font-size:0.86rem] [line-height:1.5]" role="alert">{error}</p> : null}
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
    <div className="onboarding-controls [display:flex] [justify-content:space-between] [gap:0.75rem]">
      <button type="button" className="button button-secondary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [&.button-primary]:[color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" onClick={back} disabled={pending}>
        {backLabel}
      </button>
      <button type="button" className="button button-primary [width:100%] [display:inline-flex] [align-items:center] [justify-content:center] [gap:9px] [padding:0_16px] [border:1px_solid_transparent] [border-radius:14px] [font-weight:600] [font-size:0.9rem] [cursor:pointer] [transition:transform_150ms_ease,_border-color_150ms_ease,_background_150ms_ease,_opacity_150ms_ease] [&:active:not(:disabled)]:[transform:scale(0.985)] [&:disabled]:[opacity:0.58] [&:disabled]:[cursor:wait] [&.button-primary]:[background:var(--text)] [background:var(--text)] [&.button-primary]:[color:#101014] [color:#101014] [&.button-secondary]:[background:var(--surface-raised)] [&.button-secondary]:[border-color:var(--border)] [&.button-secondary]:[color:var(--text)] [&.button-success]:[background:var(--success)] [&.button-success]:[color:#07140e] [&.button-danger]:[background:var(--danger)] [&.button-danger]:[color:#19070a] min-[940px]:[width:auto] [&.button-danger]:[border-color:currentColor] [min-height:var(--tap-target)]" onClick={next} disabled={pending}>
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
    <div className="onboarding-loop-item [display:grid] [grid-template-columns:auto_auto_1fr] [align-items:center] [gap:0.75rem] [padding:0.8rem_0] [border-bottom:1px_solid_var(--border)] [&:last-child]:[border-bottom:0]">
      <span className="onboarding-loop-icon [display:inline-grid] [place-items:center] [width:40px] [height:40px] [border-radius:12px] [background:var(--surface-strong,_rgba(255,_255,_255,_0.08))]">{icon}</span>
      <span className="onboarding-loop-number [color:var(--muted)] [font-variant-numeric:tabular-nums]">{number}</span>
      <strong>{text}</strong>
    </div>
  );
}
