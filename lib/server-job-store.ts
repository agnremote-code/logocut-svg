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
  svgBuffer?: Buffer;
  svgContentType?: "image/svg+xml";
  vectorizerError?: string;
  vectorizerStatus?: number;
  vectorizerMode?: "test";
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
    status: "awaiting_payment",
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

  if (job.status === "awaiting_payment") {
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

export function saveServerJobSvg({
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
  job.svgBuffer = svgBuffer;
  job.svgContentType = "image/svg+xml";
  job.vectorizerMode = "test";
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
}: {
  jobId: string;
  error: string;
  status?: number;
}) {
  const job = getServerJob(jobId);

  if (!job) {
    return null;
  }

  job.status = "failed";
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
