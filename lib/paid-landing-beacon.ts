import type { PaidBeaconPayload } from "@/lib/paid-traffic-receipt";

type BeaconNavigator = {
  sendBeacon?: (url: string, data?: BodyInit | null) => boolean;
};

export async function sendPaidLandingBeacon(
  payload: PaidBeaconPayload,
  options: {
    navigator?: BeaconNavigator;
    fetcher?: typeof fetch;
  } = {},
) {
  const body = JSON.stringify(payload);
  const navigatorApi =
    options.navigator ??
    (typeof navigator === "undefined" ? undefined : navigator);
  const beaconAccepted = navigatorApi?.sendBeacon?.(
    "/api/analytics/paid-landing",
    new Blob([body], { type: "application/json" }),
  );

  if (beaconAccepted) {
    return "beacon" as const;
  }

  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher("/api/analytics/paid-landing", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });

  return response.ok ? ("fetch" as const) : ("failed" as const);
}
