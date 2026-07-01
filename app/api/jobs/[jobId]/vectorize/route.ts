import { NextResponse } from "next/server";
import {
  getServerJob,
  saveServerJobFinalSvg,
  saveServerJobError,
  saveServerJobPreviewSvg,
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

  const mode = job.paymentStatus === "paid" ? "production" : "test";

  if (mode === "test" && job.previewSvgBuffer) {
    return NextResponse.json({
      job: toJobSummary(job),
      mode: "test",
      creditsCalculated: job.creditsCalculated ?? null,
      creditsCharged: job.creditsCharged ?? null,
    });
  }

  if (mode === "production" && job.finalSvgBuffer) {
    return NextResponse.json({
      job: toJobSummary(job),
      mode: "production",
      creditsCalculated: job.creditsCalculated ?? null,
      creditsCharged: job.creditsCharged ?? null,
    });
  }

  updateServerJobStatus(jobId, mode === "test" ? "previewing" : "processing");

  const result = await vectorizeImage({
    imageBuffer: job.imageBuffer,
    filename: job.fileName,
    cutType: job.cutType,
    contentType: job.fileType,
    mode,
  });

  if (!result.ok) {
    console.error("[Vectorizer.AI] vectorize failed", {
      jobId,
      mode,
      code: result.code,
      status: result.status ?? null,
      error: result.error,
    });

    const failedJob = saveServerJobError({
      jobId,
      error: result.error,
      status: result.status,
      stage: mode === "test" ? "preview" : "final",
    });

    return NextResponse.json(
      {
        error:
          mode === "test"
            ? "We couldn't create a preview from this image. Try a clearer logo."
            : "We couldn't create the final SVG. Contact support for a refund or manual help.",
        detail: result.error,
        code: result.code,
        job: failedJob ? toJobSummary(failedJob) : null,
      },
      { status: result.code === "missing_credentials" ? 503 : 502 },
    );
  }

  const readyJob =
    mode === "test"
      ? saveServerJobPreviewSvg({
          jobId,
          svgBuffer: result.svg,
          creditsCalculated: result.creditsCalculated,
          creditsCharged: result.creditsCharged,
        })
      : saveServerJobFinalSvg({
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
