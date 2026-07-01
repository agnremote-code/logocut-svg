import { NextResponse } from "next/server";
import {
  getServerJob,
  getServerJobOriginalImage,
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

  const imageBuffer = await getServerJobOriginalImage(job);

  if (!imageBuffer) {
    return NextResponse.json(
      { error: "Original image is not available." },
      { status: 409 },
    );
  }

  return new Response(new Uint8Array(imageBuffer), {
    headers: {
      "Content-Type": job.fileType,
    },
  });
}
