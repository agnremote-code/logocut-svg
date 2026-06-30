import { NextResponse } from "next/server";
import {
  getServerJob,
  saveServerJobError,
  saveServerJobSvg,
  toJobSummary,
  updateServerJobStatus,
} from "@/lib/server-job-store";
import { vectorizeImage } from "@/lib/vectorizer";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = getServerJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.paymentStatus !== "paid") {
    return NextResponse.json(
      { error: "Payment is required before processing can begin." },
      { status: 402 },
    );
  }

  updateServerJobStatus(jobId, "processing");

  const result = await vectorizeImage({
    imageBuffer: job.imageBuffer,
    filename: job.fileName,
    cutType: job.cutType,
    contentType: job.fileType,
  });

  if (!result.ok) {
    const failedJob = saveServerJobError({
      jobId,
      error: result.error,
      status: result.status,
    });

    return NextResponse.json(
      {
        error: result.error,
        code: result.code,
        job: failedJob ? toJobSummary(failedJob) : null,
      },
      { status: result.code === "missing_credentials" ? 503 : 502 },
    );
  }

  const readyJob = saveServerJobSvg({
    jobId,
    svgBuffer: result.svg,
    creditsCalculated: result.creditsCalculated,
    creditsCharged: result.creditsCharged,
  });

  return NextResponse.json({
    job: readyJob ? toJobSummary(readyJob) : null,
    mode: result.mode,
    creditsCalculated: result.creditsCalculated,
    creditsCharged: result.creditsCharged,
  });
}
