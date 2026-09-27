import "./globals.css";
import "./core-experience.css";
import "./core-learning-polish.css";
import "./grammar.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { Viewport } from "next";
import { AppNavigation } from "@/components/app-navigation";
import { PageTransition } from "@/components/page-transition";
import { WebVitals } from "@/components/web-vitals";
import { QueryProvider } from "@/components/query-provider";
import { getCurrentUser } from "@/lib/current-user";
import { isAppAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";

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
  const initialDueCount = user ? await db.userVocabulary.count({
    where: {
      userId: user.id,
      OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: new Date() } }],
    },
  }) : null;

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {authenticated ? <WebVitals /> : null}
        {user ? <AppNavigation translationPreference={user.preferredTranslation} initialDueCount={initialDueCount} /> : null}
        <QueryProvider>
          <div
            id="main-content"
            tabIndex={-1}
            className={authenticated ? "app-shell" : "auth-shell"}
          >
            <PageTransition>{children}</PageTransition>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
