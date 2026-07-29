import { extractYouTubeId } from "@/lib/validation/lesson";
import { TranscriptError, type TranscriptProvider, type TranscriptResult } from "@/lib/transcripts/types";
import type { TranscriptConfig } from "@/lib/transcripts/config";

export const localTranscriptProvider: TranscriptProvider = {
  name: "local-mock",
  async importCaptions(url) {
    const id = extractYouTubeId(url);
    if (!id) throw new TranscriptError("This development provider supports YouTube URLs only.", "unsupported");
    if (id.toLowerCase().includes("nocaption")) throw new TranscriptError("No public captions are available for this video.", "captions-unavailable");
    return {
      transcript: "In this video, the speaker explains how small daily habits shape language learning. The main idea is to practise consistently, notice useful expressions, and use them in meaningful conversations. A concrete example shows that short focused sessions can be more sustainable than occasional long study periods.",
      platform: "youtube",
      mediaId: id,
      provider: "local-mock",
      mocked: true,
    };
  },
  async transcribeUpload(file) {
    return {
      transcript: `Development transcript for ${file.name}. The uploaded media discusses a practical language-learning situation with a clear main idea, supporting detail and an example for classroom comprehension.`,
      platform: "uploaded-media",
      mediaId: file.name,
      provider: "local-mock",
      mocked: true,
    };
  },
};

function configuredProvider(config: TranscriptConfig): TranscriptProvider {
  if (!config.endpoint) throw new TranscriptError("SUPERCLASS_TRANSCRIPT_ENDPOINT is required for the configured transcript provider.", "configuration");
  const request = async (body: BodyInit, contentType?: string): Promise<TranscriptResult> => {
    const response = await fetch(config.endpoint!, {
      method: "POST",
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body,
    });
    if (!response.ok) {
      if (response.status === 404 || response.status === 422) throw new TranscriptError("No public captions are available for this video.", "captions-unavailable");
      throw new TranscriptError("The configured transcript provider could not complete the request.", "provider-failure");
    }
    const payload = await response.json() as Partial<TranscriptResult>;
    if (!payload.transcript || payload.transcript.trim().length < 12) throw new TranscriptError("The transcript provider returned no usable text.", "provider-failure");
    return { transcript: payload.transcript, platform: payload.platform ?? "youtube", mediaId: payload.mediaId ?? "configured", provider: "configured-provider", mocked: false };
  };
  return {
    name: "configured-provider",
    importCaptions(url) {
      return request(JSON.stringify({ operation: "captions", url }), "application/json");
    },
    transcribeUpload(file) {
      const data = new FormData();
      data.append("operation", "transcribe");
      data.append("file", file);
      return request(data);
    },
  };
}

export function createTranscriptProvider(config: TranscriptConfig): TranscriptProvider {
  if (config.provider === "local") return localTranscriptProvider;
  if (config.provider === "configured-provider") return configuredProvider(config);
  return {
    name: "none",
    async importCaptions() {
      throw new TranscriptError("Automatic transcript import is not configured.", "configuration");
    },
  };
}
