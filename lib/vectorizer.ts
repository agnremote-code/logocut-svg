import { CutType } from "@/lib/job-types";

const VECTORIZER_ENDPOINT = "https://api.vectorizer.ai/api/v1/vectorize";

type VectorizeImageInput = {
  imageBuffer: Buffer | Uint8Array | ArrayBuffer;
  filename: string;
  cutType: CutType;
  contentType?: string;
  mode?: "test" | "production";
};

type VectorizeImageSuccess = {
  ok: true;
  svg: Buffer;
  contentType: "image/svg+xml";
  mode: "test" | "production";
  creditsCalculated: string | null;
  creditsCharged: string | null;
};

type VectorizeImageFailure = {
  ok: false;
  error: string;
  code:
    | "missing_credentials"
    | "invalid_input"
    | "network_error"
    | "vectorizer_error";
  status?: number;
};

export type VectorizeImageResult =
  | VectorizeImageSuccess
  | VectorizeImageFailure;

function getImageByteLength(imageBuffer: VectorizeImageInput["imageBuffer"]) {
  return imageBuffer.byteLength;
}

function toBuffer(imageBuffer: VectorizeImageInput["imageBuffer"]) {
  if (Buffer.isBuffer(imageBuffer)) {
    return imageBuffer;
  }

  if (imageBuffer instanceof ArrayBuffer) {
    return Buffer.from(imageBuffer);
  }

  return Buffer.from(imageBuffer);
}

function getCredentials() {
  const apiId = process.env.VECTORIZER_API_ID?.trim();
  const apiSecret = process.env.VECTORIZER_API_SECRET?.trim();

  if (!apiId || !apiSecret) {
    return null;
  }

  return { apiId, apiSecret };
}

async function readVectorizerError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as {
      error?: {
        message?: string;
      };
      message?: string;
    } | null;

    return (
      payload?.error?.message ??
      payload?.message ??
      `Vectorizer.AI request failed with status ${response.status}.`
    );
  }

  const text = await response.text().catch(() => "");

  return text.trim() || `Vectorizer.AI request failed with status ${response.status}.`;
}

export async function vectorizeImage({
  imageBuffer,
  filename,
  cutType,
  contentType = "application/octet-stream",
  mode = "test",
}: VectorizeImageInput): Promise<VectorizeImageResult> {
  const credentials = getCredentials();

  if (!credentials) {
    return {
      ok: false,
      code: "missing_credentials",
      error:
        "Missing VECTORIZER_API_ID or VECTORIZER_API_SECRET. Add both credentials to run Vectorizer.AI.",
    };
  }

  if (!filename.trim()) {
    return {
      ok: false,
      code: "invalid_input",
      error: "A filename is required before sending an image to Vectorizer.AI.",
    };
  }

  if (getImageByteLength(imageBuffer) === 0) {
    return {
      ok: false,
      code: "invalid_input",
      error: "Image buffer is empty.",
    };
  }

  if (cutType !== "single" && cutType !== "multi") {
    return {
      ok: false,
      code: "invalid_input",
      error: "Cut type must be single or multi.",
    };
  }

  if (mode !== "test" && mode !== "production") {
    return {
      ok: false,
      code: "invalid_input",
      error: "Vectorizer mode must be test or production.",
    };
  }

  const formData = new FormData();
  const imageBytes = new Uint8Array(toBuffer(imageBuffer));
  const imageBlob = new Blob([imageBytes], { type: contentType });

  formData.append("image", imageBlob, filename);
  formData.append("mode", mode);
  formData.append("output.file_format", "svg");

  const authorization = Buffer.from(
    `${credentials.apiId}:${credentials.apiSecret}`,
  ).toString("base64");

  let response: Response;

  try {
    response = await fetch(VECTORIZER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
      },
      body: formData,
    });
  } catch {
    return {
      ok: false,
      code: "network_error",
      error: "Could not reach Vectorizer.AI. Check your network and try again.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      code: "vectorizer_error",
      status: response.status,
      error: await readVectorizerError(response),
    };
  }

  const svg = Buffer.from(await response.arrayBuffer());

  if (svg.byteLength === 0) {
    return {
      ok: false,
      code: "vectorizer_error",
      status: response.status,
      error: "Vectorizer.AI returned an empty SVG response.",
    };
  }

  return {
    ok: true,
    svg,
    contentType: "image/svg+xml",
    mode,
    creditsCalculated: response.headers.get("x-credits-calculated"),
    creditsCharged: response.headers.get("x-credits-charged"),
  };
}
