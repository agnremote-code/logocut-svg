import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Superclass — AI Lesson Builder",
  description: "Turn any idea, text, or video into a ready-to-teach language lesson.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
