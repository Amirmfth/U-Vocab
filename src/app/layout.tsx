import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AppNavigation } from "@/components/app-navigation";
import { PageTransition } from "@/components/page-transition";

export const metadata = {
  title: {
    default: "U-Vocab",
    template: "%s · U-Vocab",
  },
  description: "Your personal German lexical knowledge system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <AppNavigation />
        <div className="app-shell">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
