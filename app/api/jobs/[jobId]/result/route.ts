import { NextResponse } from "next/server";
import { getServerJob } from "@/lib/server-job-store";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

function getSafeDownloadName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const asciiName = baseName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${asciiName || "logocut-svg"}-logocut.svg`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = getServerJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.status === "failed" && job.finalError) {
    return NextResponse.json(
      {
        error:
          "We couldn't create the final SVG. Contact support for a refund or manual help.",
      },
      { status: 409 },
    );
  }

  if (!job.finalSvgBuffer) {
    return NextResponse.json(
      {
        error: "Clean SVG is not ready yet.",
      },
      { status: 409 },
    );
  }

  return new Response(new Uint8Array(job.finalSvgBuffer), {
    headers: {
      "Content-Disposition": `attachment; filename="${getSafeDownloadName(job.fileName)}"`,
      "Content-Type": job.svgContentType ?? "image/svg+xml",
    },
  });
}
