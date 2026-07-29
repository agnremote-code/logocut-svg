import { NextResponse } from "next/server";
import { getTranscriptConfig } from "@/lib/transcripts/config";
import { createTranscriptProvider } from "@/lib/transcripts/providers";
import { TranscriptError } from "@/lib/transcripts/types";
import { validateVideoUrl } from "@/lib/validation/lesson";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { url?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const parsed = validateVideoUrl(url);
  if (!parsed.ok || !parsed.value.youtubeId) return NextResponse.json({ error: "Enter a supported YouTube URL." }, { status: 400 });
  try {
    const result = await createTranscriptProvider(getTranscriptConfig()).importCaptions(parsed.value.url);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const unavailable = error instanceof TranscriptError && error.code === "captions-unavailable";
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcript import failed.", code: error instanceof TranscriptError ? error.code : "provider-failure" },
      { status: unavailable ? 404 : 503 },
    );
  }
}
