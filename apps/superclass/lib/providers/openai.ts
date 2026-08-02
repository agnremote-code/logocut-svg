import { buildLessonPrompt } from "@/lib/providers/prompt";
import { lessonDraftJsonSchema } from "@/lib/providers/schema";
import { ProviderError, type LessonProvider } from "@/lib/providers/types";
import type { LessonRequest } from "@/types/lesson";

type Fetch = typeof fetch;

type OpenAiResponse = {
  error?: { message?: string };
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
};

function responseText(response: OpenAiResponse) {
  if (response.output_text) return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.refusal) throw new ProviderError("The AI provider declined this lesson request.", "provider-failure");
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new ProviderError("The AI provider returned no structured lesson.", "invalid-response");
}

export function createOpenAiProvider(options: { apiKey: string; model: string; fetch?: Fetch }): LessonProvider {
  const request = options.fetch ?? fetch;
  return {
    name: "openai",
    async generate(lessonRequest: LessonRequest, context) {
      let response: Response;
      try {
        response = await request("https://api.openai.com/v1/responses", {
          method: "POST",
          signal: context.signal,
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
            "X-Client-Request-Id": context.requestId,
          },
          body: JSON.stringify({
            model: options.model,
            store: false,
            input: [
              {
                role: "developer",
                content:
                  "You are an expert CEFR language-teaching curriculum designer. Follow the supplied source exactly and produce safe, practical classroom materials.",
              },
              { role: "user", content: buildLessonPrompt(lessonRequest, context.repairErrors, context.intent, context.creativeBrief) },
            ],
            text: {
              format: {
                type: "json_schema",
                name: "superclass_lesson_draft",
                strict: true,
                schema: lessonDraftJsonSchema,
              },
            },
          }),
        });
      } catch {
        if (context.signal?.aborted) throw new ProviderError("Lesson generation timed out. Try again.", "timeout", true);
        throw new ProviderError("The AI lesson provider could not be reached.", "provider-failure", true);
      }

      const payload = (await response.json().catch(() => ({}))) as OpenAiResponse;
      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        throw new ProviderError(
          payload.error?.message ? `AI provider error: ${payload.error.message}` : `AI provider error (${response.status}).`,
          "provider-failure",
          retryable,
        );
      }

      const text = responseText(payload);
      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new ProviderError("The AI provider returned malformed JSON.", "malformed-json");
      }
    },
  };
}
