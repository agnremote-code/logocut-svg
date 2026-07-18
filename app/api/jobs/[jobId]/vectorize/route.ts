import { NextResponse } from "next/server";
import {
  getServerJobOriginalImage,
  getServerJob,
  getStorageNotConfiguredResponseBody,
  hasServerJobFinalSvg,
  hasServerJobPreviewSvg,
  isStorageNotConfiguredError,
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

  const mode = job.paymentStatus === "paid" ? "production" : "test";

  if (mode === "test" && hasServerJobPreviewSvg(job)) {
    return NextResponse.json({
      job: toJobSummary(job),
      mode: "test",
      creditsCalculated: job.creditsCalculated ?? null,
      creditsCharged: job.creditsCharged ?? null,
    });
  }

  if (mode === "production" && hasServerJobFinalSvg(job)) {
    return NextResponse.json({
      job: toJobSummary(job),
      mode: "production",
      creditsCalculated: job.creditsCalculated ?? null,
      creditsCharged: job.creditsCharged ?? null,
    });
  }

  try {
    await updateServerJobStatus(jobId, mode === "test" ? "previewing" : "processing");
  } catch (error) {
    if (isStorageNotConfiguredError(error)) {
      return NextResponse.json(getStorageNotConfiguredResponseBody(), {
        status: 503,
      });
    }

    throw error;
  }

  const imageBuffer = await getServerJobOriginalImage(job);

  if (!imageBuffer) {
    return NextResponse.json(
      { error: "Original image is not available for this job." },
      { status: 409 },
    );
  }

  const result = await vectorizeImage({
    imageBuffer,
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

    let failedJob = null;

    try {
      failedJob = await saveServerJobError({
        jobId,
        error: result.error,
        status: result.status,
        stage: mode === "test" ? "preview" : "final",
      });
    } catch (error) {
      if (isStorageNotConfiguredError(error)) {
        return NextResponse.json(getStorageNotConfiguredResponseBody(), {
          status: 503,
        });
      }

      throw error;
    }

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
      ? await saveServerJobPreviewSvg({
          jobId,
          svgBuffer: result.svg,
          creditsCalculated: result.creditsCalculated,
          creditsCharged: result.creditsCharged,
        })
      : await saveServerJobFinalSvg({
          jobId,
          svgBuffer: result.svg,
          creditsCalculated: result.creditsCalculated,
          creditsCharged: result.creditsCharged,
        });

  return NextResponse.json({
    job: readyJob ? toJobSummary(readyJob) : null,
    mode: result.mode,
    previewAsset:
      result.mode === "test"
        ? {
            reference: `/api/jobs/${jobId}/preview`,
            contentType: result.contentType,
            base64: result.svg.toString("base64"),
          }
        : null,
    creditsCalculated: result.creditsCalculated,
    creditsCharged: result.creditsCharged,
  });
}
