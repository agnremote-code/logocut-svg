export type OutputType = "single" | "multi";
export type ProductType =
  | "single_svg"
  | "layered_svg"
  | "complete_pack"
  | "unlimited_subscription";
export type OneTimeProductType = Exclude<ProductType, "unlimited_subscription">;

export type CutType = OutputType;

export type JobStatus =
  | "created"
  | "previewing"
  | "preview_ready"
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
  productType?: OneTimeProductType;
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
  id: OutputType;
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

export const ONE_TIME_PRODUCT_OPTIONS: Array<{
  id: OneTimeProductType;
  outputType: OutputType | "both";
  name: string;
  price: string;
  description: string;
  badge?: string;
}> = [
  {
    id: "single_svg",
    outputType: "single",
    name: "Single-Color SVG",
    price: "$5",
    description: "One clean single-color file for silhouettes, decals and simple cuts.",
  },
  {
    id: "layered_svg",
    outputType: "multi",
    name: "Layered SVG",
    price: "$9",
    description: "One clean layered file for separate-color craft projects.",
  },
  {
    id: "complete_pack",
    outputType: "both",
    name: "Complete SVG Pack",
    price: "$12",
    description: "Both clean single-color and layered SVG files from one upload.",
    badge: "Best one-time value",
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

export function isOutputType(value: unknown): value is OutputType {
  return isCutType(value);
}

export function isOneTimeProductType(
  value: unknown,
): value is OneTimeProductType {
  return (
    value === "single_svg" ||
    value === "layered_svg" ||
    value === "complete_pack"
  );
}

export function getDefaultProductTypeForOutput(
  outputType: OutputType,
): OneTimeProductType {
  return outputType === "multi" ? "layered_svg" : "single_svg";
}

export function getProductOutputTypes(productType: OneTimeProductType) {
  if (productType === "complete_pack") {
    return ["single", "multi"] as const;
  }

  return [productType === "layered_svg" ? "multi" : "single"] as const;
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
