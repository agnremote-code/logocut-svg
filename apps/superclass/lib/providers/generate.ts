import { createHash, randomUUID } from "node:crypto";
import { disabledGenerationCache, memoryGenerationCache, type GenerationCache } from "@/lib/providers/cache";
import { getProviderConfig, type ProviderConfig } from "@/lib/providers/config";
import { estimateLessonTokens, estimateOpenAiCostUsd } from "@/lib/providers/cost";
import { deterministicProvider } from "@/lib/providers/local";
import { createOpenAiProvider } from "@/lib/providers/openai";
import {
  createSafeGenerationLog,
  logGeneration,
  recordGenerationDiagnostic,
  type GenerationDiagnostic,
} from "@/lib/providers/telemetry";
import { ProviderError, type LessonProvider } from "@/lib/providers/types";
import { validateLessonDraft } from "@/lib/validation/lesson";
import type { LessonDraft, LessonRequest } from "@/types/lesson";

type GenerationOptions = {
  config?: ProviderConfig;
  cache?: GenerationCache;
  logger?: (message: string) => void;
};

function selectProvider(config: ProviderConfig): LessonProvider {
  if (config.provider === "local") return deterministicProvider;
  if (!config.openAiApiKey) {
    throw new ProviderError("The OpenAI provider is selected but SUPERCLASS_OPENAI_API_KEY is not configured.", "configuration");
  }
  return createOpenAiProvider({ apiKey: config.openAiApiKey, model: config.openAiModel });
}

async function withTimeout(
  provider: LessonProvider,
  request: LessonRequest,
  context: { requestId: string; contentHash: string },
  timeoutMs: number,
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new ProviderError("Lesson generation timed out. Try again.", "timeout", true));
      }, timeoutMs);
    });
    return await Promise.race([provider.generate(request, { ...context, signal: controller.signal }), timeout]);
  } catch (error) {
    if (controller.signal.aborted) throw new ProviderError("Lesson generation timed out. Try again.", "timeout", true);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeLesson(input: LessonDraft, request: LessonRequest, requestId: string, contentHash: string): LessonDraft {
  return {
    ...input,
    schemaVersion: 1,
    id: input.id || `lesson-${contentHash}`,
    requestId,
    contentHash,
    language: request.language,
    dialect: request.dialect === "custom" ? request.customDialect : request.dialect,
    level: request.level,
    duration: request.duration,
    visualStyle: request.visualStyle,
    sourceMode: request.sourceMode,
    createdAt: new Date().toISOString(),
    screens: input.screens.map((screen) => ({
      ...screen,
      body: screen.body || undefined,
      sourceExcerpt: screen.sourceExcerpt || undefined,
      videoId: screen.videoId || undefined,
    })),
  };
}

export async function generateLesson(
  request: LessonRequest,
  providerOverride?: LessonProvider,
  options: GenerationOptions = {},
): Promise<LessonDraft> {
  const config = options.config ?? getProviderConfig();
  const provider = providerOverride ?? selectProvider(config);
  const model = provider.name === "openai" ? config.openAiModel : provider.name;
  const requestId = randomUUID();
  const contentHash = createHash("sha256")
    .update(JSON.stringify({ schema: 1, provider: provider.name, model, request }))
    .digest("hex")
    .slice(0, 24);
  const activeSource = request.sourceMode === "video" ? request.transcript : request.source;
  if (activeSource.length > config.maxSourceChars) {
    throw new ProviderError(`Keep source material under ${config.maxSourceChars.toLocaleString()} characters.`, "source-too-large");
  }

  const cache =
    options.cache ?? (config.cache === "memory" ? memoryGenerationCache : disabledGenerationCache);
  const tokens = estimateLessonTokens(request);
  const estimatedCostUsd = provider.name === "openai" ? estimateOpenAiCostUsd(config.openAiModel, tokens) : 0;
  const startedAt = Date.now();
  const cached = await cache.get(contentHash);
  if (cached) {
    const diagnostic: GenerationDiagnostic = {
      requestId,
      contentHash,
      provider: provider.name,
      model,
      durationMs: Date.now() - startedAt,
      estimatedInputTokens: tokens.inputTokens,
      estimatedOutputTokens: tokens.outputTokens,
      estimatedCostUsd,
      validation: "valid",
      outcome: "cache-hit",
      attemptCount: 0,
      createdAt: new Date().toISOString(),
    };
    recordGenerationDiagnostic(diagnostic);
    logGeneration(createSafeGenerationLog(request, diagnostic, { screenCount: cached.screens.length }), options.logger);
    return { ...cached, requestId, createdAt: new Date().toISOString() };
  }

  let attempts = 0;
  let validation: GenerationDiagnostic["validation"] = "not-run";
  try {
    while (attempts < 2) {
      attempts += 1;
      try {
        const output = await withTimeout(provider, request, { requestId, contentHash }, config.timeoutMs);
        const structural = validateLessonDraft(output);
        validation = structural.ok ? "valid" : "invalid";
        if (!structural.ok) {
          throw new ProviderError(`Generated lesson failed validation: ${structural.errors.join(" ")}`, "invalid-response");
        }
        const lesson = normalizeLesson(structural.value, request, requestId, contentHash);
        const validated = validateLessonDraft(lesson, request);
        validation = validated.ok ? "valid" : "invalid";
        if (!validated.ok) {
          throw new ProviderError(`Generated lesson failed validation: ${validated.errors.join(" ")}`, "invalid-response");
        }
        await cache.set(contentHash, validated.value);
        const diagnostic: GenerationDiagnostic = {
          requestId,
          contentHash,
          provider: provider.name,
          model,
          durationMs: Date.now() - startedAt,
          estimatedInputTokens: tokens.inputTokens,
          estimatedOutputTokens: tokens.outputTokens,
          estimatedCostUsd,
          validation,
          outcome: "success",
          attemptCount: attempts,
          createdAt: new Date().toISOString(),
        };
        recordGenerationDiagnostic(diagnostic);
        logGeneration(createSafeGenerationLog(request, diagnostic, { screenCount: lesson.screens.length }), options.logger);
        return lesson;
      } catch (error) {
        const providerError =
          error instanceof ProviderError
            ? error
            : new ProviderError("The lesson provider could not complete this request.", "provider-failure");
        if (attempts < 2 && providerError.retryable) continue;
        throw providerError;
      }
    }
    throw new ProviderError("The lesson provider could not complete this request.", "provider-failure");
  } catch (error) {
    const providerError =
      error instanceof ProviderError ? error : new ProviderError("The lesson provider could not complete this request.", "provider-failure");
    (providerError as ProviderError & { requestId?: string }).requestId = requestId;
    const diagnostic: GenerationDiagnostic = {
      requestId,
      contentHash,
      provider: provider.name,
      model,
      durationMs: Date.now() - startedAt,
      estimatedInputTokens: tokens.inputTokens,
      estimatedOutputTokens: tokens.outputTokens,
      estimatedCostUsd,
      validation,
      outcome: "failure",
      attemptCount: attempts,
      createdAt: new Date().toISOString(),
    };
    recordGenerationDiagnostic(diagnostic);
    logGeneration(createSafeGenerationLog(request, diagnostic, { errorCode: providerError.code }), options.logger);
    throw providerError;
  }
}
