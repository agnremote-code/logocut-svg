import { NextResponse } from "next/server";
import { getCutPrice } from "@/lib/pricing";
import {
  getServerJob,
  getStorageNotConfiguredResponseBody,
  hasServerJobPreviewSvg,
  isStorageNotConfiguredError,
  saveCheckoutSession,
  toJobSummary,
} from "@/lib/server-job-store";
import { getStripe } from "@/lib/stripe";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

function getRequestOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export async function POST(request: Request, context: RouteContext) {
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

  if (job.paymentStatus === "paid") {
    return NextResponse.json(
      { error: "This job has already been paid." },
      { status: 409 },
    );
  }

  if (!hasServerJobPreviewSvg(job)) {
    return NextResponse.json(
      { error: "Create a preview before checkout." },
      { status: 409 },
    );
  }

  const price = getCutPrice(job.cutType);
  const origin = getRequestOrigin(request);

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: job.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: price.productName,
            },
            unit_amount: price.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        jobId: job.id,
        cutType: job.cutType,
      },
      success_url: `${origin}/processing/${job.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    const updatedJob = await saveCheckoutSession({
      jobId: job.id,
      checkoutSessionId: session.id,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      job: updatedJob ? toJobSummary(updatedJob) : toJobSummary(job),
    });
  } catch (error) {
    if (isStorageNotConfiguredError(error)) {
      return NextResponse.json(getStorageNotConfiguredResponseBody(), {
        status: 503,
      });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Could not create Stripe Checkout.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
