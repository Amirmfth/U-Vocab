import "./globals.css";
import "./core-experience.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AppNavigation } from "@/components/app-navigation";
import { PageTransition } from "@/components/page-transition";
import { WebVitals } from "@/components/web-vitals";
import { QueryProvider } from "@/components/query-provider";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = {
  title: {
    default: "U-Vocab",
    template: "%s · U-Vocab",
  },
  description: "Your personal German lexical knowledge system",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <WebVitals />
        <AppNavigation translationPreference={user.preferredTranslation} />
        <QueryProvider>
          <div className="app-shell">
            <PageTransition>{children}</PageTransition>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
