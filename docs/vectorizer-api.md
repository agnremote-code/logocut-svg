# Vectorizer.AI API

## Current Status

Vectorizer.AI free test mode is implemented.

The app posts uploaded images to the official Vectorizer.AI endpoint with:

- `mode=test`
- `output.file_format=svg`

Production mode is not enabled.

## Official API Docs

- API documentation: https://vectorizer.ai/api/documentation
- API overview: https://vectorizer.ai/api
- Pricing: https://vectorizer.ai/pricing

## Credentials

Vectorizer.AI uses HTTP Basic Authentication with:

- API Id as the username
- API Secret as the password

Get these credentials from the Vectorizer.AI API key area in your account.

## Required Environment Variables

```bash
VECTORIZER_API_ID="your-api-id"
VECTORIZER_API_SECRET="your-api-secret"
```

Do not commit real values. Copy `.env.local.example` to `.env.local` for local development and fill in the credentials there.

## Request Implemented

```http
POST https://api.vectorizer.ai/api/v1/vectorize
Authorization: Basic base64(VECTORIZER_API_ID:VECTORIZER_API_SECRET)
Content-Type: multipart/form-data
```

Multipart fields:

```text
image=<uploaded PNG/JPG/JPEG file>
mode=test
output.file_format=svg
```

## Expected Input

`vectorizeImage` accepts:

```ts
{
  imageBuffer: Buffer | Uint8Array | ArrayBuffer;
  filename: string;
  cutType: "single" | "multi";
  contentType?: string;
}
```

The image is validated before job creation as PNG, JPG, or JPEG under 10 MB.

## Expected Output

On success:

```ts
{
  ok: true;
  svg: Buffer;
  contentType: "image/svg+xml";
  mode: "test";
  creditsCalculated: string | null;
  creditsCharged: string | null;
}
```

On failure:

```ts
{
  ok: false;
  code: "missing_credentials" | "invalid_input" | "network_error" | "vectorizer_error";
  error: string;
  status?: number;
}
```

## Test Mode Notes

Test mode is for integration verification. The returned SVG may contain a watermark. The UI displays `TEST MODE` whenever a returned test SVG is available.
