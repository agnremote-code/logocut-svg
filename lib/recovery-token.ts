import { createHmac, timingSafeEqual } from "node:crypto";

export const RECOVERY_TOKEN_TTL_DAYS = 14;

type RecoveryTokenPayload = {
  jobId: string;
  exp: number;
  nonce: string;
};

type RecoveryTokenResult =
  | {
      ok: true;
      jobId: string;
      expiresAt: string;
    }
  | {
      ok: false;
      reason: "missing_secret" | "invalid" | "expired";
    };

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64");
}

function getRecoverySecret() {
  return process.env.RECOVERY_TOKEN_SECRET?.trim() || "";
}

function signPayload(encodedPayload: string, secret: string) {
  return base64UrlEncode(
    createHmac("sha256", secret).update(encodedPayload).digest(),
  );
}

export function isRecoveryConfigured() {
  return Boolean(getRecoverySecret());
}

export function getRecoveryExpiresAt(now = new Date()) {
  return new Date(
    now.getTime() + RECOVERY_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function createRecoveryToken({
  jobId,
  expiresAt = getRecoveryExpiresAt(),
}: {
  jobId: string;
  expiresAt?: string;
}) {
  const secret = getRecoverySecret();

  if (!secret) {
    return null;
  }

  const payload: RecoveryTokenPayload = {
    jobId,
    exp: Math.floor(new Date(expiresAt).getTime() / 1000),
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyRecoveryToken(token: string): RecoveryTokenResult {
  const secret = getRecoverySecret();

  if (!secret) {
    return { ok: false, reason: "missing_secret" };
  }

  const [encodedPayload, signature, extra] = token.split(".");

  if (!encodedPayload || !signature || extra) {
    return { ok: false, reason: "invalid" };
  }

  const expectedSignature = signPayload(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { ok: false, reason: "invalid" };
  }

  try {
    const payload = JSON.parse(
      base64UrlDecode(encodedPayload).toString("utf8"),
    ) as Partial<RecoveryTokenPayload>;

    if (
      typeof payload.jobId !== "string" ||
      typeof payload.exp !== "number" ||
      typeof payload.nonce !== "string"
    ) {
      return { ok: false, reason: "invalid" };
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return { ok: false, reason: "expired" };
    }

    return {
      ok: true,
      jobId: payload.jobId,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export function verifyRecoveryTokenForJob(token: string, jobId: string) {
  const result = verifyRecoveryToken(token);

  if (!result.ok) {
    return result;
  }

  if (result.jobId !== jobId) {
    return { ok: false as const, reason: "invalid" as const };
  }

  return result;
}
