import { notFound } from "next/navigation";
import { AnalyticsDiagnosticsClient } from "./analytics-diagnostics-client";

export const dynamic = "force-dynamic";

export default function AnalyticsDiagnosticsPage() {
  if (
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV)
  ) {
    notFound();
  }

  return <AnalyticsDiagnosticsClient />;
}
