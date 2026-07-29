export type ProviderName = "local" | "openai";

const integer = (value: string | undefined, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
};

export type ProviderConfig = {
  provider: ProviderName;
  openAiApiKey?: string;
  openAiModel: string;
  timeoutMs: number;
  maxSourceChars: number;
  cache: "memory" | "none";
};

export function getProviderConfig(env: NodeJS.ProcessEnv = process.env): ProviderConfig {
  const selected = env.SUPERCLASS_LESSON_PROVIDER ?? "local";
  if (selected !== "local" && selected !== "openai") {
    throw new Error("SUPERCLASS_LESSON_PROVIDER must be either local or openai.");
  }
  return {
    provider: selected,
    openAiApiKey: env.SUPERCLASS_OPENAI_API_KEY,
    openAiModel: env.SUPERCLASS_OPENAI_MODEL?.trim() || "gpt-5.4-mini",
    timeoutMs: integer(env.SUPERCLASS_PROVIDER_TIMEOUT_MS, 45_000, 1_000, 120_000),
    maxSourceChars: integer(env.SUPERCLASS_MAX_SOURCE_CHARS, 12_000, 500, 12_000),
    cache: env.SUPERCLASS_GENERATION_CACHE === "none" ? "none" : "memory",
  };
}
