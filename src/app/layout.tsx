import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import "./globals.css";
import { SITE } from "@/lib/content";

/* Display and UI: a grotesque with a width axis and a little wonk — serious
   without reading like a bank. Body: a text serif, because question stems and
   rationales are meant to be read slowly. Mono: for anything checkable. */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Nursia — NCLEX practice questions written by nurses",
    template: "%s | Nursia",
  },
  description: SITE.tagline,
  openGraph: {
    siteName: SITE.name,
    type: "website",
    locale: "en_US",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${sourceSerif.variable} ${plexMono.variable}`}
    >
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        {children}
        {process.env.NODE_ENV === "production" && (
          <>
            {process.env.NEXT_PUBLIC_CLARITY_ID && (
              <Script id="ms-clarity-init" strategy="beforeInteractive">
                {`(function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                  })(window,document,"clarity","script","${process.env.NEXT_PUBLIC_CLARITY_ID}");`}
              </Script>
            )}
            {process.env.NEXT_PUBLIC_GA_ID && (
              <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
            )}
          </>
        )}
      </body>
    </html>
  );
}
