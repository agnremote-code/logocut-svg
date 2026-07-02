import { NextResponse } from "next/server";
import {
  capturePayPalOrder,
  getExpectedPayPalAmount,
  getPayPalOrderDetails,
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

function getPayPalOrderMatchDetails(
  payload: Awaited<ReturnType<typeof getPayPalOrderDetails>>,
  jobId: string,
) {
  const purchaseUnits = payload.purchase_units ?? [];
  const matchingPurchaseUnit = purchaseUnits.find(
    (unit) => unit.reference_id === jobId || unit.custom_id === jobId,
  );
  const purchaseUnit = matchingPurchaseUnit ?? purchaseUnits[0];
  const completedCapture = purchaseUnit?.payments?.captures?.find(
    (capture) => capture.status === "COMPLETED",
  );

  return {
    purchaseUnit,
    referenceMatches: Boolean(matchingPurchaseUnit),
    completedCapture,
    captureId: completedCapture?.id,
    captureStatus: completedCapture?.status,
    currency:
      completedCapture?.amount?.currency_code ??
      purchaseUnit?.amount?.currency_code,
    amount: completedCapture?.amount?.value ?? purchaseUnit?.amount?.value,
  };
}

function logPayPalCaptureEvent(
  operation: string,
  details: {
    jobId: string;
    orderId: string;
    jobPaypalOrderIdPresent?: boolean;
    localOrderMatches?: boolean;
    paypalReferenceMatches?: boolean;
    paypalOrderStatus?: string;
    captureStatus?: string;
    mismatchReason?: string;
  },
) {
  console.info("[PayPal] capture", {
    operation,
    ...details,
  });
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

  if (hasServerJobFinalSvg(job) && job.paymentStatus === "paid") {
    return NextResponse.json({
      message: "Final generation already completed",
      resultUrl,
      job: toJobSummary(job),
    });
  }

  if (hasServerJobFinalSvg(job)) {
    return NextResponse.json(
      { error: "Final generation already completed", resultUrl },
      { status: 409 },
    );
  }

  const price = getCutPrice(job.cutType);
  const expectedAmount = getExpectedPayPalAmount(price);
  const expectedAmountCents = price.amountCents;

  try {
    const jobPaypalOrderIdPresent = Boolean(job.paypalOrderId);
    const localOrderMatches = job.paypalOrderId === orderId;
    const orderDetails = await getPayPalOrderDetails({ orderId });
    const orderMatch = getPayPalOrderMatchDetails(orderDetails, job.id);
    const orderBelongsToJob = orderMatch.referenceMatches || localOrderMatches;

    logPayPalCaptureEvent("order-verified", {
      jobId: job.id,
      orderId,
      jobPaypalOrderIdPresent,
      localOrderMatches,
      paypalReferenceMatches: orderMatch.referenceMatches,
      paypalOrderStatus: orderDetails.status,
      captureStatus: orderMatch.captureStatus,
      mismatchReason: orderBelongsToJob ? undefined : "job-id-mismatch",
    });

    if (!orderBelongsToJob) {
      return NextResponse.json(
        { error: "PayPal order does not match job" },
        { status: 400 },
      );
    }

    if (
      orderMatch.currency !== "USD" ||
      orderMatch.amount !== expectedAmount ||
      parseAmountCents(orderMatch.amount) !== expectedAmountCents
    ) {
      logPayPalCaptureEvent("amount-mismatch", {
        jobId: job.id,
        orderId,
        jobPaypalOrderIdPresent,
        localOrderMatches,
        paypalReferenceMatches: orderMatch.referenceMatches,
        paypalOrderStatus: orderDetails.status,
        captureStatus: orderMatch.captureStatus,
        mismatchReason: "amount-or-currency-mismatch",
      });

      return NextResponse.json(
        { error: "Payment amount mismatch" },
        { status: 400 },
      );
    }

    let paymentMetadata:
      | {
          paypalOrderId: string;
          paypalCaptureId: string;
          amountPaid: string;
          currency: string;
        }
      | null = null;

    if (job.paymentStatus === "paid") {
      if (
        job.paymentProvider !== "paypal" ||
        !job.paypalCaptureId ||
        !job.amountPaid ||
        !job.currency
      ) {
        return NextResponse.json(
          { error: "Job already paid", resultUrl },
          { status: 409 },
        );
      }

      paymentMetadata = {
        paypalOrderId: job.paypalOrderId ?? orderId,
        paypalCaptureId: job.paypalCaptureId,
        amountPaid: job.amountPaid,
        currency: job.currency,
      };
    } else if (
      orderDetails.status === "COMPLETED" &&
      orderMatch.captureStatus === "COMPLETED" &&
      orderMatch.captureId &&
      orderMatch.amount &&
      orderMatch.currency
    ) {
      paymentMetadata = {
        paypalOrderId: orderId,
        paypalCaptureId: orderMatch.captureId,
        amountPaid: orderMatch.amount,
        currency: orderMatch.currency,
      };
    } else {
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

      paymentMetadata = {
        paypalOrderId: orderId,
        paypalCaptureId: capture.captureId,
        amountPaid: capture.amount,
        currency: capture.currency,
      };

      logPayPalCaptureEvent("capture-completed", {
        jobId: job.id,
        orderId,
        jobPaypalOrderIdPresent,
        localOrderMatches,
        paypalReferenceMatches: orderMatch.referenceMatches,
        paypalOrderStatus: capturePayload.status,
        captureStatus: capture.captureStatus,
      });
    }

    const paidJob = await markServerJobPaidWithPayPal({
      jobId: job.id,
      ...paymentMetadata,
      status: "processing",
    });
    const latestPaidJob = (await getServerJob(job.id)) ?? paidJob ?? job;

    if (hasServerJobFinalSvg(latestPaidJob)) {
      return NextResponse.json(
        {
          message: "Final generation already completed",
          resultUrl,
          job: toJobSummary(latestPaidJob),
        },
      );
    }

    // Carry the verified PayPal metadata through final/error saves. Blob
    // metadata reads can lag immediately after overwrite, so each later write
    // must re-apply the paid fields instead of trusting a freshly read record.
    const imageBuffer = await getServerJobOriginalImage(latestPaidJob);

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
        paypalPayment: paymentMetadata,
      });

      return NextResponse.json(
        {
          error: "Final generation failed",
        },
        { status: vectorizerResult.code === "missing_credentials" ? 503 : 502 },
      );
    }

    const readyJob = await saveServerJobFinalSvg({
      jobId: job.id,
      svgBuffer: vectorizerResult.svg,
      creditsCalculated: vectorizerResult.creditsCalculated,
      creditsCharged: vectorizerResult.creditsCharged,
      paypalPayment: paymentMetadata,
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
