import { NextResponse } from "next/server";
import {
  CreateJobRequest,
  isCutType,
  validateCreateJobRequest,
} from "@/lib/job-types";
import { createServerJob, toJobSummary } from "@/lib/server-job-store";

export async function POST(request: Request) {
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

  // The image bytes are available here for the future Vectorizer worker:
  // await vectorizeImage({ imageBuffer, filename: image.name, cutType });
  const job = createServerJob({
    fileName: image.name,
    fileType: image.type,
    fileSize: imageBuffer.byteLength,
    cutType,
    imageBuffer,
  });

  return NextResponse.json({ job: toJobSummary(job) }, { status: 201 });
}
