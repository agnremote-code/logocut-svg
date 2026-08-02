import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Superclass — Text to Class",
  description: "Paste an idea, text, notes, transcript, or YouTube URL and open a polished interactive language class.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
