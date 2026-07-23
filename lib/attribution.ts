"use client";

export const ATTRIBUTION_STORAGE_KEY = "logocut_paid_attribution_v1";
export const ATTRIBUTION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export type PaidAttribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
};

type StoredAttribution = PaidAttribution & {
  captured_at: number;
};

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
] as const;

const CLICK_ID_KEYS = new Set(["gclid", "gbraid", "wbraid"]);

function sanitizeAttributionValue(key: string, value: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const maxLength = CLICK_ID_KEYS.has(key) ? 256 : 120;

  if (
    !trimmed ||
    trimmed.length > maxLength ||
    /[\r\n]/.test(trimmed) ||
    /%40/i.test(trimmed) ||
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(trimmed)
  ) {
    return undefined;
  }

  if (CLICK_ID_KEYS.has(key) && !/^[A-Za-z0-9._~-]+$/.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

export function parseAttributionSearch(search: string): PaidAttribution {
  const params = new URLSearchParams(search);
  const attribution: PaidAttribution = {};

  for (const key of ATTRIBUTION_KEYS) {
    const value = sanitizeAttributionValue(key, params.get(key));

    if (value) {
      attribution[key] = value;
    }
  }

  return attribution;
}

function isDirectMarker(attribution: PaidAttribution) {
  const source = attribution.utm_source?.toLowerCase();
  const medium = attribution.utm_medium?.toLowerCase();
  const hasClickId = Boolean(
    attribution.gclid || attribution.gbraid || attribution.wbraid,
  );

  return (
    !hasClickId &&
    (source === "direct" ||
      source === "(direct)" ||
      medium === "direct" ||
      medium === "(none)")
  );
}

export function readStoredAttribution(
  storedValue: string | null,
  now = Date.now(),
): PaidAttribution {
  if (!storedValue) {
    return {};
  }

  try {
    const stored = JSON.parse(storedValue) as StoredAttribution;

    if (
      typeof stored.captured_at !== "number" ||
      now - stored.captured_at > ATTRIBUTION_MAX_AGE_MS ||
      now < stored.captured_at
    ) {
      return {};
    }

    return Object.fromEntries(
      ATTRIBUTION_KEYS.flatMap((key) => {
        const value = sanitizeAttributionValue(
          key,
          typeof stored[key] === "string" ? stored[key] : null,
        );

        return value ? [[key, value]] : [];
      }),
    ) as PaidAttribution;
  } catch {
    return {};
  }
}

export function resolveAttribution({
  search,
  storedValue,
  now = Date.now(),
}: {
  search: string;
  storedValue: string | null;
  now?: number;
}) {
  const incoming = parseAttributionSearch(search);
  const hasIncoming = Object.keys(incoming).length > 0;

  if (hasIncoming && !isDirectMarker(incoming)) {
    return {
      attribution: incoming,
      storedValue: JSON.stringify({
        ...incoming,
        captured_at: now,
      } satisfies StoredAttribution),
      shouldPersist: true,
    };
  }

  return {
    attribution: readStoredAttribution(storedValue, now),
    storedValue,
    shouldPersist: false,
  };
}

export function getCurrentAttribution(): PaidAttribution {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    const resolved = resolveAttribution({
      search: window.location.search,
      storedValue,
    });

    if (resolved.shouldPersist && resolved.storedValue) {
      window.localStorage.setItem(
        ATTRIBUTION_STORAGE_KEY,
        resolved.storedValue,
      );
    }

    return resolved.attribution;
  } catch {
    return parseAttributionSearch(window.location.search);
  }
}
