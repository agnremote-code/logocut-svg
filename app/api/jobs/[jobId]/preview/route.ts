import { NextResponse } from "next/server";
import { getServerJob } from "@/lib/server-job-store";

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

  if (job.status === "failed" && job.previewError) {
    return NextResponse.json(
      {
        error: "We couldn't create a preview from this image. Try a clearer logo.",
      },
      { status: 409 },
    );
  }

  if (!job.previewSvgBuffer) {
    return NextResponse.json(
      {
        error: "Preview is not ready yet.",
      },
      { status: 409 },
    );
  }

  return new Response(new Uint8Array(job.previewSvgBuffer), {
    headers: {
      "Content-Type": job.svgContentType ?? "image/svg+xml",
    },
  });
}
