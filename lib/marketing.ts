import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveAppUrl } from "@/lib/app-url";

export type MarketingConsentSource =
  | "preview_inline"
  | "post_purchase_result";

export type MarketingSignupInput = {
  email: unknown;
  consent: unknown;
  source: unknown;
  utm?: {
    source?: unknown;
    medium?: unknown;
    campaign?: unknown;
  };
};

type MarketingContact = {
  id: string;
  normalized_email: string;
};

const EMAIL_MAX_LENGTH = 254;
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const UNSUBSCRIBE_PURPOSE = "marketing_unsubscribe";

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getMarketingTokenSecret() {
  return process.env.MARKETING_TOKEN_SECRET?.trim() || "";
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

function getSafeUtmValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 120) : null;
}

export function normalizeMarketingEmail(value: unknown) {
  if (typeof value !== "string") {
    return { ok: false as const, error: "Enter a valid email address." };
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > EMAIL_MAX_LENGTH || /\s/.test(trimmed)) {
    return { ok: false as const, error: "Enter a valid email address." };
  }

  const atIndex = trimmed.lastIndexOf("@");
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1).toLowerCase();
  const normalizedEmail = `${local}@${domain}`;

  if (
    atIndex <= 0 ||
    !local ||
    !domain ||
    domain.length > 253 ||
    !domain.includes(".") ||
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return { ok: false as const, error: "Enter a valid email address." };
  }

  return { ok: true as const, email: normalizedEmail };
}

export function normalizeMarketingSignupInput(input: MarketingSignupInput) {
  const normalizedEmail = normalizeMarketingEmail(input.email);

  if (!normalizedEmail.ok) {
    return normalizedEmail;
  }

  if (input.consent !== true) {
    return {
      ok: false as const,
      error: "Please check the consent box to join the email list.",
    };
  }

  const source: MarketingConsentSource =
    input.source === "post_purchase_result"
      ? "post_purchase_result"
      : "preview_inline";

  return {
    ok: true as const,
    email: normalizedEmail.email,
    source,
    utm: {
      utm_source: getSafeUtmValue(input.utm?.source),
      utm_medium: getSafeUtmValue(input.utm?.medium),
      utm_campaign: getSafeUtmValue(input.utm?.campaign),
    },
  };
}

export function createUnsubscribeToken(contactId: string, now = Date.now()) {
  const secret = getMarketingTokenSecret();

  if (!secret) {
    throw new Error("Marketing token secret is not configured");
  }

  const payload = base64UrlEncode(
    JSON.stringify({
      purpose: UNSUBSCRIBE_PURPOSE,
      contactId,
      exp: Math.floor(now / 1000) + TOKEN_MAX_AGE_SECONDS,
    }),
  );
  const signature = createHmac("sha256", secret).update(payload).digest();

  return `${payload}.${base64UrlEncode(signature)}`;
}

export function verifyUnsubscribeToken(token: string, now = Date.now()) {
  const secret = getMarketingTokenSecret();

  if (!secret) {
    return { ok: false as const, error: "Unsubscribe is unavailable." };
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return { ok: false as const, error: "This unsubscribe link is invalid." };
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest();
  const receivedSignature = Buffer.from(signature, "base64url");

  if (
    receivedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    return { ok: false as const, error: "This unsubscribe link is invalid." };
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as {
      purpose?: string;
      contactId?: string;
      exp?: number;
    };

    if (
      decoded.purpose !== UNSUBSCRIBE_PURPOSE ||
      !decoded.contactId ||
      typeof decoded.exp !== "number"
    ) {
      return { ok: false as const, error: "This unsubscribe link is invalid." };
    }

    if (decoded.exp < Math.floor(now / 1000)) {
      return { ok: false as const, error: "This unsubscribe link has expired." };
    }

    return { ok: true as const, contactId: decoded.contactId };
  } catch {
    return { ok: false as const, error: "This unsubscribe link is invalid." };
  }
}

async function supabaseRequest<T>({
  path,
  method,
  body,
  prefer,
}: {
  path: string;
  method: "POST" | "PATCH";
  body: unknown;
  prefer?: string;
}) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Supabase is not configured");
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}`);
  }

  return response.status === 204 ? null : ((await response.json()) as T);
}

export async function upsertMarketingContact(input: {
  normalizedEmail: string;
  source: MarketingConsentSource;
  utm: {
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
  };
}) {
  const now = new Date().toISOString();
  const contacts = await supabaseRequest<MarketingContact[]>({
    path: "marketing_contacts?on_conflict=normalized_email",
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      normalized_email: input.normalizedEmail,
      consent_status: "subscribed",
      consent_at: now,
      consent_source: input.source,
      unsubscribed_at: null,
      updated_at: now,
      ...input.utm,
    },
  });
  const contact = contacts?.[0];

  if (!contact?.id) {
    throw new Error("Marketing contact was not returned");
  }

  return contact;
}

export async function unsubscribeMarketingContact(contactId: string) {
  const now = new Date().toISOString();
  await supabaseRequest<null>({
    path: `marketing_contacts?id=eq.${encodeURIComponent(contactId)}`,
    method: "PATCH",
    prefer: "return=minimal",
    body: {
      consent_status: "unsubscribed",
      unsubscribed_at: now,
      updated_at: now,
    },
  });
}

export async function sendMarketingConfirmationEmail(input: {
  email: string;
  contactId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    return { sent: false, reason: "email_not_configured" as const };
  }

  let unsubscribeToken: string;

  try {
    unsubscribeToken = createUnsubscribeToken(input.contactId);
  } catch {
    return { sent: false, reason: "token_not_configured" as const };
  }

  const unsubscribeUrl = `${resolveAppUrl()}/unsubscribe/${encodeURIComponent(
    unsubscribeToken,
  )}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.email,
      subject: "You’re on the LogoCut deals list",
      text: [
        "You’re on the LogoCut deals list.",
        "",
        "We’ll send occasional discounts, product updates and new features for LogoCut SVG.",
        "",
        "Support: support@logocutsvg.com",
        "",
        `Unsubscribe anytime: ${unsubscribeUrl}`,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172017">
          <h1 style="font-size:24px">You’re on the LogoCut deals list</h1>
          <p>We’ll send occasional discounts, product updates and new features for LogoCut SVG.</p>
          <p>Support: <a href="mailto:support@logocutsvg.com">support@logocutsvg.com</a></p>
          <p><a href="${unsubscribeUrl}">Unsubscribe anytime</a></p>
        </div>
      `,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return { sent: false, reason: "provider_failed" as const };
  }

  return { sent: true, reason: null };
}
