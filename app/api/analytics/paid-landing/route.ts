import { NextRequest, NextResponse } from "next/server";
import {
  PAID_BEACON_COOKIE,
  PAID_VISIT_COOKIE,
  PAID_VISIT_MAX_AGE_SECONDS,
  createPaidRequestReceipt,
  logPaidTrafficReceipt,
  parsePaidBeaconPayload,
} from "@/lib/paid-traffic-receipt";

const noStoreHeaders = { "cache-control": "no-store" };

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (contentType !== "application/json" || contentLength > 2048) {
    return NextResponse.json(
      { ok: false, error: "Invalid analytics receipt" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  let payload: unknown;

  try {
    const body = await request.text();
    if (body.length > 2048) {
      throw new Error("Analytics receipt is too large");
    }
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid analytics receipt" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const parsed = parsePaidBeaconPayload(payload);

  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "Invalid analytics receipt" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const visitId = request.cookies.get(PAID_VISIT_COOKIE)?.value ?? "invalid";
  const receiptUrl = new URL(parsed.route, request.nextUrl.origin);
  receiptUrl.searchParams.set("utm_source", parsed.source);
  receiptUrl.searchParams.set("utm_medium", parsed.medium);
  receiptUrl.searchParams.set("utm_campaign", parsed.campaign);
  if (parsed.has_gclid) {
    receiptUrl.searchParams.set("gclid", "present");
  }
  const receipt = createPaidRequestReceipt({
    url: receiptUrl,
    userAgent:
      parsed.device_category === "mobile"
        ? "mobile"
        : parsed.device_category === "tablet"
          ? "tablet"
          : "desktop",
    referrer:
      parsed.referrer_host === "none" || parsed.referrer_host === "invalid"
        ? null
        : `https://${parsed.referrer_host}`,
    visitId,
    eventType: "paid_landing_client_beacon",
  });

  if (receipt && !request.cookies.has(PAID_BEACON_COOKIE)) {
    logPaidTrafficReceipt(receipt);
  }

  const response = NextResponse.json(
    { ok: true },
    { status: 202, headers: noStoreHeaders },
  );
  response.cookies.set(PAID_BEACON_COOKIE, "1", {
    httpOnly: true,
    maxAge: PAID_VISIT_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
