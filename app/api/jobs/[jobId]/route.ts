import { NextResponse } from "next/server";
import {
  getServerJob,
  getStorageNotConfiguredResponseBody,
  hasServerJobFinalSvg,
  hasServerJobPreviewSvg,
  isStorageNotConfiguredError,
  toJobSummary,
} from "@/lib/server-job-store";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  let job;

  try {
    job = await getServerJob(jobId);
  } catch (error) {
    if (isStorageNotConfiguredError(error)) {
      return NextResponse.json(getStorageNotConfiguredResponseBody(), {
        status: 503,
      });
    }

    throw error;
  }

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({
    job: toJobSummary(job),
    previewReady: hasServerJobPreviewSvg(job),
    svgReady: hasServerJobFinalSvg(job),
    paymentStatus: job.paymentStatus,
    purchase:
      job.paymentStatus === "paid" && job.paypalOrderId && job.amountPaid
        ? {
            transactionId: job.paypalOrderId,
            value: Number(job.amountPaid),
            currency: job.currency ?? "USD",
          }
        : null,
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
