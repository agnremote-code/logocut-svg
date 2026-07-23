import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const UNSUBSCRIBE_PURPOSE = "marketing_unsubscribe";

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getMarketingTokenSecret(secret?: string) {
  return secret?.trim() || process.env.MARKETING_TOKEN_SECRET?.trim() || "";
}

export function createUnsubscribeToken(
  contactId: string,
  now = Date.now(),
  secret?: string,
) {
  const signingSecret = getMarketingTokenSecret(secret);

  if (!signingSecret) {
    throw new Error("Marketing token secret is not configured");
  }

  const payload = base64UrlEncode(
    JSON.stringify({
      purpose: UNSUBSCRIBE_PURPOSE,
      contactId,
      exp: Math.floor(now / 1000) + TOKEN_MAX_AGE_SECONDS,
    }),
  );
  const signature = createHmac("sha256", signingSecret)
    .update(payload)
    .digest();

  return `${payload}.${base64UrlEncode(signature)}`;
}

export function verifyUnsubscribeToken(
  token: string,
  now = Date.now(),
  secret?: string,
) {
  const signingSecret = getMarketingTokenSecret(secret);

  if (!signingSecret) {
    return { ok: false as const, error: "Unsubscribe is unavailable." };
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return { ok: false as const, error: "This unsubscribe link is invalid." };
  }

  const expectedSignature = createHmac("sha256", signingSecret)
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
