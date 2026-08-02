import { NextRequest, NextResponse } from "next/server";
import {
  PAID_REQUEST_COOKIE,
  PAID_VISIT_COOKIE,
  PAID_VISIT_MAX_AGE_SECONDS,
  createPaidRequestReceipt,
  logPaidTrafficReceipt,
} from "@/lib/paid-traffic-receipt";

function cookieOptions() {
  return {
    httpOnly: true,
    maxAge: PAID_VISIT_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const isProductionDiagnostics =
    request.nextUrl.pathname === "/internal/analytics-diagnostics" &&
    process.env.VERCEL_ENV === "production";

  if (isProductionDiagnostics) {
    return response;
  }

  const visitId =
    request.cookies.get(PAID_VISIT_COOKIE)?.value ??
    crypto.randomUUID().replaceAll("-", "").slice(0, 16);
  const receipt = createPaidRequestReceipt({
    url: request.nextUrl,
    userAgent: request.headers.get("user-agent") ?? "",
    referrer: request.headers.get("referer"),
    visitId,
  });

  if (receipt && !request.cookies.has(PAID_REQUEST_COOKIE)) {
    logPaidTrafficReceipt(receipt);
    response.cookies.set(PAID_REQUEST_COOKIE, "1", cookieOptions());
  }

  if (receipt && !request.cookies.has(PAID_VISIT_COOKIE)) {
    response.cookies.set(PAID_VISIT_COOKIE, visitId, cookieOptions());
  }

  return response;
}

export const config = {
  matcher: ["/png-to-svg", "/internal/analytics-diagnostics"],
};
