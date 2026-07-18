export type PreviewAssetReference = string;

const SVG_DATA_URL = /^data:image\/svg\+xml(?:;charset=[^;,]+)?(?:;base64)?,/i;
const GENERIC_IMAGE_DATA_URL = /^data:image\/[a-z0-9.+-]+(?:;charset=[^;,]+)?(?:;base64)?,/i;
const BASE64_VALUE = /^[a-z0-9+/=\s]+$/i;

function isRawSvg(value: string) {
  return /^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(value);
}

function isExpectedPreviewType(contentType: string) {
  const normalized = contentType.split(";", 1)[0].trim().toLowerCase();
  return normalized === "image/svg+xml" || normalized.startsWith("image/");
}

function blobUrl(blob: Blob) {
  if (!blob.size || !isExpectedPreviewType(blob.type)) {
    throw new Error("Invalid preview asset");
  }
  return URL.createObjectURL(blob);
}

export async function resolvePreviewAsset(reference: PreviewAssetReference) {
  const value = reference.trim();
  if (!value) throw new Error("Missing preview asset");

  if (isRawSvg(value)) {
    return blobUrl(new Blob([value], { type: "image/svg+xml" }));
  }

  if (SVG_DATA_URL.test(value) || GENERIC_IMAGE_DATA_URL.test(value)) {
    const response = await fetch(value);
    if (!response.ok) throw new Error("Preview data could not be read");
    return blobUrl(await response.blob());
  }

  if (value.length > 32 && BASE64_VALUE.test(value)) {
    try {
      const decoded = atob(value.replace(/\s/g, ""));
      if (!isRawSvg(decoded)) throw new Error("Unsupported base64 preview");
      return blobUrl(new Blob([decoded], { type: "image/svg+xml" }));
    } catch {
      throw new Error("Invalid base64 preview");
    }
  }

  const url = new URL(value, window.location.origin);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Unsupported preview URL");
  }

  const response = await fetch(url.toString(), {
    credentials: url.origin === window.location.origin ? "same-origin" : "omit",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Preview file could not be loaded");

  const contentType = response.headers.get("content-type") ?? "";
  if (!isExpectedPreviewType(contentType)) throw new Error("Unexpected preview file type");

  const blob = await response.blob();
  return blobUrl(blob.type ? blob : new Blob([blob], { type: contentType }));
}
