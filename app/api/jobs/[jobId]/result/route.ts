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

  return `${asciiName || "logocut-svg"}-logocut-test.svg`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = getServerJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.status === "failed") {
    return NextResponse.json(
      {
        error: job.vectorizerError ?? "Vectorizer.AI test mode failed.",
      },
      { status: 409 },
    );
  }

  if (!job.svgBuffer) {
    return NextResponse.json(
      {
        error: "SVG is not ready yet.",
      },
      { status: 409 },
    );
  }

  return new Response(new Uint8Array(job.svgBuffer), {
    headers: {
      "Content-Disposition": `attachment; filename="${getSafeDownloadName(job.fileName)}"`,
      "Content-Type": job.svgContentType ?? "image/svg+xml",
    },
  });
}
