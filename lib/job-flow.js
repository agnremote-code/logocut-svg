export function canCheckoutJob(job) {
  return Boolean(
    job &&
      job.paymentStatus === "unpaid" &&
      job.previewStatus === "ready" &&
      (job.previewPathname || job.previewBlobPath || job.previewSvgBuffer) &&
      (!job.settingsHash || job.previewSettingsHash === job.settingsHash),
  );
}

export function canDownloadJob(job) {
  return Boolean(
    job &&
      job.paymentStatus === "paid" &&
      job.finalStatus === "ready" &&
      (job.finalPathname || job.finalBlobPath || job.finalSvgBuffer),
  );
}

export function canonicalStateForLegacyJob(job) {
  if (job.canonicalState) return job.canonicalState;
  if (job.paymentStatus === "paid" && job.finalStatus === "ready") return "final_svg_ready";
  if (job.paymentStatus === "paid" && job.finalStatus === "processing") return "final_svg_generating";
  if (job.paymentStatus === "paid") return "paid";
  if (job.previewStatus === "ready" && job.paypalOrderId) return "checkout_ready";
  if (job.previewStatus === "ready") return "preview_ready";
  if (job.previewStatus === "processing") return "preview_generating";
  if (job.previewStatus === "failed") return "preview_failed";
  return "uploaded";
}
