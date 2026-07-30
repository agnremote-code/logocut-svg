import type { PaidAttribution } from "./attribution";

export type DeviceCategory = "desktop" | "mobile" | "tablet";

export function getDeviceCategory({
  userAgent,
  viewportWidth,
}: {
  userAgent: string;
  viewportWidth: number;
}): DeviceCategory {
  if (/ipad|tablet|playbook|silk/i.test(userAgent)) {
    return "tablet";
  }

  if (/mobile|iphone|ipod|android/i.test(userAgent) || viewportWidth < 768) {
    return "mobile";
  }

  return "desktop";
}

export function createPaidLandingMetadata({
  attribution,
  sourcePage,
  userAgent,
  viewportWidth,
}: {
  attribution: PaidAttribution;
  sourcePage: string;
  userAgent: string;
  viewportWidth: number;
}) {
  const hasUtm = Boolean(
    attribution.utm_source ||
      attribution.utm_medium ||
      attribution.utm_campaign ||
      attribution.utm_content ||
      attribution.utm_term,
  );

  return {
    source_page: sourcePage,
    source: attribution.utm_source ?? "direct",
    medium: attribution.utm_medium ?? "none",
    campaign: attribution.utm_campaign ?? "none",
    device_category: getDeviceCategory({ userAgent, viewportWidth }),
    has_gclid: Boolean(attribution.gclid),
    has_utm: hasUtm,
  };
}
