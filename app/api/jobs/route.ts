import { NextResponse } from "next/server";
import {
  CreateJobRequest,
  isCutType,
  validateCreateJobRequest,
} from "@/lib/job-types";
import {
  createServerJob,
  getStorageNotConfiguredResponseBody,
  isStorageNotConfiguredError,
  logUploadStorageDiagnostics,
  toJobSummary,
} from "@/lib/server-job-store";

export async function POST(request: Request) {
  logUploadStorageDiagnostics("api/jobs:upload-start");

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid job request." },
      { status: 400 },
    );
  }

  const image = formData.get("image");
  const cutType = formData.get("cutType");

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "Please upload a PNG or JPG logo." },
      { status: 400 },
    );
  }

  if (!isCutType(cutType)) {
    return NextResponse.json(
      { error: "Please choose a cut type." },
      { status: 400 },
    );
  }

  const imageBuffer = Buffer.from(await image.arrayBuffer());
  const payload: Partial<CreateJobRequest> = {
    fileName: image.name,
    fileType: image.type,
    fileSize: imageBuffer.byteLength,
    cutType,
  };

  const validationError = validateCreateJobRequest(payload);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  let job;

  try {
    job = await createServerJob({
      fileName: image.name,
      fileType: image.type,
      fileSize: imageBuffer.byteLength,
      cutType,
      imageBuffer,
    });
  } catch (error) {
    if (isStorageNotConfiguredError(error)) {
      return NextResponse.json(getStorageNotConfiguredResponseBody(), {
        status: 503,
      });
    }

    throw error;
  }

  return NextResponse.json({ job: toJobSummary(job) }, { status: 201 });
}
