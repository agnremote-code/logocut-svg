import { NextResponse } from "next/server";
import {
  getServerJob,
  getServerJobPreviewSvg,
  getStorageNotConfiguredResponseBody,
  isStorageNotConfiguredError,
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

  if (job.status === "failed" && job.previewError) {
    return NextResponse.json(
      {
        error: "We couldn't create a preview from this image. Try a clearer logo.",
      },
      { status: 409 },
    );
  }

  const previewSvgBuffer = await getServerJobPreviewSvg(job);

  if (!previewSvgBuffer) {
    return NextResponse.json(
      {
        error: "Preview is not ready yet.",
      },
      { status: 409 },
    );
  }

  return new Response(new Uint8Array(previewSvgBuffer), {
    headers: {
      "Content-Type": job.svgContentType ?? "image/svg+xml",
    },
  });
}
