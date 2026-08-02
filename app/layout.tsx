import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AnalyticsProvider } from "@/components/analytics-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

const gaBootstrap = gaMeasurementId
  ? `
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
      if (window.__logocutGaConfigured !== ${JSON.stringify(gaMeasurementId)}) {
        var logocutReferrer = '';
        try {
          var parsedReferrer = new URL(document.referrer);
          logocutReferrer = parsedReferrer.origin + parsedReferrer.pathname;
        } catch (error) {}
        window.gtag('js', new Date());
        window.gtag('config', ${JSON.stringify(gaMeasurementId)}, {
          send_page_view: false,
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
          page_location: window.location.href.split('#')[0],
          page_referrer: logocutReferrer
        });
        window.__logocutGaConfigured = ${JSON.stringify(gaMeasurementId)};
      }
    `
  : null;

export const metadata: Metadata = {
  metadataBase: new URL("https://www.logocutsvg.com"),
  title: "LogoCut SVG | Logo to Cricut SVG Converter",
  description:
    "Upload a logo, preview a watermarked SVG for free, and unlock a clean Cricut-ready SVG only if it looks good.",
  alternates: {
    canonical: "https://www.logocutsvg.com",
  },
  openGraph: {
    title: "LogoCut SVG | Logo to Cricut SVG Converter",
    description:
      "Upload a logo, preview a watermarked SVG for free, and unlock a clean Cricut-ready SVG only if it looks good.",
    url: "https://www.logocutsvg.com",
    siteName: "LogoCut SVG",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "LogoCut SVG | Logo to Cricut SVG Converter",
    description:
      "Upload a logo, preview a watermarked SVG for free, and unlock a clean Cricut-ready SVG only if it looks good.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {gaBootstrap ? (
          <Script id="google-analytics-bootstrap" strategy="beforeInteractive">
            {gaBootstrap}
          </Script>
        ) : null}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AnalyticsProvider />
        {children}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "xfkv7lhnyf");
          `}
        </Script>
      </body>
    </html>
  );
}
