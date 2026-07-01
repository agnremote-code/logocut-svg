import { NextResponse } from "next/server";
import { getServerJob, toJobSummary } from "@/lib/server-job-store";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = getServerJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({
    job: toJobSummary(job),
    previewReady: Boolean(job.previewSvgBuffer),
    svgReady: Boolean(job.finalSvgBuffer),
    paymentStatus: job.paymentStatus,
    checkoutSessionId: job.checkoutSessionId ?? null,
    vectorizerMode: job.vectorizerMode ?? null,
    previewError: job.previewError ?? null,
    finalError: job.finalError ?? null,
    vectorizerError: job.vectorizerError ?? null,
    vectorizerStatus: job.vectorizerStatus ?? null,
    creditsCalculated: job.creditsCalculated ?? null,
    creditsCharged: job.creditsCharged ?? null,
  });
}
