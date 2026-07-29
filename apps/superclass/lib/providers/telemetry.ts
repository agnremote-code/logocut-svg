import type { LessonRequest } from "@/types/lesson";

export type ValidationStatus = "not-run" | "valid" | "invalid";
export type GenerationDiagnostic = {
  requestId: string;
  contentHash: string;
  provider: string;
  model: string;
  durationMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number | null;
  validation: ValidationStatus;
  outcome: "success" | "cache-hit" | "failure";
  attemptCount: number;
  createdAt: string;
};

export type SafeGenerationLog = Pick<
  GenerationDiagnostic,
  "requestId" | "contentHash" | "provider" | "model" | "durationMs" | "estimatedInputTokens" | "estimatedOutputTokens" | "estimatedCostUsd" | "validation" | "outcome" | "attemptCount"
> & {
  level: LessonRequest["level"];
  duration: LessonRequest["duration"];
  sourceMode: LessonRequest["sourceMode"];
  sourceChars: number;
  screenCount?: number;
  errorCode?: string;
};

const diagnosticsKey = Symbol.for("superclass.generationDiagnostics");
const diagnosticsGlobal = globalThis as typeof globalThis & { [diagnosticsKey]?: GenerationDiagnostic[] };
const diagnostics = (diagnosticsGlobal[diagnosticsKey] ??= []);

export function recordGenerationDiagnostic(value: GenerationDiagnostic) {
  diagnostics.unshift(Object.freeze({ ...value }));
  diagnostics.splice(20);
}

export function getGenerationDiagnostics() {
  return diagnostics.map((item) => ({ ...item }));
}

export function clearGenerationDiagnostics() {
  diagnostics.splice(0);
}

export function createSafeGenerationLog(
  request: LessonRequest,
  diagnostic: GenerationDiagnostic,
  details: { screenCount?: number; errorCode?: string } = {},
): SafeGenerationLog {
  const activeSource = request.sourceMode === "video" ? request.transcript : request.source;
  return {
    requestId: diagnostic.requestId,
    contentHash: diagnostic.contentHash,
    provider: diagnostic.provider,
    model: diagnostic.model,
    durationMs: diagnostic.durationMs,
    estimatedInputTokens: diagnostic.estimatedInputTokens,
    estimatedOutputTokens: diagnostic.estimatedOutputTokens,
    estimatedCostUsd: diagnostic.estimatedCostUsd,
    validation: diagnostic.validation,
    outcome: diagnostic.outcome,
    attemptCount: diagnostic.attemptCount,
    level: request.level,
    duration: request.duration,
    sourceMode: request.sourceMode,
    sourceChars: activeSource.length,
    ...details,
  };
}

export function logGeneration(log: SafeGenerationLog, writer: (message: string) => void = console.info) {
  writer(JSON.stringify({ event: "superclass.lesson_generation", ...log }));
}
