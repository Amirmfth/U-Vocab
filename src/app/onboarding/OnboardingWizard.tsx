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
    <main className="onboarding-page min-h-dvh grid uv-place-items-305047e96e uv-padding-79c69383af uv-max640:items-start uv-max640:uv-padding-823f1262bd">
      <section className="onboarding-shell panel uv-border-8d7f82f403 uv-background-bfb621eb09 uv-box-shadow-2853ca6bd8 p-4.5 uv-width-cfa073e553 grid uv-gap-a23d8869ee uv-max640:rounded-uv-r6d27d54c6c rounded-uv-r6d27d54c6c">
        <div className="onboarding-progress grid uv-gap-157b343c2d text-uv-fa2582d5d6e text-uv-c7dbd63a13e" aria-label={t("onboarding.progress", { step, total: ONBOARDING_STEP_COUNT })}>
          <span>{t("onboarding.step", { step, total: ONBOARDING_STEP_COUNT })}</span>
          <div className="onboarding-progress-track h-1.5 overflow-hidden rounded-uv-red9ab892c5 bg-uv-c687589579d uv-v22810335d8:block uv-v22810335d8:h-full uv-v22810335d8:rounded-uv-r3e26d67509 uv-v22810335d8:bg-current uv-v22810335d8:uv-transition-195efad8a3 motion-reduce:uv-v22810335d8:uv-transition-71f8e7976e">
            <span style={{ width: (step / ONBOARDING_STEP_COUNT) * 100 + "%" }} />
          </div>
        </div>

        {step === 1 ? (
          <div className="onboarding-step grid uv-gap-081acf2896">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("onboarding.welcomeEyebrow")}</p>
            <h1>{t("onboarding.welcomeTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">{t("onboarding.welcomeBody")}</p>
            <fieldset className="onboarding-options grid uv-gap-823f1262bd border-0 p-0 m-0 uv-v73883af7e9:uv-margin-bottom-823f1262bd uv-v73883af7e9:font-bold">
              <legend>{t("onboarding.uiLanguage")}</legend>
              {(["en", "fa"] as UiLocale[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={"onboarding-option w-full min-h-16 uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface text-inherit text-start uv-padding-780075603d flex items-center justify-between uv-gap-19feeb881c cursor-pointer hover:border-uv-c57ff151414 focus-visible:border-uv-c57ff151414 uv-v48f8f87023:border-uv-c57ff151414 uv-v982220ddd5:block uv-v982220ddd5:uv-margin-top-f3b3ec19c5 uv-v982220ddd5:text-uv-c7dbd63a13e " + (selectedLocale === value ? "is-selected" : "")}
                  onClick={() => setSelectedLocale(value)}
                  aria-pressed={selectedLocale === value}
                >
                  <strong>{value === "en" ? "English" : "فارسی"}</strong>
                  {selectedLocale === value ? <Check size={18} /> : null}
                </button>
              ))}
            </fieldset>
            <button
              className="button button-primary onboarding-continue w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-justify-self-7a92f3d263 uv-v33c878f16d:border-current uv-min-height-e45618b383"
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
          <div className="onboarding-step grid uv-gap-081acf2896">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("onboarding.courseEyebrow")}</p>
            <h1>{t("onboarding.courseTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">{t("onboarding.courseBody")}</p>
            <div className="onboarding-options grid uv-gap-823f1262bd border-0 p-0 m-0 uv-v73883af7e9:uv-margin-bottom-823f1262bd uv-v73883af7e9:font-bold">
              {enabledLanguages.map((language) => (
                <button
                  key={language}
                  type="button"
                  className={"onboarding-option w-full min-h-16 uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface text-inherit text-start uv-padding-780075603d flex items-center justify-between uv-gap-19feeb881c cursor-pointer hover:border-uv-c57ff151414 focus-visible:border-uv-c57ff151414 uv-v48f8f87023:border-uv-c57ff151414 uv-v982220ddd5:block uv-v982220ddd5:uv-margin-top-f3b3ec19c5 uv-v982220ddd5:text-uv-c7dbd63a13e " + (selectedLanguage === language ? "is-selected" : "")}
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
          <div className="onboarding-step grid uv-gap-081acf2896">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("onboarding.currentEyebrow")}</p>
            <h1>{t("onboarding.currentTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">{t("onboarding.currentBody")}</p>
            <div className="onboarding-level-grid grid uv-gap-823f1262bd border-0 p-0 m-0 uv-grid-template-columns-dd0b1a1848 uv-max640:uv-grid-template-columns-6a5c4d4d49">
              {CEFR_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={"onboarding-level w-full min-h-16 uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface text-inherit text-start uv-padding-780075603d flex uv-gap-19feeb881c cursor-pointer hover:border-uv-c57ff151414 focus-visible:border-uv-c57ff151414 uv-v48f8f87023:border-uv-c57ff151414 items-start justify-start uv-veda02a0adb:uv-min-width-f00c9397c9 uv-veda02a0adb:text-uv-f24126b21bc uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:uv-line-height-ec0a69ff34 " + (selectedCurrent === level ? "is-selected" : "")}
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
          <div className="onboarding-step grid uv-gap-081acf2896">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("onboarding.targetEyebrow")}</p>
            <h1>{t("onboarding.targetTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">{t("onboarding.targetBody")}</p>
            <div className="onboarding-level-grid grid uv-gap-823f1262bd border-0 p-0 m-0 uv-grid-template-columns-dd0b1a1848 uv-max640:uv-grid-template-columns-6a5c4d4d49">
              {validTargets.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={"onboarding-level w-full min-h-16 uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface text-inherit text-start uv-padding-780075603d flex uv-gap-19feeb881c cursor-pointer hover:border-uv-c57ff151414 focus-visible:border-uv-c57ff151414 uv-v48f8f87023:border-uv-c57ff151414 items-start justify-start uv-veda02a0adb:uv-min-width-f00c9397c9 uv-veda02a0adb:text-uv-f24126b21bc uv-v36c0309a03:text-uv-c7dbd63a13e uv-v36c0309a03:uv-line-height-ec0a69ff34 " + (selectedTarget === level ? "is-selected" : "")}
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
          <div className="onboarding-step grid uv-gap-081acf2896">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("onboarding.explanationEyebrow")}</p>
            <h1>{t("onboarding.explanationTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">{t("onboarding.explanationBody")}</p>
            <div className="onboarding-options grid uv-gap-823f1262bd border-0 p-0 m-0 uv-v73883af7e9:uv-margin-bottom-823f1262bd uv-v73883af7e9:font-bold">
              {([
                ["ENGLISH", t("common.english")],
                ["PERSIAN", t("common.persian")],
                ["BOTH", t("common.englishPersian")],
              ] as Array<[TranslationLanguage, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={"onboarding-option w-full min-h-16 uv-border-8d7f82f403 rounded-uv-rd65225386d bg-uv-surface text-inherit text-start uv-padding-780075603d flex items-center justify-between uv-gap-19feeb881c cursor-pointer hover:border-uv-c57ff151414 focus-visible:border-uv-c57ff151414 uv-v48f8f87023:border-uv-c57ff151414 uv-v982220ddd5:block uv-v982220ddd5:uv-margin-top-f3b3ec19c5 uv-v982220ddd5:text-uv-c7dbd63a13e " + (selectedExplanation === value ? "is-selected" : "")}
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
          <div className="onboarding-step grid uv-gap-081acf2896">
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("onboarding.loopEyebrow")}</p>
            <h1>{t("onboarding.loopTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">{t("onboarding.loopBody")}</p>
            <div className="onboarding-loop grid uv-gap-2311a7d95c">
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
          <div className="onboarding-step onboarding-finish grid uv-gap-081acf2896 text-start">
            <div className="onboarding-finish-icon uv-display-c5d9aaf66e uv-place-items-305047e96e w-10 h-10 rounded-uv-r0939007802 bg-uv-c687589579d"><MessageCircle size={24} /></div>
            <p className="eyebrow text-uv-text-muted m-0 uv-font-family-320794573f text-uv-f78eb7000a9 uv-letter-spacing-fb52455c07 font-semibold">{t("onboarding.readyEyebrow")}</p>
            <h1>{t("onboarding.readyTitle")}</h1>
            <p className="page-description m-0 max-w-uv-74487d394e text-uv-text-soft text-uv-fde89c2b680 uv-line-height-cf9a155f4a">{t("onboarding.readyBody")}</p>
            <button
              className="button button-primary onboarding-continue w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-justify-self-7a92f3d263 uv-v33c878f16d:border-current uv-min-height-e45618b383"
              type="button"
              disabled={pending}
              onClick={() => run(completeOnboarding)}
            >
              <Plus size={18} />
              {t("onboarding.addFirstWord")}
            </button>
            <button className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" type="button" disabled={pending} onClick={back}>
              {t("common.back")}
            </button>
          </div>
        ) : null}

        {error ? <p className="status-notice error flex items-start gap-2.5 uv-padding-e93fc48d3c uv-border-8d7f82f403 rounded-uv-rd65225386d text-uv-f9601fe81a7 uv-line-height-aa8f289ebe" role="alert">{error}</p> : null}
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
    <div className="onboarding-controls flex justify-between uv-gap-823f1262bd">
      <button type="button" className="button button-secondary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised bg-uv-surface-raised uv-vd08a54826e:border-uv-border border-uv-border uv-vd08a54826e:text-uv-text text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" onClick={back} disabled={pending}>
        {backLabel}
      </button>
      <button type="button" className="button button-primary w-full inline-flex items-center justify-center gap-2.25 uv-padding-14a564f8da uv-border-bdc43f584d rounded-uv-rd65225386d font-semibold text-uv-fee84419642 cursor-pointer uv-transition-be50aec0a8 uv-v823f0b002f:uv-transform-bcd93e0f45 disabled:uv-opacity-8ecc5701b7 disabled:cursor-wait uv-vb179ff5bf5:bg-uv-text bg-uv-text uv-vb179ff5bf5:text-uv-cfcbfb23a40 text-uv-cfcbfb23a40 uv-vd08a54826e:bg-uv-surface-raised uv-vd08a54826e:border-uv-border uv-vd08a54826e:text-uv-text uv-ve5986489c0:bg-uv-success uv-ve5986489c0:text-uv-c1667a9177b uv-v33c878f16d:bg-uv-danger uv-v33c878f16d:text-uv-cb667f4b109 uv-min940:w-auto uv-v33c878f16d:border-current uv-min-height-e45618b383" onClick={next} disabled={pending}>
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
    <div className="onboarding-loop-item grid uv-grid-template-columns-b217d8572e items-center uv-gap-823f1262bd uv-padding-918906a922 uv-border-bottom-8d7f82f403 last:uv-border-bottom-b6589fc6ab">
      <span className="onboarding-loop-icon uv-display-c5d9aaf66e uv-place-items-305047e96e w-10 h-10 rounded-uv-r0939007802 bg-uv-c687589579d">{icon}</span>
      <span className="onboarding-loop-number text-uv-c7dbd63a13e uv-font-variant-numeric-3032cae0ba">{number}</span>
      <strong>{text}</strong>
    </div>
  );
}
