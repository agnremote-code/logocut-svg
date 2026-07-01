import { NextResponse } from "next/server";
import {
  capturePayPalOrder,
  getExpectedPayPalAmount,
  isPayPalNotConfiguredError,
} from "@/lib/paypal";
import { getCutPrice } from "@/lib/pricing";
import {
  getServerJob,
  getServerJobOriginalImage,
  getStorageNotConfiguredResponseBody,
  getStorageWriteFailedResponseBody,
  hasServerJobFinalSvg,
  isStorageNotConfiguredError,
  isStorageWriteFailedError,
  markServerJobPaidWithPayPal,
  saveServerJobError,
  saveServerJobFinalSvg,
  toJobSummary,
  updateServerJobStatus,
} from "@/lib/server-job-store";
import { vectorizeImage } from "@/lib/vectorizer";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

function parseAmountCents(value?: string) {
  if (!value || !/^\d+(\.\d{1,2})?$/.test(value)) {
    return null;
  }

  const [dollars, cents = ""] = value.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

function getPayPalCaptureDetails(
  payload: Awaited<ReturnType<typeof capturePayPalOrder>>,
  jobId: string,
) {
  const purchaseUnit = payload.purchase_units?.find(
    (unit) => unit.reference_id === jobId || unit.custom_id === jobId,
  );
  const capture = purchaseUnit?.payments?.captures?.[0];

  return {
    purchaseUnit,
    capture,
    captureId: capture?.id,
    captureStatus: capture?.status,
    currency: capture?.amount?.currency_code,
    amount: capture?.amount?.value,
  };
}

export async function POST(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  let payload: { jobId?: string };

  try {
    payload = (await request.json()) as { jobId?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid PayPal capture request." },
      { status: 400 },
    );
  }

  const jobId = payload.jobId?.trim();

  if (!jobId || !orderId) {
    return NextResponse.json(
      { error: "Invalid PayPal capture request." },
      { status: 400 },
    );
  }

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

  const resultUrl = `/result/${job.id}`;

  if (hasServerJobFinalSvg(job)) {
    return NextResponse.json({
      message: "Final generation already completed",
      resultUrl,
      job: toJobSummary(job),
    });
  }

  if (job.paymentStatus === "paid") {
    return NextResponse.json(
      { error: "Job already paid", resultUrl },
      { status: 409 },
    );
  }

  if (job.paypalOrderId !== orderId) {
    return NextResponse.json(
      { error: "PayPal capture failed" },
      { status: 400 },
    );
  }

  const price = getCutPrice(job.cutType);
  const expectedAmount = getExpectedPayPalAmount(price);
  const expectedAmountCents = price.amountCents;

  try {
    const capturePayload = await capturePayPalOrder({ orderId, jobId: job.id });
    const capture = getPayPalCaptureDetails(capturePayload, job.id);

    if (
      capturePayload.status !== "COMPLETED" ||
      capture.captureStatus !== "COMPLETED" ||
      !capture.captureId
    ) {
      return NextResponse.json(
        { error: "PayPal capture failed" },
        { status: 402 },
      );
    }

    if (
      capture.currency !== "USD" ||
      capture.amount !== expectedAmount ||
      parseAmountCents(capture.amount) !== expectedAmountCents
    ) {
      return NextResponse.json(
        { error: "Payment amount mismatch" },
        { status: 400 },
      );
    }

    const paidJob = await markServerJobPaidWithPayPal({
      jobId: job.id,
      paypalOrderId: orderId,
      paypalCaptureId: capture.captureId,
      amountPaid: capture.amount,
      currency: capture.currency,
    });

    if (paidJob && hasServerJobFinalSvg(paidJob)) {
      return NextResponse.json({
        message: "Final generation already completed",
        resultUrl,
        job: toJobSummary(paidJob),
      });
    }

    await updateServerJobStatus(job.id, "processing");

    const imageBuffer = await getServerJobOriginalImage(paidJob ?? job);

    if (!imageBuffer) {
      return NextResponse.json(
        { error: "Original image is not available for this job." },
        { status: 409 },
      );
    }

    const vectorizerResult = await vectorizeImage({
      imageBuffer,
      filename: job.fileName,
      cutType: job.cutType,
      contentType: job.fileType,
      mode: "production",
    });

    if (!vectorizerResult.ok) {
      console.error("[Vectorizer.AI] PayPal final generation failed", {
        jobId: job.id,
        orderId,
        code: vectorizerResult.code,
        status: vectorizerResult.status ?? null,
        error: vectorizerResult.error,
      });

      await saveServerJobError({
        jobId: job.id,
        error: vectorizerResult.error,
        status: vectorizerResult.status,
        stage: "final",
      });

      return NextResponse.json(
        {
          error:
            "We couldn't create the final SVG. Contact support for a refund or manual help.",
        },
        { status: vectorizerResult.code === "missing_credentials" ? 503 : 502 },
      );
    }

    const readyJob = await saveServerJobFinalSvg({
      jobId: job.id,
      svgBuffer: vectorizerResult.svg,
      creditsCalculated: vectorizerResult.creditsCalculated,
      creditsCharged: vectorizerResult.creditsCharged,
    });

    return NextResponse.json({
      resultUrl,
      job: readyJob ? toJobSummary(readyJob) : toJobSummary(job),
    });
  } catch (error) {
    if (isPayPalNotConfiguredError(error)) {
      return NextResponse.json(
        { error: "PayPal is not configured" },
        { status: 503 },
      );
    }

    if (isStorageNotConfiguredError(error)) {
      return NextResponse.json(getStorageNotConfiguredResponseBody(), {
        status: 503,
      });
    }

    if (isStorageWriteFailedError(error)) {
      return NextResponse.json(getStorageWriteFailedResponseBody(), {
        status: 502,
      });
    }

    console.error("[PayPal] capture failed", {
      jobId: job.id,
      orderId,
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      { error: "PayPal capture failed" },
      { status: 502 },
    );
  }
}
