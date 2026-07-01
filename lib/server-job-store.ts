import {
  CutType,
  JobStatus,
  JobSummary,
  PaymentStatus,
} from "@/lib/job-types";

type ServerJobRecord = JobSummary & {
  imageBuffer: Buffer;
  paymentStatus: PaymentStatus;
  checkoutSessionId?: string;
  paidAt?: string;
  previewSvgBuffer?: Buffer;
  finalSvgBuffer?: Buffer;
  svgContentType?: "image/svg+xml";
  previewError?: string;
  previewStatus?: number;
  finalError?: string;
  finalStatus?: number;
  vectorizerError?: string;
  vectorizerStatus?: number;
  vectorizerMode?: "test" | "production";
  creditsCalculated?: string | null;
  creditsCharged?: string | null;
};

type CreateServerJobInput = {
  fileName: string;
  fileType: string;
  fileSize: number;
  cutType: CutType;
  imageBuffer: Buffer;
};

const serverJobStore = globalThis as typeof globalThis & {
  logoCutJobs?: Map<string, ServerJobRecord>;
};

function getJobs() {
  if (!serverJobStore.logoCutJobs) {
    serverJobStore.logoCutJobs = new Map<string, ServerJobRecord>();
  }

  return serverJobStore.logoCutJobs;
}

export function createServerJob(input: CreateServerJobInput) {
  const job: ServerJobRecord = {
    id: crypto.randomUUID(),
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
    cutType: input.cutType,
    imageBuffer: input.imageBuffer,
    createdAt: new Date().toISOString(),
    status: "created",
    paymentStatus: "unpaid",
  };

  getJobs().set(job.id, job);

  return job;
}

export function getServerJob(jobId: string) {
  return getJobs().get(jobId) ?? null;
}

export function saveCheckoutSession({
  jobId,
  checkoutSessionId,
}: {
  jobId: string;
  checkoutSessionId: string;
}) {
  const job = getServerJob(jobId);

  if (!job) {
    return null;
  }

  job.checkoutSessionId = checkoutSessionId;
  job.paymentStatus = "unpaid";
  job.status = "awaiting_payment";
  getJobs().set(jobId, job);

  return job;
}

export function markServerJobPaid({
  jobId,
  checkoutSessionId,
}: {
  jobId: string;
  checkoutSessionId: string;
}) {
  const job = getServerJob(jobId);

  if (!job) {
    return null;
  }

  job.checkoutSessionId = checkoutSessionId;
  job.paymentStatus = "paid";
  job.paidAt = new Date().toISOString();

  if (job.status === "awaiting_payment" || job.status === "preview_ready") {
    job.status = "created";
  }

  getJobs().set(jobId, job);

  return job;
}

export function updateServerJobStatus(jobId: string, status: JobStatus) {
  const job = getServerJob(jobId);

  if (!job) {
    return null;
  }

  job.status = status;
  getJobs().set(jobId, job);

  return job;
}

export function saveServerJobPreviewSvg({
  jobId,
  svgBuffer,
  creditsCalculated,
  creditsCharged,
}: {
  jobId: string;
  svgBuffer: Buffer;
  creditsCalculated: string | null;
  creditsCharged: string | null;
}) {
  const job = getServerJob(jobId);

  if (!job) {
    return null;
  }

  job.status = "preview_ready";
  job.previewSvgBuffer = svgBuffer;
  job.svgContentType = "image/svg+xml";
  job.vectorizerMode = "test";
  job.previewError = undefined;
  job.previewStatus = undefined;
  job.creditsCalculated = creditsCalculated;
  job.creditsCharged = creditsCharged;
  job.vectorizerError = undefined;
  job.vectorizerStatus = undefined;
  getJobs().set(jobId, job);

  return job;
}

export function saveServerJobFinalSvg({
  jobId,
  svgBuffer,
  creditsCalculated,
  creditsCharged,
}: {
  jobId: string;
  svgBuffer: Buffer;
  creditsCalculated: string | null;
  creditsCharged: string | null;
}) {
  const job = getServerJob(jobId);

  if (!job) {
    return null;
  }

  job.status = "ready";
  job.finalSvgBuffer = svgBuffer;
  job.svgContentType = "image/svg+xml";
  job.vectorizerMode = "production";
  job.finalError = undefined;
  job.finalStatus = undefined;
  job.creditsCalculated = creditsCalculated;
  job.creditsCharged = creditsCharged;
  job.vectorizerError = undefined;
  job.vectorizerStatus = undefined;
  getJobs().set(jobId, job);

  return job;
}

export function saveServerJobError({
  jobId,
  error,
  status,
  stage = "final",
}: {
  jobId: string;
  error: string;
  status?: number;
  stage?: "preview" | "final";
}) {
  const job = getServerJob(jobId);

  if (!job) {
    return null;
  }

  job.status = "failed";
  if (stage === "preview") {
    job.previewError = error;
    job.previewStatus = status;
  } else {
    job.finalError = error;
    job.finalStatus = status;
  }
  job.vectorizerError = error;
  job.vectorizerStatus = status;
  getJobs().set(jobId, job);

  return job;
}

export function toJobSummary(job: ServerJobRecord): JobSummary {
  return {
    id: job.id,
    fileName: job.fileName,
    fileType: job.fileType,
    fileSize: job.fileSize,
    cutType: job.cutType,
    createdAt: job.createdAt,
    status: job.status,
    paymentStatus: job.paymentStatus,
  };
}
