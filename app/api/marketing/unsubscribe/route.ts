import { NextResponse } from "next/server";
import { unsubscribeMarketingContact } from "@/lib/marketing";
import { verifyUnsubscribeToken } from "@/lib/marketing-token";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function safeJson(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function logUnsubscribeError(error: unknown) {
  console.error("[Marketing] unsubscribe", {
    operation: "unsubscribe-failed",
    errorName: error instanceof Error ? error.name : "unknown",
    errorMessage: error instanceof Error ? error.message : "unknown",
  });
}

export async function POST(request: Request) {
  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();

  if (contentType !== "application/json") {
    return safeJson({ error: "Invalid unsubscribe request." }, 415);
  }

  let payload: { token?: unknown };

  try {
    payload = (await request.json()) as { token?: unknown };
  } catch {
    return safeJson({ error: "Invalid unsubscribe request." }, 400);
  }

  if (typeof payload.token !== "string" || !payload.token) {
    return safeJson({ error: "This unsubscribe link is invalid or expired." }, 400);
  }

  const verified = verifyUnsubscribeToken(payload.token);

  if (!verified.ok) {
    return safeJson({ error: "This unsubscribe link is invalid or expired." }, 400);
  }

  try {
    await unsubscribeMarketingContact(verified.contactId);
  } catch (error) {
    logUnsubscribeError(error);
    return safeJson(
      { error: "Could not update your preferences. Please contact support." },
      503,
    );
  }

  return safeJson({ ok: true }, 200);
}
