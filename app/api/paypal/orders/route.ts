import { NextResponse } from "next/server";
import { isCutType } from "@/lib/job-types";
import { createPayPalOrder, isPayPalNotConfiguredError } from "@/lib/paypal";
import { getCutPrice } from "@/lib/pricing";
import {
  getServerJob,
  getStorageNotConfiguredResponseBody,
  getStorageWriteFailedResponseBody,
  hasServerJobFinalSvg,
  hasServerJobPreviewSvg,
  isStorageNotConfiguredError,
  isStorageWriteFailedError,
  savePayPalOrder,
} from "@/lib/server-job-store";

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

  if (!hasServerJobPreviewSvg(job)) {
    return NextResponse.json(
      { error: "Create a preview before checkout." },
      { status: 409 },
    );
  }

  if (job.paypalOrderId) {
    return NextResponse.json({ orderId: job.paypalOrderId });
  }

  try {
    const orderId = await createPayPalOrder({
      jobId: job.id,
      price: getCutPrice(job.cutType),
    });

    await savePayPalOrder({ jobId: job.id, paypalOrderId: orderId });

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

    console.error("[PayPal] order creation failed", {
      jobId: job.id,
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      { error: "PayPal order creation failed" },
      { status: 502 },
    );
  }
}
