import { NextResponse } from "next/server";
import { getTranscriptConfig } from "@/lib/transcripts/config";
import { createTranscriptProvider } from "@/lib/transcripts/providers";
import { TranscriptError } from "@/lib/transcripts/types";

export async function POST(request: Request) {
  const data = await request.formData().catch(() => null);
  const file = data?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose an audio or video file." }, { status: 400 });
  if (file.size > 100 * 1024 * 1024) return NextResponse.json({ error: "Keep uploaded media under 100 MB." }, { status: 413 });
  try {
    const provider = createTranscriptProvider(getTranscriptConfig());
    if (!provider.transcribeUpload) throw new TranscriptError("Uploaded-media transcription is not configured.", "configuration");
    return NextResponse.json(await provider.transcribeUpload(file), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed.", code: error instanceof TranscriptError ? error.code : "provider-failure" },
      { status: 503 },
    );
  }
}
