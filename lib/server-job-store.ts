import { BlobError, BlobNotFoundError, head, put } from "@vercel/blob";
import {
  CutType,
  JobStatus,
  JobSummary,
  PaymentStatus,
} from "@/lib/job-types";
import { getCutPrice } from "@/lib/pricing";

type VectorizerMode = "test" | "production";
type StoredFileStatus = "not_started" | "processing" | "ready" | "failed";

export type ServerJobRecord = JobSummary & {
  jobId: string;
  price: string;
  paymentStatus: PaymentStatus;
  previewStatus: StoredFileStatus;
  finalStatus: StoredFileStatus;
  vectorizerMode?: VectorizerMode;
  creditsCalculated?: string | null;
  creditsCharged?: string | null;
  checkoutSessionId?: string;
  paidAt?: string;
  originalBlobPath?: string;
  originalImageUrl?: string;
  previewBlobPath?: string;
  previewSvgUrl?: string;
  finalBlobPath?: string;
  finalSvgUrl?: string;
  svgContentType?: "image/svg+xml";
  previewError?: string;
  previewHttpStatus?: number;
  finalError?: string;
  finalHttpStatus?: number;
  vectorizerError?: string;
  vectorizerStatus?: number;
  errorMessages: string[];
  updatedAt: string;
};

type MemoryServerJobRecord = ServerJobRecord & {
  imageBuffer: Buffer;
  previewSvgBuffer?: Buffer;
  finalSvgBuffer?: Buffer;
};

type CreateServerJobInput = {
  fileName: string;
  fileType: string;
  fileSize: number;
  cutType: CutType;
  imageBuffer: Buffer;
};

type SaveSvgInput = {
  jobId: string;
  svgBuffer: Buffer;
  creditsCalculated: string | null;
  creditsCharged: string | null;
};

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Storage is not configured");
    this.name = "StorageNotConfiguredError";
  }
}

const serverJobStore = globalThis as typeof globalThis & {
  logoCutJobs?: Map<string, MemoryServerJobRecord>;
};

function getMemoryJobs() {
  if (!serverJobStore.logoCutJobs) {
    serverJobStore.logoCutJobs = new Map<string, MemoryServerJobRecord>();
  }

  return serverJobStore.logoCutJobs;
}

function hasBlobReadWriteToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function hasBlobStoreId() {
  return Boolean(process.env.BLOB_STORE_ID?.trim());
}

function hasAnyBlobEnvironment() {
  return hasBlobReadWriteToken() || hasBlobStoreId();
}

function hasDurableStorageConfig() {
  return hasAnyBlobEnvironment();
}

function shouldUseMemoryStorage() {
  return process.env.NODE_ENV !== "production" && !hasAnyBlobEnvironment();
}

function assertDurableStorageConfigured() {
  if (!hasDurableStorageConfig()) {
    throw new StorageNotConfiguredError();
  }
}

function getBlobCommandOptions() {
  const storeId = process.env.BLOB_STORE_ID?.trim();
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();

  return {
    ...(storeId ? { storeId } : {}),
    ...(oidcToken ? { oidcToken } : {}),
  };
}

function isBlobConfigurationError(error: unknown) {
  if (error instanceof StorageNotConfiguredError) {
    return true;
  }

  if (!(error instanceof BlobError)) {
    return false;
  }

  return /credentials|token|store|auth|access/i.test(error.message);
}

function getJobFolder(jobId: string) {
  return `jobs/${jobId}`;
}

function getMetadataPath(jobId: string) {
  return `${getJobFolder(jobId)}/metadata.json`;
}

function getOriginalFileName(input: Pick<CreateServerJobInput, "fileName" | "fileType">) {
  if (input.fileType === "image/png") {
    return "original.png";
  }

  if (input.fileType === "image/jpeg") {
    const extension = input.fileName.toLowerCase().endsWith(".jpeg")
      ? "jpeg"
      : "jpg";

    return `original.${extension}`;
  }

  const extension = input.fileName.split(".").pop()?.toLowerCase();
  return extension ? `original.${extension}` : "original";
}

function createBaseJob(input: CreateServerJobInput): ServerJobRecord {
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    id: jobId,
    jobId,
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
    cutType: input.cutType,
    price: getCutPrice(input.cutType).label,
    createdAt: now,
    updatedAt: now,
    status: "created",
    paymentStatus: "unpaid",
    previewStatus: "not_started",
    finalStatus: "not_started",
    errorMessages: [],
  };
}

async function saveDurableJob(job: ServerJobRecord) {
  assertDurableStorageConfigured();

  try {
    await put(getMetadataPath(job.id), JSON.stringify(job, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      ...getBlobCommandOptions(),
    });
  } catch (error) {
    if (isBlobConfigurationError(error)) {
      throw new StorageNotConfiguredError();
    }

    throw error;
  }

  return job;
}

async function putDurableFile({
  jobId,
  filename,
  body,
  contentType,
}: {
  jobId: string;
  filename: string;
  body: Buffer;
  contentType: string;
}) {
  assertDurableStorageConfigured();

  const pathname = `jobs/${jobId}/${filename}`;
  let blob;

  try {
    blob = await put(pathname, body, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      ...getBlobCommandOptions(),
    });
  } catch (error) {
    if (isBlobConfigurationError(error)) {
      throw new StorageNotConfiguredError();
    }

    throw error;
  }

  return {
    pathname: blob.pathname,
    url: blob.url,
  };
}

async function readDurableFile(url?: string) {
  if (!url) {
    return null;
  }

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not read stored file. Status ${response.status}.`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function isMemoryJob(job: ServerJobRecord): job is MemoryServerJobRecord {
  return "imageBuffer" in job && Buffer.isBuffer(job.imageBuffer);
}

async function updateServerJob(
  jobId: string,
  update: (job: ServerJobRecord) => void,
) {
  const job = await getServerJob(jobId);

  if (!job) {
    return null;
  }

  update(job);
  job.updatedAt = new Date().toISOString();

  if (shouldUseMemoryStorage() && isMemoryJob(job)) {
    getMemoryJobs().set(jobId, job);
    return job;
  }

  return saveDurableJob(job);
}

export function isStorageNotConfiguredError(error: unknown) {
  return error instanceof StorageNotConfiguredError;
}

export function getStorageNotConfiguredResponseBody() {
  return { error: "Storage is not configured" };
}

export async function createServerJob(input: CreateServerJobInput) {
  const baseJob = createBaseJob(input);

  if (shouldUseMemoryStorage()) {
    const job: MemoryServerJobRecord = {
      ...baseJob,
      imageBuffer: input.imageBuffer,
    };

    getMemoryJobs().set(job.id, job);
    return job;
  }

  const originalFile = await putDurableFile({
    jobId: baseJob.id,
    filename: getOriginalFileName(input),
    body: input.imageBuffer,
    contentType: input.fileType,
  });

  return saveDurableJob({
    ...baseJob,
    originalBlobPath: originalFile.pathname,
    originalImageUrl: originalFile.url,
  });
}

export async function getServerJob(jobId: string) {
  if (shouldUseMemoryStorage()) {
    return getMemoryJobs().get(jobId) ?? null;
  }

  assertDurableStorageConfigured();

  try {
    const metadata = await head(getMetadataPath(jobId), getBlobCommandOptions());
    const response = await fetch(metadata.url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Could not read job metadata. Status ${response.status}.`);
    }

    return (await response.json()) as ServerJobRecord;
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return null;
    }

    if (isBlobConfigurationError(error)) {
      throw new StorageNotConfiguredError();
    }

    throw error;
  }
}

export async function saveCheckoutSession({
  jobId,
  checkoutSessionId,
}: {
  jobId: string;
  checkoutSessionId: string;
}) {
  return updateServerJob(jobId, (job) => {
    job.checkoutSessionId = checkoutSessionId;
    job.paymentStatus = "unpaid";
    job.status = "awaiting_payment";
  });
}

export async function markServerJobPaid({
  jobId,
  checkoutSessionId,
}: {
  jobId: string;
  checkoutSessionId: string;
}) {
  return updateServerJob(jobId, (job) => {
    job.checkoutSessionId = checkoutSessionId;
    job.paymentStatus = "paid";
    job.paidAt = new Date().toISOString();

    if (job.status === "awaiting_payment" || job.status === "preview_ready") {
      job.status = "created";
    }
  });
}

export async function updateServerJobStatus(jobId: string, status: JobStatus) {
  return updateServerJob(jobId, (job) => {
    job.status = status;

    if (status === "previewing") {
      job.previewStatus = "processing";
    }

    if (status === "processing") {
      job.finalStatus = "processing";
    }
  });
}

export async function saveServerJobPreviewSvg({
  jobId,
  svgBuffer,
  creditsCalculated,
  creditsCharged,
}: SaveSvgInput) {
  const previewFile = shouldUseMemoryStorage()
    ? undefined
    : await putDurableFile({
        jobId,
        filename: "preview.svg",
        body: svgBuffer,
        contentType: "image/svg+xml",
      });

  return updateServerJob(jobId, (job) => {
    if (isMemoryJob(job)) {
      job.previewSvgBuffer = svgBuffer;
    }

    job.status = "preview_ready";
    job.previewStatus = "ready";
    job.previewBlobPath = previewFile?.pathname ?? job.previewBlobPath;
    job.previewSvgUrl = previewFile?.url ?? job.previewSvgUrl;
    job.svgContentType = "image/svg+xml";
    job.vectorizerMode = "test";
    job.previewError = undefined;
    job.previewHttpStatus = undefined;
    job.creditsCalculated = creditsCalculated;
    job.creditsCharged = creditsCharged;
    job.vectorizerError = undefined;
    job.vectorizerStatus = undefined;
  });
}

export async function saveServerJobFinalSvg({
  jobId,
  svgBuffer,
  creditsCalculated,
  creditsCharged,
}: SaveSvgInput) {
  const finalFile = shouldUseMemoryStorage()
    ? undefined
    : await putDurableFile({
        jobId,
        filename: "final.svg",
        body: svgBuffer,
        contentType: "image/svg+xml",
      });

  return updateServerJob(jobId, (job) => {
    if (isMemoryJob(job)) {
      job.finalSvgBuffer = svgBuffer;
    }

    job.status = "ready";
    job.finalStatus = "ready";
    job.finalBlobPath = finalFile?.pathname ?? job.finalBlobPath;
    job.finalSvgUrl = finalFile?.url ?? job.finalSvgUrl;
    job.svgContentType = "image/svg+xml";
    job.vectorizerMode = "production";
    job.finalError = undefined;
    job.finalHttpStatus = undefined;
    job.creditsCalculated = creditsCalculated;
    job.creditsCharged = creditsCharged;
    job.vectorizerError = undefined;
    job.vectorizerStatus = undefined;
  });
}

export async function saveServerJobError({
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
  return updateServerJob(jobId, (job) => {
    job.status = "failed";
    job.errorMessages = Array.from(new Set([...job.errorMessages, error]));

    if (stage === "preview") {
      job.previewStatus = "failed";
      job.previewError = error;
      job.previewHttpStatus = status;
    } else {
      job.finalStatus = "failed";
      job.finalError = error;
      job.finalHttpStatus = status;
    }

    job.vectorizerError = error;
    job.vectorizerStatus = status;
  });
}

export async function getServerJobOriginalImage(job: ServerJobRecord) {
  if (isMemoryJob(job)) {
    return job.imageBuffer;
  }

  return readDurableFile(job.originalImageUrl);
}

export async function getServerJobPreviewSvg(job: ServerJobRecord) {
  if (isMemoryJob(job)) {
    return job.previewSvgBuffer ?? null;
  }

  return readDurableFile(job.previewSvgUrl);
}

export async function getServerJobFinalSvg(job: ServerJobRecord) {
  if (isMemoryJob(job)) {
    return job.finalSvgBuffer ?? null;
  }

  return readDurableFile(job.finalSvgUrl);
}

export function hasServerJobPreviewSvg(job: ServerJobRecord) {
  return Boolean(job.previewSvgUrl || (isMemoryJob(job) && job.previewSvgBuffer));
}

export function hasServerJobFinalSvg(job: ServerJobRecord) {
  return Boolean(job.finalSvgUrl || (isMemoryJob(job) && job.finalSvgBuffer));
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
