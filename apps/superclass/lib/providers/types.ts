import type { LessonDraft, LessonRequest } from "@/types/lesson";
import type { CreativeLessonBrief } from "@/lib/lesson/creative-brief";
import type { InterpretedLessonIntent } from "@/lib/lesson/intent";

export type ProviderContext = {
  requestId: string;
  contentHash: string;
  signal?: AbortSignal;
  repairErrors?: string[];
  intent?: InterpretedLessonIntent;
  creativeBrief?: CreativeLessonBrief;
};

export interface LessonProvider<Output = unknown> {
  readonly name: string;
  generate(request: LessonRequest, context: ProviderContext): Promise<Output>;
  regenerateScreen?(lesson: LessonDraft, screenId: string): Promise<LessonDraft>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: "configuration" | "source-too-large" | "timeout" | "malformed-json" | "invalid-response" | "provider-failure",
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
