import { NextResponse } from "next/server";
import {
  getServerJob,
  getServerJobFinalSvg,
  getServerJobProductType,
  getStorageNotConfiguredResponseBody,
  hasServerJobFinalOutputSvg,
  isStorageNotConfiguredError,
} from "@/lib/server-job-store";
import { canDownloadJob } from "@/lib/job-flow";
import { isOutputType } from "@/lib/job-types";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

function getSafeDownloadName(fileName: string, suffix = "logocut") {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const asciiName = baseName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${asciiName || "logocut-svg"}-${suffix}.svg`;
}

export async function GET(request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const outputParam = new URL(request.url).searchParams.get("output");
  const requestedOutput = isOutputType(outputParam) ? outputParam : undefined;
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

  const productType = getServerJobProductType(job);

  if (productType === "complete_pack") {
    if (!requestedOutput) {
      return NextResponse.json(
        { error: "Choose single or layered SVG download." },
        { status: 400 },
      );
    }

    if (job.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Clean SVG is not available before payment." },
        { status: 403 },
      );
    }

    if (!hasServerJobFinalOutputSvg(job, requestedOutput)) {
      return NextResponse.json(
        { error: "Clean SVG is not ready yet." },
        { status: 409 },
      );
    }
  } else if (!canDownloadJob(job)) {
    return NextResponse.json(
      { error: "Clean SVG is not available before payment." },
      { status: 403 },
    );
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

  const finalSvgBuffer = await getServerJobFinalSvg(job, requestedOutput);

  if (!finalSvgBuffer) {
    return NextResponse.json(
      {
        error: "Clean SVG is not ready yet.",
      },
      { status: 409 },
    );
  }

  const suffix =
    requestedOutput === "single"
      ? "single-color-logocut"
      : requestedOutput === "multi"
        ? "layered-logocut"
        : "logocut";

  return new Response(new Uint8Array(finalSvgBuffer), {
    headers: {
      "Content-Disposition": `attachment; filename="${getSafeDownloadName(job.fileName, suffix)}"`,
      "Content-Type": job.svgContentType ?? "image/svg+xml",
    },
  });
}
