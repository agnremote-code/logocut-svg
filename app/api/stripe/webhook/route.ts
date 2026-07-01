import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getStorageNotConfiguredResponseBody,
  isStorageNotConfiguredError,
  markServerJobPaid,
} from "@/lib/server-job-store";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET." },
      { status: 503 },
    );
  }

  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe webhook signature." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid Stripe webhook signature." },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (
      session.payment_status === "paid" &&
      session.metadata?.jobId &&
      session.id
    ) {
      try {
        await markServerJobPaid({
          jobId: session.metadata.jobId,
          checkoutSessionId: session.id,
        });
      } catch (error) {
        if (isStorageNotConfiguredError(error)) {
          return NextResponse.json(getStorageNotConfiguredResponseBody(), {
            status: 503,
          });
        }

        throw error;
      }
    }
  }

  return NextResponse.json({ received: true });
}
