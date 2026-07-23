import { NextResponse } from "next/server";
import {
  normalizeMarketingSignupInput,
  sendMarketingConfirmationEmail,
  upsertMarketingContact,
} from "@/lib/marketing";

function logMarketingSignupError(
  operation: string,
  error: unknown,
  extra?: Record<string, string | boolean>,
) {
  console.error("[Marketing] signup", {
    operation,
    ...extra,
    errorName: error instanceof Error ? error.name : "unknown",
    errorMessage: error instanceof Error ? error.message : "unknown",
  });
}

export async function POST(request: Request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid signup request." },
      { status: 400 },
    );
  }

  const parsed = normalizeMarketingSignupInput(payload);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const contact = await upsertMarketingContact({
      normalizedEmail: parsed.email,
      source: parsed.source,
      utm: parsed.utm,
    });
    const delivery = await sendMarketingConfirmationEmail({
      email: parsed.email,
      contactId: contact.id,
    });

    if (!delivery.sent) {
      logMarketingSignupError(
        "confirmation-email-not-sent",
        new Error(delivery.reason ?? "unknown_email_delivery_error"),
        { source: parsed.source },
      );
    }

    return NextResponse.json({
      ok: true,
      emailSent: delivery.sent,
    });
  } catch (error) {
    logMarketingSignupError("signup-failed", error, {
      source: parsed.source,
    });

    return NextResponse.json(
      { error: "Could not join the list right now. Please try again." },
      { status: 503 },
    );
  }
}
