import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "@/components/motion/transition-link";
const jakarta = localFont({
  src: [
    { path: "./fonts/jakarta-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jakarta-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/jakarta-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/jakarta-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-jakarta",
  display: "swap",
  preload: true,
});
import "./globals.css";
import { Header } from "@/components/layout/header";
import { PageMotion } from "@/components/motion/page-motion";
import { PageNavigation } from "@/components/motion/page-navigation";
export const metadata: Metadata = {
  title: {
    default: "RSS Talk Show | Every Voice Has a Story",
    template: "%s | RSS Talk Show",
  },
  description:
    "Meaningful conversations, new perspectives, and ideas that matter. A school-organized talk show for our community.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <PageNavigation>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <div className="site-frame">
            <Header />
            <main id="main">
              {children}
              <PageMotion />
            </main>
            <div className="frame-decoration" aria-hidden="true" />
          </div>
          <footer>
            <span>© RSS Talk Show · Every voice has a story.</span>
            <nav className="footer-links" aria-label="Footer navigation">
              <Link href="/about">About the show</Link>
              <Link href="/contact">Contact & FAQ</Link>
            </nav>
          </footer>
        </PageNavigation>
      </body>
    </html>
  );
}
