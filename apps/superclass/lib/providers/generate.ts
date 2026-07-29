import { createHash, randomUUID } from "node:crypto";
import type { LessonRequest } from "@/types/lesson";
import { validateLessonDraft } from "@/lib/validation/lesson";
import { deterministicProvider } from "@/lib/providers/local";
import { ProviderError, type LessonProvider } from "@/lib/providers/types";

const GENERATION_TIMEOUT_MS = 8_000;

export async function generateLesson(request: LessonRequest, provider: LessonProvider = deterministicProvider) {
  const requestId = randomUUID();
  const contentHash = createHash("sha256").update(JSON.stringify(request)).digest("hex").slice(0, 16);
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ProviderError("Lesson generation timed out. Try again.", "timeout")), GENERATION_TIMEOUT_MS);
    });
    const lesson = await Promise.race([provider.generate(request, { requestId, contentHash }), timeout]);
    const validated = validateLessonDraft(lesson);
    if (!validated.ok) throw new ProviderError(`Generated lesson failed validation: ${validated.errors.join(" ")}`, "invalid-response");
    return lesson;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("The lesson provider could not complete this request.", "provider-failure");
  } finally {
    if (timer) clearTimeout(timer);
  }
}
