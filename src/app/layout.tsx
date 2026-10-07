import "./globals.css";
import "@/i18n/fonts.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { Metadata, Viewport } from "next";
import { AppNavigation } from "@/components/app-navigation";
import { PageTransition } from "@/components/page-transition";
import { OnboardingGuard } from "@/components/onboarding-guard";
import { WebVitals } from "@/components/web-vitals";
import { QueryProvider } from "@/components/query-provider";
import { I18nProvider } from "@/i18n/client";
import { createTranslator } from "@/i18n/core";
import { localeDocumentAttributes } from "@/i18n/config";
import { resolveUiLocale } from "@/i18n/server";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { isAppAuthenticated } from "@/lib/auth";
import { onboardingComplete } from "@/lib/onboarding";
import { db } from "@/lib/db";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ObservabilityIdentity } from "@/components/observability-identity";
import { getEffectivePlan } from "@/lib/entitlements/service";
import { PwaManager } from "@/components/pwa-manager";

export const metadata: Metadata = {
  title: { default: "U-Vocab", template: "%s · U-Vocab" },
  description: "Your personal German lexical knowledge system",
  manifest: "/manifest.webmanifest",
  applicationName: "U-Vocab",
  appleWebApp: {
    capable: true,
    title: "U-Vocab",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await isAppAuthenticated();
  const user = authenticated ? await getCurrentUser() : null;
  const course = user ? await getCurrentCourse() : null;
  const effectivePlan = user ? await getEffectivePlan(user.id) : null;
  const onboardingDone = user ? onboardingComplete(user) : true;
  const locale = await resolveUiLocale(user);
  const documentAttributes = localeDocumentAttributes(locale);
  const t = createTranslator(locale);
  const initialDueCount = course && onboardingDone ? await db.userVocabulary.count({
    where: {
      userCourseId: course.id,
      OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: new Date() } }],
    },
  }) : null;

  return (
    <html
      lang={documentAttributes.lang}
      dir={documentAttributes.dir}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <I18nProvider locale={locale}>
          <a className="skip-link [position:fixed] [z-index:200] [top:max(10px,_env(safe-area-inset-top))] [left:12px] [padding:10px_13px] [border:1px_solid_var(--border-strong)] [border-radius:12px] [background:var(--text)] [color:var(--bg)] [font-size:0.8rem] [font-weight:700] [transform:translateY(-160%)] [transition:transform_140ms_ease] [&:focus]:[transform:translateY(0)]" href="#main-content">
            {t("layout.skipToContent")}
          </a>
          {authenticated ? <WebVitals /> : null}
          {user ? <OnboardingGuard complete={onboardingDone} /> : null}
          {user ? (
            <ObservabilityIdentity
              userId={user.id}
              courseId={course?.id ?? null}
              plan={effectivePlan?.plan ?? "FREE"}
              uiLocale={locale}
              targetLanguage={course?.targetLanguage ?? null}
            />
          ) : null}
          {user && course && onboardingDone ? (
            <AppNavigation
              translationPreference={course.explanationLanguage}
              initialDueCount={initialDueCount}
            />
          ) : null}
          <QueryProvider>
            <div
              id="main-content"
              tabIndex={-1}
              className={authenticated ? "app-shell [width:100%] [max-width:1180px] [margin:0_auto] [padding:calc(72px_+_env(safe-area-inset-top))_16px_calc(104px_+_env(safe-area-inset-bottom))] min-[620px]:[padding-inline:24px] min-[940px]:[padding:28px_36px_64px]" : "auth-shell [min-height:100dvh] [width:100%]"}
            >
              <PageTransition>{children}</PageTransition>
            </div>
          </QueryProvider>
          <PwaManager />
        </I18nProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
