import {
  ServerJobRecord,
  getServerJob,
  getServerJobFinalOutputStatuses,
  getServerJobProductType,
  getServerJobProductPrice,
  markRecoveryEmailDisabled,
  markRecoveryEmailFailed,
  markRecoveryEmailSent,
} from "@/lib/server-job-store";
import { createRecoveryToken, getRecoveryExpiresAt } from "@/lib/recovery-token";
import { decryptRecoveryEmail } from "@/lib/secure-email";

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    "https://www.logocutsvg.com"
  ).replace(/\/+$/, "");
}

function getSupportEmail() {
  return (
    process.env.LOGOCUT_SUPPORT_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    "support@logocutsvg.com"
  );
}

function getEmailFrom() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "";
}

function getResendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

function getProductLabel(job: ServerJobRecord) {
  const productType = getServerJobProductType(job);

  if (productType === "complete_pack") {
    return "Complete SVG Pack";
  }

  return getServerJobProductPrice(job).productName.replace("LogoCut SVG - ", "");
}

function getAvailableDownloads(job: ServerJobRecord) {
  const productType = getServerJobProductType(job);

  if (productType === "complete_pack") {
    const statuses = getServerJobFinalOutputStatuses(job);
    return [
      statuses.single.ready ? "Single-Color SVG" : null,
      statuses.multi.ready ? "Layered SVG" : null,
    ].filter(Boolean) as string[];
  }

  return job.finalStatus === "ready" ? ["Clean SVG"] : [];
}

function buildEmail({
  job,
  recoveryUrl,
  expiresAt,
}: {
  job: ServerJobRecord;
  recoveryUrl: string;
  expiresAt: string;
}) {
  const product = getProductLabel(job);
  const downloads = getAvailableDownloads(job);
  const supportEmail = getSupportEmail();
  const expirationDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(expiresAt));

  const downloadList =
    downloads.length > 0
      ? downloads.map((download) => `- ${download}`).join("\n")
      : "- Your result page will show the current generation status.";

  const text = `Your LogoCut SVG download link is ready.

Purchased product: ${product}

Secure result link:
${recoveryUrl}

Available downloads:
${downloadList}

This recovery link expires on ${expirationDate}.

Need help? Contact ${supportEmail}.`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172017">
      <h1 style="font-size:24px">Your LogoCut SVG is ready</h1>
      <p><strong>Purchased product:</strong> ${product}</p>
      <p><a href="${recoveryUrl}" style="display:inline-block;background:#315f46;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Open secure result link</a></p>
      <p><strong>Available downloads:</strong></p>
      <ul>${downloads.length > 0 ? downloads.map((download) => `<li>${download}</li>`).join("") : "<li>Your result page will show the current generation status.</li>"}</ul>
      <p>This recovery link expires on ${expirationDate}.</p>
      <p>Need help? Contact <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
    </div>
  `;

  return { text, html, subject: "Your LogoCut SVG download link" };
}

export async function sendRecoveryEmailForJob(jobId: string) {
  const job = await getServerJob(jobId);

  if (!job || !job.recoveryEmailRequested) {
    return { sent: false, reason: "not_requested" as const };
  }

  if (job.recoveryEmailStatus === "sent") {
    return { sent: false, reason: "already_sent" as const };
  }

  const apiKey = getResendApiKey();
  const from = getEmailFrom();
  const email = decryptRecoveryEmail({
    encrypted: job.recoveryEmailEncrypted,
    iv: job.recoveryEmailIv,
    tag: job.recoveryEmailTag,
  });
  const expiresAt = job.recoveryTokenExpiresAt || getRecoveryExpiresAt();
  const token = createRecoveryToken({ jobId: job.id, expiresAt });

  if (!apiKey || !from || !email || !token) {
    await markRecoveryEmailDisabled(job.id);
    return { sent: false, reason: "not_configured" as const };
  }

  const recoveryUrl = `${getSiteUrl()}/recover/${encodeURIComponent(token)}`;
  const emailBody = buildEmail({ job, recoveryUrl, expiresAt });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: emailBody.subject,
        text: emailBody.text,
        html: emailBody.html,
      }),
    });

    if (!response.ok) {
      await markRecoveryEmailFailed(job.id);
      return { sent: false, reason: "provider_failed" as const };
    }

    await markRecoveryEmailSent(job.id, expiresAt);
    return { sent: true as const };
  } catch {
    await markRecoveryEmailFailed(job.id);
    return { sent: false, reason: "provider_failed" as const };
  }
}
