import {
  BlobError,
  BlobNotFoundError,
  head,
  put,
} from "@vercel/blob";
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
  logoCutStorageDiagnosticsLogged?: boolean;
};

function getMemoryJobs() {
  if (!serverJobStore.logoCutJobs) {
    serverJobStore.logoCutJobs = new Map<string, MemoryServerJobRecord>();
  }

  return serverJobStore.logoCutJobs;
}

type BlobAuthMode = "read-write-token" | "oidc" | "none";

type BlobStorageDiagnostics = {
  hasBlobReadWriteToken: boolean;
  blobReadWriteTokenLooksNonEmpty: boolean;
  blobReadWriteTokenStartsWithVercelBlobRw: boolean;
  hasBlobStoreId: boolean;
  blobStoreIdLooksNonEmpty: boolean;
  hasVercelOidcToken: boolean;
  nodeEnv: string | null;
  vercel: string | null;
  vercelEnv: string | null;
  selectedBlobAuthMode: BlobAuthMode;
};

type BlobCredentials =
  | {
      mode: "read-write-token";
      options: BlobAuthCommandOptions;
      diagnostics: BlobStorageDiagnostics;
    }
  | {
      mode: "oidc";
      options: BlobAuthCommandOptions;
      diagnostics: BlobStorageDiagnostics;
    }
  | {
      mode: "none";
      reason: string;
      diagnostics: BlobStorageDiagnostics;
    };

type BlobAuthCommandOptions = {
  token?: string;
  storeId?: string;
  oidcToken?: string;
};

function stripSurroundingQuotes(value: string) {
  const trimmed = value.trim();
  const first = trimmed.at(0);
  const last = trimmed.at(-1);

  if (
    trimmed.length >= 2 &&
    ((first === "\"" && last === "\"") || (first === "'" && last === "'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getNormalizedEnvValue(name: string, stripQuotes = false) {
  const value = process.env[name];

  if (typeof value !== "string") {
    return "";
  }

  return stripQuotes ? stripSurroundingQuotes(value) : value.trim();
}

function resolveBlobCredentials(): BlobCredentials {
  const rawBlobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN;
  const rawBlobStoreId = process.env.BLOB_STORE_ID;
  const blobReadWriteToken = getNormalizedEnvValue(
    "BLOB_READ_WRITE_TOKEN",
    true,
  );
  const blobStoreId = getNormalizedEnvValue("BLOB_STORE_ID", true);
  const vercelOidcToken = getNormalizedEnvValue("VERCEL_OIDC_TOKEN");
  const selectedBlobAuthMode: BlobAuthMode = blobReadWriteToken
    ? "read-write-token"
    : blobStoreId && vercelOidcToken
      ? "oidc"
      : "none";
  const diagnostics: BlobStorageDiagnostics = {
    hasBlobReadWriteToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    blobReadWriteTokenLooksNonEmpty: Boolean(blobReadWriteToken),
    blobReadWriteTokenStartsWithVercelBlobRw:
      blobReadWriteToken.startsWith("vercel_blob_rw_"),
    hasBlobStoreId: Boolean(process.env.BLOB_STORE_ID),
    blobStoreIdLooksNonEmpty: Boolean(blobStoreId),
    hasVercelOidcToken: Boolean(vercelOidcToken),
    nodeEnv: process.env.NODE_ENV ?? null,
    vercel: process.env.VERCEL ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    selectedBlobAuthMode,
  };

  if (blobReadWriteToken) {
    return {
      mode: "read-write-token",
      options: { token: blobReadWriteToken },
      diagnostics,
    };
  }

  if (blobStoreId && vercelOidcToken) {
    return {
      mode: "oidc",
      options: {
        storeId: blobStoreId,
        oidcToken: vercelOidcToken,
      },
      diagnostics,
    };
  }

  let reason = "missing token and missing OIDC pair";

  if (typeof rawBlobReadWriteToken === "string" && !blobReadWriteToken) {
    reason = "token present but rejected by our own validation";
  } else if (blobStoreId && !vercelOidcToken) {
    reason = "BLOB_STORE_ID present but VERCEL_OIDC_TOKEN missing";
  } else if (typeof rawBlobStoreId === "string" && !blobStoreId) {
    reason = "BLOB_STORE_ID present but rejected by our own validation";
  }

  return {
    mode: "none",
    reason,
    diagnostics,
  };
}

function hasDurableStorageConfig() {
  return resolveBlobCredentials().mode !== "none";
}

function shouldUseMemoryStorage() {
  return process.env.NODE_ENV !== "production" && !hasDurableStorageConfig();
}

function getBlobCredentialsOrThrow() {
  const credentials = resolveBlobCredentials();

  if (credentials.mode === "none") {
    logStorageDiagnostics("server-job-store:missing-blob-auth", {
      reason: credentials.reason,
    });
    throw new StorageNotConfiguredError();
  }

  return credentials;
}

function getBlobCommandOptions() {
  return getBlobCredentialsOrThrow().options;
}

export function getBlobStorageDiagnostics(): BlobStorageDiagnostics {
  return resolveBlobCredentials().diagnostics;
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

function logStorageDiagnostics(
  source: string,
  extra?: Record<string, string | number | boolean | null>,
) {
  console.info("[LogoCut SVG] Blob storage diagnostics", {
    source,
    ...getBlobStorageDiagnostics(),
    ...extra,
  });
}

function logStorageDiagnosticsOnce(source: string) {
  if (serverJobStore.logoCutStorageDiagnosticsLogged) {
    return;
  }

  serverJobStore.logoCutStorageDiagnosticsLogged = true;
  logStorageDiagnostics(source);
}

logStorageDiagnosticsOnce("server-job-store:init");

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
      logStorageDiagnostics("server-job-store:metadata-put-auth-error", {
        reason: "SDK threw auth error",
        errorName: error instanceof Error ? error.name : "unknown",
        errorMessage: error instanceof Error ? error.message : "unknown",
      });
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
      logStorageDiagnostics("server-job-store:file-put-auth-error", {
        reason: "SDK threw auth error",
        errorName: error instanceof Error ? error.name : "unknown",
        errorMessage: error instanceof Error ? error.message : "unknown",
      });
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

export function logUploadStorageDiagnostics(source: string) {
  logStorageDiagnostics(source);
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
      logStorageDiagnostics("server-job-store:metadata-head-auth-error", {
        reason: "SDK threw auth error",
        errorName: error instanceof Error ? error.name : "unknown",
        errorMessage: error instanceof Error ? error.message : "unknown",
      });
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
