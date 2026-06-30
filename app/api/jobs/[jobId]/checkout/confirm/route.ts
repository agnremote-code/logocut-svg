import { NextResponse } from "next/server";
import {
  getServerJob,
  markServerJobPaid,
  toJobSummary,
} from "@/lib/server-job-store";
import { getStripe } from "@/lib/stripe";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = getServerJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  let sessionId = "";

  try {
    const body = (await request.json()) as { sessionId?: string };
    sessionId = body.sessionId?.trim() ?? "";
  } catch {
    return NextResponse.json(
      { error: "Checkout session is required." },
      { status: 400 },
    );
  }

  if (!sessionId) {
    return NextResponse.json(
      { error: "Checkout session is required." },
      { status: 400 },
    );
  }

  if (job.checkoutSessionId && job.checkoutSessionId !== sessionId) {
    return NextResponse.json(
      { error: "Checkout session does not match this upload." },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.client_reference_id !== job.id || session.metadata?.jobId !== job.id) {
      return NextResponse.json(
        { error: "Checkout session does not match this upload." },
        { status: 400 },
      );
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment is not complete yet." },
        { status: 402 },
      );
    }

    const paidJob = markServerJobPaid({
      jobId: job.id,
      checkoutSessionId: session.id,
    });

    return NextResponse.json({
      job: paidJob ? toJobSummary(paidJob) : toJobSummary(job),
      paymentStatus: "paid",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not verify Stripe payment.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
