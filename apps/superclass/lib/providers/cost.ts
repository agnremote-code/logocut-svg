import type { LessonDuration, LessonRequest } from "@/types/lesson";

export type TokenEstimate = { inputTokens: number; outputTokens: number };

const outputTokensByDuration: Record<LessonDuration, number> = {
  30: 4_500,
  45: 6_500,
  60: 9_000,
  90: 13_000,
};

export function estimateLessonTokens(request: LessonRequest): TokenEstimate {
  const activeSource = request.sourceMode === "video" ? request.transcript : request.source;
  return {
    inputTokens: Math.ceil(activeSource.length / 4) + 1_800,
    outputTokens: outputTokensByDuration[request.duration],
  };
}

const modelRatesPerMillion: Record<string, { input: number; output: number }> = {
  "gpt-5.6-sol": { input: 5, output: 30 },
  "gpt-5.6-terra": { input: 2.5, output: 15 },
  "gpt-5.6-luna": { input: 1, output: 6 },
  "gpt-5.4": { input: 2.5, output: 15 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
  "gpt-5.4-nano": { input: 0.2, output: 1.25 },
};

export function estimateOpenAiCostUsd(model: string, tokens: TokenEstimate): number | null {
  const rates = modelRatesPerMillion[model];
  if (!rates) return null;
  return Number(((tokens.inputTokens * rates.input + tokens.outputTokens * rates.output) / 1_000_000).toFixed(4));
}
