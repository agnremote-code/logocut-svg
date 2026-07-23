import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

export type EncryptedEmail = {
  encrypted: string;
  iv: string;
  tag: string;
  hash: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getEmailSecret() {
  return process.env.RECOVERY_TOKEN_SECRET?.trim() || "";
}

function getEncryptionKey(secret: string) {
  return createHash("sha256").update(`logocut-email:${secret}`).digest();
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

export function validateOptionalEmail(value: unknown) {
  const email = normalizeEmail(value);

  if (!email) {
    return { ok: true as const, email: "" };
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false as const, error: "Invalid email address." };
  }

  return { ok: true as const, email };
}

export function canStoreRecoveryEmail() {
  return Boolean(getEmailSecret());
}

export function encryptRecoveryEmail(email: string): EncryptedEmail | null {
  const secret = getEmailSecret();

  if (!secret) {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(email, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const hash = createHmac("sha256", secret).update(email).digest("hex");

  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    hash,
  };
}

export function decryptRecoveryEmail(input: {
  encrypted?: string;
  iv?: string;
  tag?: string;
}) {
  const secret = getEmailSecret();

  if (!secret || !input.encrypted || !input.iv || !input.tag) {
    return null;
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(secret),
      Buffer.from(input.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(input.tag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(input.encrypted, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
