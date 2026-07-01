import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
