import {
  BlobNotFoundError,
  get,
  head,
  list,
  put,
} from "@vercel/blob";
import {
  CutType,
  JobStatus,
  JobSummary,
  OneTimeProductType,
  OutputType,
  PaymentStatus,
  getDefaultProductTypeForOutput,
  getProductOutputTypes,
} from "@/lib/job-types";
import { createHash } from "node:crypto";
import { canonicalStateForLegacyJob } from "@/lib/job-flow";
import { getOneTimeProductPrice } from "@/lib/pricing";

type VectorizerMode = "test" | "production";
type StoredFileStatus = "not_started" | "processing" | "ready" | "failed";
export type CanonicalJobState =
  | "uploaded"
  | "preview_generating"
  | "preview_ready"
  | "checkout_ready"
  | "payment_processing"
  | "paid"
  | "final_svg_generating"
  | "final_svg_ready"
  | "preview_failed"
  | "payment_failed"
  | "final_svg_failed";

export type ServerJobRecord = JobSummary & {
  jobId: string;
  price: string;
  productType?: OneTimeProductType;
  paymentStatus: PaymentStatus;
  paymentProvider?: "stripe" | "paypal";
  previewStatus: StoredFileStatus;
  finalStatus: StoredFileStatus;
  vectorizerMode?: VectorizerMode;
  creditsCalculated?: string | null;
  creditsCharged?: string | null;
  checkoutSessionId?: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  paidAt?: string;
  amountPaid?: string;
  currency?: string;
  originalPathname?: string;
  originalBlobPath?: string;
  originalImageUrl?: string;
  previewPathname?: string;
  previewBlobPath?: string;
  previewSvgUrl?: string;
  finalSvgPathname?: string;
  finalSingleStatus?: StoredFileStatus;
  finalSinglePathname?: string;
  finalSingleSvgUrl?: string;
  finalSingleError?: string;
  finalMultiStatus?: StoredFileStatus;
  finalMultiPathname?: string;
  finalMultiSvgUrl?: string;
  finalMultiError?: string;
  finalPathname?: string;
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
  canonicalState?: CanonicalJobState;
  sourceHash?: string;
  settingsHash?: string;
  previewSettingsHash?: string;
  previewGeneratedAt?: string;
};

type MemoryServerJobRecord = ServerJobRecord & {
  imageBuffer: Buffer;
  previewSvgBuffer?: Buffer;
  finalSvgBuffer?: Buffer;
  finalSingleSvgBuffer?: Buffer;
  finalMultiSvgBuffer?: Buffer;
};

type CreateServerJobInput = {
  fileName: string;
  fileType: string;
  fileSize: number;
  cutType: CutType;
  productType?: OneTimeProductType;
  imageBuffer: Buffer;
};

type SaveSvgInput = {
  jobId: string;
  svgBuffer: Buffer;
  creditsCalculated: string | null;
  creditsCharged: string | null;
  paypalPayment?: PayPalPaymentMetadata;
};

type SaveFinalOutputInput = SaveSvgInput & {
  outputType: OutputType;
};

type PayPalPaymentMetadata = {
  paypalOrderId: string;
  paypalCaptureId: string;
  amountPaid: string;
  currency: string;
};

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Storage is not configured");
    this.name = "StorageNotConfiguredError";
  }
}

export class StorageWriteFailedError extends Error {
  constructor() {
    super("Storage write failed");
    this.name = "StorageWriteFailedError";
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

type BlobSdkOptions = BlobAuthCommandOptions & {
  access: "private";
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

function getBlobSdkOptions(): BlobSdkOptions {
  return {
    access: "private",
    ...getBlobCredentialsOrThrow().options,
  };
}

export function getBlobStorageDiagnostics(): BlobStorageDiagnostics {
  return resolveBlobCredentials().diagnostics;
}

function getBlobErrorDetail(error: unknown) {
  return {
    errorName: error instanceof Error ? error.name : "unknown",
    errorMessage: error instanceof Error ? error.message : "unknown",
    errorStatus:
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (typeof error.status === "string" || typeof error.status === "number")
        ? String(error.status)
        : null,
    errorCode:
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (typeof error.code === "string" || typeof error.code === "number")
        ? String(error.code)
        : null,
  };
}

function handleBlobSdkError(operation: string, error: unknown): never {
  const credentials = resolveBlobCredentials();

  if (credentials.mode === "none") {
    logStorageDiagnostics(`server-job-store:${operation}:missing-blob-auth`, {
      reason: credentials.reason,
    });
    throw new StorageNotConfiguredError();
  }

  logStorageDiagnostics(`server-job-store:${operation}:blob-sdk-error`, {
    operation,
    reason: "SDK threw storage error",
    ...getBlobErrorDetail(error),
  });

  throw new StorageWriteFailedError();
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

function getMetadataVersionsPrefix(jobId: string) {
  return `${getJobFolder(jobId)}/metadata-versions/`;
}

function getMetadataVersionPath(jobId: string) {
  return `${getMetadataVersionsPrefix(jobId)}${Date.now()}-${crypto.randomUUID()}.json`;
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
  const productType = input.productType ?? getDefaultProductTypeForOutput(input.cutType);

  return {
    id: jobId,
    jobId,
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
    cutType: input.cutType,
    productType,
    price: getOneTimeProductPrice(productType).label,
    createdAt: now,
    updatedAt: now,
    status: "created",
    paymentStatus: "unpaid",
    previewStatus: "not_started",
    finalStatus: "not_started",
    finalSingleStatus: "not_started",
    finalMultiStatus: "not_started",
    errorMessages: [],
    canonicalState: "uploaded",
    sourceHash: createHash("sha256").update(input.imageBuffer).digest("hex"),
    settingsHash: createHash("sha256").update(`output:${input.cutType}`).digest("hex"),
  };
}

export function getServerJobProductType(job: Pick<ServerJobRecord, "productType" | "cutType">) {
  return job.productType ?? getDefaultProductTypeForOutput(job.cutType);
}

export function getServerJobProductPrice(job: Pick<ServerJobRecord, "productType" | "cutType">) {
  return getOneTimeProductPrice(getServerJobProductType(job));
}

export function getServerJobOutputTypes(job: Pick<ServerJobRecord, "productType" | "cutType">) {
  return getProductOutputTypes(getServerJobProductType(job));
}

function getFinalOutputPath(job: ServerJobRecord, outputType: OutputType) {
  if (outputType === "single") {
    return job.finalSinglePathname;
  }

  return job.finalMultiPathname;
}

function getMemoryFinalOutput(job: MemoryServerJobRecord, outputType: OutputType) {
  return outputType === "single" ? job.finalSingleSvgBuffer : job.finalMultiSvgBuffer;
}

function hasFinalOutput(job: ServerJobRecord, outputType: OutputType) {
  if (isMemoryJob(job)) {
    return Boolean(getMemoryFinalOutput(job, outputType));
  }

  return Boolean(getFinalOutputPath(job, outputType));
}

function setFinalOutputFields({
  job,
  outputType,
  svgBuffer,
  pathname,
  url,
}: {
  job: ServerJobRecord;
  outputType: OutputType;
  svgBuffer: Buffer;
  pathname?: string;
  url?: string;
}) {
  if (isMemoryJob(job)) {
    if (outputType === "single") {
      job.finalSingleSvgBuffer = svgBuffer;
    } else {
      job.finalMultiSvgBuffer = svgBuffer;
    }
  }

  if (outputType === "single") {
    job.finalSingleStatus = "ready";
    job.finalSinglePathname = pathname ?? job.finalSinglePathname;
    job.finalSingleSvgUrl = url ?? job.finalSingleSvgUrl;
    job.finalSingleError = undefined;
  } else {
    job.finalMultiStatus = "ready";
    job.finalMultiPathname = pathname ?? job.finalMultiPathname;
    job.finalMultiSvgUrl = url ?? job.finalMultiSvgUrl;
    job.finalMultiError = undefined;
  }
}

function applyPayPalPaymentMetadata(
  job: ServerJobRecord,
  payment: PayPalPaymentMetadata,
) {
  job.paymentProvider = "paypal";
  job.paypalOrderId = payment.paypalOrderId;
  job.paypalCaptureId = payment.paypalCaptureId;
  job.paymentStatus = "paid";
  job.paidAt = job.paidAt ?? new Date().toISOString();
  job.amountPaid = payment.amountPaid;
  job.currency = payment.currency;
}

async function saveDurableJob(job: ServerJobRecord) {
  try {
    await put(getMetadataVersionPath(job.id), JSON.stringify(job, null, 2), {
      ...getBlobSdkOptions(),
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
    });

    await put(getMetadataPath(job.id), JSON.stringify(job, null, 2), {
      ...getBlobSdkOptions(),
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
  } catch (error) {
    handleBlobSdkError("put-metadata", error);
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
      ...getBlobSdkOptions(),
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (error) {
    handleBlobSdkError(`put-file:${filename}`, error);
  }

  return {
    pathname: blob.pathname,
    url: blob.url,
  };
}

async function readDurableFile(pathname?: string) {
  if (!pathname) {
    return null;
  }

  try {
    const result = await get(pathname, getBlobSdkOptions());

    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }

    return Buffer.from(await new Response(result.stream).arrayBuffer());
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return null;
    }

    handleBlobSdkError(`get-file:${pathname}`, error);
  }
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

export function isStorageWriteFailedError(error: unknown) {
  return error instanceof StorageWriteFailedError;
}

export function getStorageNotConfiguredResponseBody() {
  return { error: "Storage is not configured" };
}

export function getStorageWriteFailedResponseBody() {
  return { error: "Storage write failed" };
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
    originalPathname: originalFile.pathname,
    originalBlobPath: originalFile.pathname,
    originalImageUrl: originalFile.url,
  });
}

export async function getServerJob(jobId: string) {
  if (shouldUseMemoryStorage()) {
    return getMemoryJobs().get(jobId) ?? null;
  }

  try {
    const versions = await list({
      ...getBlobCredentialsOrThrow().options,
      prefix: getMetadataVersionsPrefix(jobId),
      limit: 100,
    });
    const latestVersion = versions.blobs
      .filter((blob) => blob.pathname.endsWith(".json"))
      .sort((a, b) => {
        const uploadedAtDifference =
          b.uploadedAt.getTime() - a.uploadedAt.getTime();

        if (uploadedAtDifference !== 0) {
          return uploadedAtDifference;
        }

        return b.pathname.localeCompare(a.pathname);
      })[0];
    const metadataPath = latestVersion?.pathname ?? getMetadataPath(jobId);

    if (!latestVersion) {
      await head(metadataPath, getBlobSdkOptions());
    }

    const metadata = await get(metadataPath, getBlobSdkOptions());

    if (!metadata || metadata.statusCode !== 200 || !metadata.stream) {
      return null;
    }

    const metadataText = await new Response(metadata.stream).text();

    const job = JSON.parse(metadataText) as ServerJobRecord;
    job.canonicalState = canonicalStateForLegacyJob(job);
    return job;
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return null;
    }

    handleBlobSdkError("get-metadata", error);
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
    job.paymentProvider = "stripe";
    job.paymentStatus = "unpaid";
    job.status = "awaiting_payment";
    job.canonicalState = "checkout_ready";
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
    job.paymentProvider = "stripe";
    job.paymentStatus = "paid";
    job.paidAt = new Date().toISOString();

    if (job.status === "awaiting_payment" || job.status === "preview_ready") {
      job.status = "created";
    }
  });
}

export async function savePayPalOrder({
  jobId,
  paypalOrderId,
  productType,
}: {
  jobId: string;
  paypalOrderId: string;
  productType?: OneTimeProductType;
}) {
  return updateServerJob(jobId, (job) => {
    if (productType) {
      job.productType = productType;
      job.price = getOneTimeProductPrice(productType).label;
    }

    job.paymentProvider = "paypal";
    job.paypalOrderId = paypalOrderId;
    job.paymentStatus = "unpaid";
    job.status = "awaiting_payment";
    job.canonicalState = "checkout_ready";
  });
}

export async function markServerJobPaidWithPayPal({
  jobId,
  paypalOrderId,
  paypalCaptureId,
  amountPaid,
  currency,
  status,
}: {
  jobId: string;
  paypalOrderId: string;
  paypalCaptureId: string;
  amountPaid: string;
  currency: string;
  status?: JobStatus;
}) {
  return updateServerJob(jobId, (job) => {
    applyPayPalPaymentMetadata(job, {
      paypalOrderId,
      paypalCaptureId,
      amountPaid,
      currency,
    });

    if (status) {
      job.status = status;
      job.canonicalState = status === "processing" ? "final_svg_generating" : "paid";
      return;
    }

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
      job.canonicalState = "preview_generating";
    }

    if (status === "processing") {
      job.finalStatus = "processing";
      job.canonicalState = "final_svg_generating";
      for (const outputType of getServerJobOutputTypes(job)) {
        if (outputType === "single" && !hasFinalOutput(job, "single")) {
          job.finalSingleStatus = "processing";
        }

        if (outputType === "multi" && !hasFinalOutput(job, "multi")) {
          job.finalMultiStatus = "processing";
        }
      }
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
    job.canonicalState = "preview_ready";
    job.previewSettingsHash = job.settingsHash;
    job.previewGeneratedAt = new Date().toISOString();
    job.previewPathname = previewFile?.pathname ?? job.previewPathname;
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
  paypalPayment,
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
    if (paypalPayment) {
      applyPayPalPaymentMetadata(job, paypalPayment);
    }

    if (isMemoryJob(job)) {
      job.finalSvgBuffer = svgBuffer;
    }

    job.status = "ready";
    job.finalStatus = "ready";
    job.canonicalState = "final_svg_ready";
    job.finalSvgPathname = finalFile?.pathname ?? job.finalSvgPathname;
    job.finalPathname = finalFile?.pathname ?? job.finalPathname;
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

export async function saveServerJobFinalOutputSvg({
  jobId,
  outputType,
  svgBuffer,
  creditsCalculated,
  creditsCharged,
  paypalPayment,
}: SaveFinalOutputInput) {
  const filename = outputType === "single" ? "single.svg" : "layered.svg";
  const finalFile = shouldUseMemoryStorage()
    ? undefined
    : await putDurableFile({
        jobId,
        filename,
        body: svgBuffer,
        contentType: "image/svg+xml",
      });

  return updateServerJob(jobId, (job) => {
    if (paypalPayment) {
      applyPayPalPaymentMetadata(job, paypalPayment);
    }

    setFinalOutputFields({
      job,
      outputType,
      svgBuffer,
      pathname: finalFile?.pathname,
      url: finalFile?.url,
    });

    const expectedOutputs = getServerJobOutputTypes(job);
    const allExpectedOutputsReady = expectedOutputs.every((expectedOutput) =>
      hasFinalOutput(job, expectedOutput),
    );

    job.finalStatus = allExpectedOutputsReady ? "ready" : "processing";
    job.status = allExpectedOutputsReady ? "ready" : "processing";
    job.canonicalState = allExpectedOutputsReady
      ? "final_svg_ready"
      : "final_svg_generating";
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
  paypalPayment,
  outputType,
}: {
  jobId: string;
  error: string;
  status?: number;
  stage?: "preview" | "final";
  paypalPayment?: PayPalPaymentMetadata;
  outputType?: OutputType;
}) {
  return updateServerJob(jobId, (job) => {
    if (paypalPayment) {
      applyPayPalPaymentMetadata(job, paypalPayment);
    }

    job.status = "failed";
    job.errorMessages = Array.from(new Set([...job.errorMessages, error]));

    if (stage === "preview") {
      job.previewStatus = "failed";
      job.previewError = error;
      job.previewHttpStatus = status;
      job.canonicalState = "preview_failed";
    } else {
      job.finalStatus = "failed";
      job.finalError = error;
      job.finalHttpStatus = status;
      if (outputType === "single") {
        job.finalSingleStatus = "failed";
        job.finalSingleError = error;
      }

      if (outputType === "multi") {
        job.finalMultiStatus = "failed";
        job.finalMultiError = error;
      }
      job.canonicalState = job.paymentStatus === "paid" ? "final_svg_failed" : "payment_failed";
    }

    job.vectorizerError = error;
    job.vectorizerStatus = status;
  });
}

export async function getServerJobOriginalImage(job: ServerJobRecord) {
  if (isMemoryJob(job)) {
    return job.imageBuffer;
  }

  return readDurableFile(job.originalPathname ?? job.originalBlobPath);
}

export async function getServerJobPreviewSvg(job: ServerJobRecord) {
  if (isMemoryJob(job)) {
    return job.previewSvgBuffer ?? null;
  }

  return readDurableFile(job.previewPathname ?? job.previewBlobPath);
}

export async function getServerJobFinalSvg(
  job: ServerJobRecord,
  outputType?: OutputType,
) {
  if (outputType) {
    if (isMemoryJob(job)) {
      return getMemoryFinalOutput(job, outputType) ?? null;
    }

    return readDurableFile(getFinalOutputPath(job, outputType));
  }

  if (isMemoryJob(job)) {
    return job.finalSvgBuffer ?? null;
  }

  return readDurableFile(job.finalPathname ?? job.finalBlobPath);
}

export function hasServerJobPreviewSvg(job: ServerJobRecord) {
  return Boolean(
    job.previewPathname ||
      job.previewBlobPath ||
      (isMemoryJob(job) && job.previewSvgBuffer),
  );
}

export function hasServerJobFinalSvg(job: ServerJobRecord) {
  const productType = getServerJobProductType(job);

  if (productType === "complete_pack") {
    return getServerJobOutputTypes(job).every((outputType) =>
      hasFinalOutput(job, outputType),
    );
  }

  return Boolean(
    job.finalPathname ||
      job.finalBlobPath ||
      (isMemoryJob(job) && job.finalSvgBuffer),
  );
}

export function hasServerJobFinalOutputSvg(
  job: ServerJobRecord,
  outputType: OutputType,
) {
  return hasFinalOutput(job, outputType);
}

export function getServerJobFinalOutputStatuses(job: ServerJobRecord) {
  return {
    single: {
      ready: hasFinalOutput(job, "single"),
      status: job.finalSingleStatus ?? "not_started",
      error: job.finalSingleError ?? null,
    },
    multi: {
      ready: hasFinalOutput(job, "multi"),
      status: job.finalMultiStatus ?? "not_started",
      error: job.finalMultiError ?? null,
    },
  };
}

export function toJobSummary(job: ServerJobRecord): JobSummary {
  return {
    id: job.id,
    fileName: job.fileName,
    fileType: job.fileType,
    fileSize: job.fileSize,
    cutType: job.cutType,
    productType: getServerJobProductType(job),
    createdAt: job.createdAt,
    status: job.status,
    paymentStatus: job.paymentStatus,
  };
}
