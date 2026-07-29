export type TranscriptResult = {
  transcript: string;
  platform: "youtube" | "uploaded-media";
  mediaId: string;
  provider: string;
  mocked: boolean;
};

export interface TranscriptProvider {
  readonly name: string;
  importCaptions(url: string, signal?: AbortSignal): Promise<TranscriptResult>;
  transcribeUpload?(file: File, signal?: AbortSignal): Promise<TranscriptResult>;
}

export class TranscriptError extends Error {
  constructor(message: string, readonly code: "unsupported" | "captions-unavailable" | "configuration" | "provider-failure") {
    super(message);
    this.name = "TranscriptError";
  }
}
