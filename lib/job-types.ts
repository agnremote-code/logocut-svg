export type CutType = "single" | "multi";

export type JobStatus =
  | "created"
  | "awaiting_payment"
  | "processing"
  | "waiting_for_vectorizer"
  | "ready"
  | "failed";

export type PaymentStatus = "unpaid" | "paid";

export type ProcessingStep = {
  label: string;
  durationMs: number;
};

export type CreateJobRequest = {
  fileName: string;
  fileType: string;
  fileSize: number;
  cutType: CutType;
};

export type JobSummary = CreateJobRequest & {
  id: string;
  createdAt: string;
  status: JobStatus;
  paymentStatus?: PaymentStatus;
};

export type ClientJobRecord = JobSummary & {
  imageBlob: Blob;
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = ["image/png", "image/jpeg"] as const;

export const CUT_OPTIONS: Array<{
  id: CutType;
  name: string;
  price: string;
  description: string;
}> = [
  {
    id: "single",
    name: "Single-color cut",
    price: "$5",
    description: "Best for vinyl decals, shirts, and simple logo cuts.",
  },
  {
    id: "multi",
    name: "Multi-color layered cut",
    price: "$9",
    description: "Best for logos with separate color pieces.",
  },
];

export const PROCESSING_STEPS: ProcessingStep[] = [
  { label: "Uploading image...", durationMs: 1000 },
  { label: "Cleaning background...", durationMs: 1000 },
  { label: "Creating vector paths...", durationMs: 1000 },
  { label: "Optimizing for Cricut...", durationMs: 1000 },
  { label: "Preparing download...", durationMs: 1000 },
];

export function isCutType(value: unknown): value is CutType {
  return value === "single" || value === "multi";
}

export function isAcceptedFileType(value: unknown): value is string {
  return (
    typeof value === "string" &&
    ACCEPTED_FILE_TYPES.includes(value as (typeof ACCEPTED_FILE_TYPES)[number])
  );
}

export function validateCreateJobRequest(
  payload: Partial<CreateJobRequest>,
): string | null {
  if (!payload.fileName) {
    return "File name is required.";
  }

  if (!isAcceptedFileType(payload.fileType)) {
    return "Please upload a PNG or JPG logo.";
  }

  if (typeof payload.fileSize !== "number" || payload.fileSize <= 0) {
    return "File size is required.";
  }

  if (payload.fileSize > MAX_FILE_SIZE) {
    return "Please upload an image under 10 MB.";
  }

  if (!isCutType(payload.cutType)) {
    return "Please choose a cut type.";
  }

  return null;
}
