export type TranscriptProviderName = "local" | "configured-provider" | "none";

export type TranscriptConfig = {
  provider: TranscriptProviderName;
  endpoint?: string;
  apiKey?: string;
};

export function getTranscriptConfig(env: NodeJS.ProcessEnv = process.env): TranscriptConfig {
  const provider = env.SUPERCLASS_TRANSCRIPT_PROVIDER ?? (env.NODE_ENV === "production" ? "none" : "local");
  if (!["local", "configured-provider", "none"].includes(provider)) {
    throw new Error("SUPERCLASS_TRANSCRIPT_PROVIDER must be local, configured-provider or none.");
  }
  return {
    provider: provider as TranscriptProviderName,
    endpoint: env.SUPERCLASS_TRANSCRIPT_ENDPOINT?.trim() || undefined,
    apiKey: env.SUPERCLASS_TRANSCRIPT_API_KEY,
  };
}
