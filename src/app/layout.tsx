import "./globals.css";
import "./core-experience.css";
import "./core-learning-polish.css";
import "./grammar.css";
import "@/i18n/fonts.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { Viewport } from "next";
import { AppNavigation } from "@/components/app-navigation";
import { PageTransition } from "@/components/page-transition";
import { WebVitals } from "@/components/web-vitals";
import { QueryProvider } from "@/components/query-provider";
import { I18nProvider } from "@/i18n/client";
import { createTranslator } from "@/i18n/core";
import { localeDocumentAttributes } from "@/i18n/config";
import { resolveUiLocale } from "@/i18n/server";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentCourse } from "@/lib/current-course";
import { isAppAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: { default: "U-Vocab", template: "%s · U-Vocab" },
  description: "Your personal German lexical knowledge system",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await isAppAuthenticated();
  const user = authenticated ? await getCurrentUser() : null;
  const course = user ? await getCurrentCourse() : null;
  const locale = await resolveUiLocale(user);
  const documentAttributes = localeDocumentAttributes(locale);
  const t = createTranslator(locale);
  const initialDueCount = course ? await db.userVocabulary.count({
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
          <a className="skip-link" href="#main-content">
            {t("layout.skipToContent")}
          </a>
          {authenticated ? <WebVitals /> : null}
          {user && course ? (
            <AppNavigation
              translationPreference={course.explanationLanguage}
              initialDueCount={initialDueCount}
            />
          ) : null}
          <QueryProvider>
            <div
              id="main-content"
              tabIndex={-1}
              className={authenticated ? "app-shell" : "auth-shell"}
            >
              <PageTransition>{children}</PageTransition>
            </div>
          </QueryProvider>
        </I18nProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
