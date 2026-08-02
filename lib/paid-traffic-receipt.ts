export const PAID_VISIT_COOKIE = "lc_paid_visit";
export const PAID_REQUEST_COOKIE = "lc_paid_request";
export const PAID_BEACON_COOKIE = "lc_paid_beacon";
export const PAID_VISIT_MAX_AGE_SECONDS = 30 * 60;

export type CoarseDeviceCategory = "desktop" | "mobile" | "tablet";
export type PaidReceiptEvent =
  | "paid_landing_request"
  | "paid_landing_client_beacon";

export type PaidReceiptFields = {
  event_type: PaidReceiptEvent;
  timestamp_bucket: string;
  route: string;
  source: string;
  medium: string;
  campaign: string;
  has_gclid: boolean;
  has_utm: boolean;
  device_category: CoarseDeviceCategory;
  referrer_host: string;
  visit_id: string;
};

export type PaidBeaconPayload = Omit<
  PaidReceiptFields,
  "event_type" | "timestamp_bucket" | "visit_id"
> & {
  event_type: "paid_landing_client_beacon";
};

const SAFE_TOKEN = /^[A-Za-z0-9._~-]{1,80}$/;
const SAFE_ROUTE = /^\/[A-Za-z0-9/_-]{0,120}$/;
const SAFE_HOST = /^(?:[A-Za-z0-9-]+\.)*[A-Za-z0-9-]+(?::\d{1,5})?$/;

function safeToken(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim() ?? "";
  return SAFE_TOKEN.test(trimmed) ? trimmed : fallback;
}

export function getTimestampBucket(date = new Date()) {
  return `${date.toISOString().slice(0, 13)}:00:00Z`;
}

export function getCoarseDeviceCategory(
  userAgent: string,
): CoarseDeviceCategory {
  if (/ipad|tablet|playbook|silk/i.test(userAgent)) {
    return "tablet";
  }
  if (/mobile|iphone|ipod|android/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
}

export function getSafeReferrerHost(referrer: string | null | undefined) {
  if (!referrer) {
    return "none";
  }

  try {
    const host = new URL(referrer).host.toLowerCase();
    return SAFE_HOST.test(host) ? host : "invalid";
  } catch {
    return "invalid";
  }
}

export function createPaidRequestReceipt({
  url,
  userAgent,
  referrer,
  visitId,
  eventType = "paid_landing_request",
  now = new Date(),
}: {
  url: URL;
  userAgent: string;
  referrer?: string | null;
  visitId: string;
  eventType?: PaidReceiptEvent;
  now?: Date;
}): PaidReceiptFields | null {
  const source = safeToken(url.searchParams.get("utm_source"), "unknown");
  const medium = safeToken(url.searchParams.get("utm_medium"), "unknown");
  const campaign = safeToken(url.searchParams.get("utm_campaign"), "unknown");
  const hasGclid = Boolean(
    url.searchParams.get("gclid") ||
      url.searchParams.get("gbraid") ||
      url.searchParams.get("wbraid"),
  );
  const hasUtm = ["utm_source", "utm_medium", "utm_campaign"].some((key) =>
    Boolean(url.searchParams.get(key)),
  );
  const isPaid = hasGclid || medium.toLowerCase() === "cpc";

  if (!isPaid || !SAFE_ROUTE.test(url.pathname)) {
    return null;
  }

  return {
    event_type: eventType,
    timestamp_bucket: getTimestampBucket(now),
    route: url.pathname,
    source,
    medium,
    campaign,
    has_gclid: hasGclid,
    has_utm: hasUtm,
    device_category: getCoarseDeviceCategory(userAgent),
    referrer_host: getSafeReferrerHost(referrer),
    visit_id: safeToken(visitId, "invalid"),
  };
}

export function parsePaidBeaconPayload(value: unknown): PaidBeaconPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "event_type",
    "route",
    "source",
    "medium",
    "campaign",
    "has_gclid",
    "has_utm",
    "device_category",
    "referrer_host",
  ]);

  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) {
    return null;
  }

  if (
    payload.event_type !== "paid_landing_client_beacon" ||
    typeof payload.route !== "string" ||
    !SAFE_ROUTE.test(payload.route) ||
    typeof payload.source !== "string" ||
    !SAFE_TOKEN.test(payload.source) ||
    typeof payload.medium !== "string" ||
    !SAFE_TOKEN.test(payload.medium) ||
    typeof payload.campaign !== "string" ||
    !SAFE_TOKEN.test(payload.campaign) ||
    typeof payload.has_gclid !== "boolean" ||
    typeof payload.has_utm !== "boolean" ||
    (payload.device_category !== "desktop" &&
      payload.device_category !== "mobile" &&
      payload.device_category !== "tablet") ||
    typeof payload.referrer_host !== "string" ||
    (payload.referrer_host !== "none" &&
      payload.referrer_host !== "invalid" &&
      !SAFE_HOST.test(payload.referrer_host))
  ) {
    return null;
  }

  if (!payload.has_gclid && payload.medium.toLowerCase() !== "cpc") {
    return null;
  }

  return payload as PaidBeaconPayload;
}

export function logPaidTrafficReceipt(receipt: PaidReceiptFields) {
  console.info("[LogoCut measurement]", receipt);
}

export function preserveQueryOnCanonicalUrl(input: string, origin: string) {
  const incoming = new URL(input, origin);
  const canonical = new URL(incoming.pathname, origin);
  canonical.search = incoming.search;
  canonical.hash = incoming.hash;
  return canonical.toString();
}
