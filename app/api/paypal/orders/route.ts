import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isCutType } from "@/lib/job-types";
import {
  createPayPalOrder,
  getExpectedPayPalAmount,
  getPayPalOrderDetails,
  isPayPalApiError,
  isPayPalNotConfiguredError,
} from "@/lib/paypal";
import { getCutPrice } from "@/lib/pricing";
import {
  getServerJob,
  getServerJobOriginalImage,
  getStorageNotConfiguredResponseBody,
  getStorageWriteFailedResponseBody,
  hasServerJobFinalSvg,
  hasServerJobPreviewSvg,
  isStorageNotConfiguredError,
  isStorageWriteFailedError,
  savePayPalOrder,
} from "@/lib/server-job-store";
import { canCheckoutJob } from "@/lib/job-flow";

type PayPalOrderDetails = Awaited<ReturnType<typeof getPayPalOrderDetails>>;

function parseAmountCents(value?: string) {
  if (!value || !/^\d+(\.\d{1,2})?$/.test(value)) {
    return null;
  }

  const [dollars, cents = ""] = value.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

function getPayPalOrderMatchDetails(
  payload: PayPalOrderDetails,
  jobId: string,
) {
  const purchaseUnits = payload.purchase_units ?? [];
  const matchingPurchaseUnit = purchaseUnits.find(
    (unit) => unit.reference_id === jobId || unit.custom_id === jobId,
  );
  const purchaseUnit = matchingPurchaseUnit ?? purchaseUnits[0];

  return {
    referenceMatches: Boolean(matchingPurchaseUnit),
    currency: purchaseUnit?.amount?.currency_code,
    amount: purchaseUnit?.amount?.value,
  };
}

function getPayPalOrderReuseCheck({
  order,
  jobId,
  expectedAmount,
  expectedAmountCents,
}: {
  order: PayPalOrderDetails;
  jobId: string;
  expectedAmount: string;
  expectedAmountCents: number;
}) {
  const match = getPayPalOrderMatchDetails(order, jobId);

  if (order.status !== "CREATED") {
    return {
      reusable: false,
      reason: "order-status-not-created",
      referenceMatches: match.referenceMatches,
    };
  }

  if (!match.referenceMatches) {
    return {
      reusable: false,
      reason: "job-id-mismatch",
      referenceMatches: false,
    };
  }

  if (
    match.currency !== "USD" ||
    match.amount !== expectedAmount ||
    parseAmountCents(match.amount) !== expectedAmountCents
  ) {
    return {
      reusable: false,
      reason: "amount-or-currency-mismatch",
      referenceMatches: match.referenceMatches,
    };
  }

  return {
    reusable: true,
    reason: "created-order-valid",
    referenceMatches: match.referenceMatches,
  };
}

function logPayPalOrderEvent(
  operation: string,
  details: {
    jobId: string;
    orderId?: string;
    paypalOrderStatus?: string;
    paypalReferenceMatches?: boolean;
    mismatchReason?: string;
  },
) {
  console.info("[PayPal] order", {
    operation,
    ...details,
  });
}

function logPayPalOrderError(
  operation: string,
  details: {
    jobId: string;
    orderId?: string;
    error: unknown;
  },
) {
  const { error, ...safeDetails } = details;

  console.error("[PayPal] order", {
    operation,
    ...safeDetails,
    errorName: error instanceof Error ? error.name : "unknown",
    errorMessage: error instanceof Error ? error.message : "unknown",
    paypalStatus: isPayPalApiError(error) ? error.status : undefined,
    paypalName: isPayPalApiError(error) ? error.paypalName : undefined,
    paypalMessage: isPayPalApiError(error) ? error.paypalMessage : undefined,
    paypalDebugId: isPayPalApiError(error) ? error.paypalDebugId : undefined,
    paypalDetailsIssue: isPayPalApiError(error)
      ? error.paypalDetailsIssue
      : undefined,
  });
}

export async function POST(request: Request) {
  let payload: { jobId?: string; cutType?: unknown };

  try {
    payload = (await request.json()) as { jobId?: string; cutType?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid PayPal order request." },
      { status: 400 },
    );
  }

  const jobId = payload.jobId?.trim();

  if (!jobId || !isCutType(payload.cutType)) {
    return NextResponse.json(
      { error: "Invalid PayPal order request." },
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

  if (job.cutType !== payload.cutType) {
    return NextResponse.json(
      { error: "Cut type does not match this upload." },
      { status: 400 },
    );
  }

  if (hasServerJobFinalSvg(job)) {
    return NextResponse.json(
      { error: "Final generation already completed" },
      { status: 409 },
    );
  }

  if (job.paymentStatus === "paid") {
    return NextResponse.json({ error: "Job already paid" }, { status: 409 });
  }

  if (!hasServerJobPreviewSvg(job) || !canCheckoutJob(job)) {
    return NextResponse.json(
      { error: "Create a preview before checkout." },
      { status: 409 },
    );
  }

  if (job.settingsHash && job.previewSettingsHash !== job.settingsHash) {
    return NextResponse.json(
      { error: "Preview settings no longer match this job." },
      { status: 409 },
    );
  }

  if (!(await getServerJobOriginalImage(job))) {
    return NextResponse.json({ error: "Original image is not available." }, { status: 409 });
  }

  try {
    const price = getCutPrice(job.cutType);
    const expectedAmount = getExpectedPayPalAmount(price);
    const expectedAmountCents = price.amountCents;
    let needsFreshOrderRequestId = false;

    if (job.paypalOrderId) {
      try {
        const existingOrder = await getPayPalOrderDetails({
          orderId: job.paypalOrderId,
        });
        const reuseCheck = getPayPalOrderReuseCheck({
          order: existingOrder,
          jobId: job.id,
          expectedAmount,
          expectedAmountCents,
        });

        logPayPalOrderEvent("existing-order-checked", {
          jobId: job.id,
          orderId: job.paypalOrderId,
          paypalOrderStatus: existingOrder.status,
          paypalReferenceMatches: reuseCheck.referenceMatches,
          mismatchReason: reuseCheck.reusable ? undefined : reuseCheck.reason,
        });

        if (reuseCheck.reusable) {
          return NextResponse.json({ orderId: job.paypalOrderId });
        }

        needsFreshOrderRequestId = true;
      } catch (error) {
        logPayPalOrderError("existing-order-lookup-failed", {
          jobId: job.id,
          orderId: job.paypalOrderId,
          error,
        });
        needsFreshOrderRequestId = true;
      }
    }

    const orderId = await createPayPalOrder({
      jobId: job.id,
      price,
      requestId: needsFreshOrderRequestId
        ? `logocut-create-${job.id}-${randomUUID()}`
        : undefined,
    });

    await savePayPalOrder({ jobId: job.id, paypalOrderId: orderId });

    logPayPalOrderEvent("created", {
      jobId: job.id,
      orderId,
    });

    return NextResponse.json({ orderId });
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

    logPayPalOrderError("creation-failed", {
      jobId: job.id,
      error,
    });

    return NextResponse.json(
      { error: "PayPal order creation failed" },
      { status: 502 },
    );
  }
}
