import type { LessonDraft, LessonRequest } from "@/types/lesson";

export interface LessonProvider {
  readonly name: string;
  generate(request: LessonRequest, context: { requestId: string; contentHash: string }): Promise<LessonDraft>;
  regenerateScreen?(lesson: LessonDraft, screenId: string): Promise<LessonDraft>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly code: "timeout" | "invalid-response" | "provider-failure") {
    super(message);
    this.name = "ProviderError";
  }
}
