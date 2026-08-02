import assert from "node:assert/strict";
import test from "node:test";
import { disabledGenerationCache } from "../lib/providers/cache";
import type { ProviderConfig } from "../lib/providers/config";
import { generateLesson } from "../lib/providers/generate";
import { deterministicProvider } from "../lib/providers/local";
import { createOpenAiProvider } from "../lib/providers/openai";
import { clearGenerationDiagnostics, getGenerationDiagnostics } from "../lib/providers/telemetry";
import { ProviderError, type LessonProvider } from "../lib/providers/types";
import { defaultLessonRequest, type LessonRequest } from "../types/lesson";

const config: ProviderConfig = {
  provider: "local",
  openAiModel: "gpt-5.4-mini",
  timeoutMs: 30,
  maxSourceChars: 12_000,
  cache: "none",
};
const options = { config, cache: disabledGenerationCache, logger() {} };
const fixtureContext = { requestId: "fixture-request", contentHash: "fixture-content-hash" };

async function validFixture(request: LessonRequest = defaultLessonRequest) {
  return deterministicProvider.generate(request, fixtureContext);
}

test("OpenAI provider parses a valid structured response", async () => {
  const fixture = await validFixture();
  const provider = createOpenAiProvider({
    apiKey: "test-key",
    model: "gpt-5.4-mini",
    fetch: async () => new Response(JSON.stringify({ output_text: JSON.stringify(fixture) }), { status: 200 }),
  });
  const lesson = await generateLesson(defaultLessonRequest, provider, options);
  assert.equal(lesson.level, "B1");
  assert.equal(lesson.screens.length, fixture.screens.length);
});

test("OpenAI provider rejects malformed JSON", async () => {
  const provider = createOpenAiProvider({
    apiKey: "test-key",
    model: "gpt-5.4-mini",
    fetch: async () => new Response(JSON.stringify({ output_text: "{not-json" }), { status: 200 }),
  });
  await assert.rejects(() => generateLesson(defaultLessonRequest, provider, options), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.equal(error.code, "malformed-json");
    return true;
  });
});

test("schema-invalid provider response is rejected", async () => {
  const provider: LessonProvider = { name: "invalid", async generate() { return { title: "Missing almost everything" }; } };
  await assert.rejects(() => generateLesson(defaultLessonRequest, provider, options), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.equal(error.code, "invalid-response");
    return true;
  });
});

test("configured maximum source length is enforced before provider execution", async () => {
  let called = false;
  const provider: LessonProvider = {
    name: "must-not-run",
    async generate() {
      called = true;
      return {};
    },
  };
  await assert.rejects(
    () =>
      generateLesson(
        { ...defaultLessonRequest, source: "This source is deliberately longer than the configured test limit." },
        provider,
        { ...options, config: { ...config, maxSourceChars: 20 } },
      ),
    (error: unknown) => {
      assert.ok(error instanceof ProviderError);
      assert.equal(error.code, "source-too-large");
      return true;
    },
  );
  assert.equal(called, false);
});

test("provider timeout is surfaced without fake fallback content", async () => {
  const provider: LessonProvider = {
    name: "slow",
    async generate() {
      return new Promise(() => {});
    },
  };
  await assert.rejects(() => generateLesson(defaultLessonRequest, provider, options), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.equal(error.code, "timeout");
    return true;
  });
});

test("provider errors are surfaced", async () => {
  const provider: LessonProvider = {
    name: "offline",
    async generate() {
      throw new ProviderError("Provider unavailable", "provider-failure");
    },
  };
  await assert.rejects(() => generateLesson(defaultLessonRequest, provider, options), /Provider unavailable/);
});

test("one safe retry can succeed", async () => {
  const fixture = await validFixture();
  let calls = 0;
  const provider: LessonProvider = {
    name: "retry-once",
    async generate() {
      calls += 1;
      if (calls === 1) throw new ProviderError("Temporary rate limit", "provider-failure", true);
      return fixture;
    },
  };
  const lesson = await generateLesson(defaultLessonRequest, provider, options);
  assert.equal(calls, 2);
  assert.equal(lesson.level, defaultLessonRequest.level);
});

test("source grounding rejects excerpts absent from supplied material", async () => {
  const request: LessonRequest = {
    ...defaultLessonRequest,
    sourceMode: "idea",
    source: [
      "Community gardens can lower summer temperatures.",
      "They help neighbors share practical skills.",
      "One local report compares gardens in three districts.",
      "The evidence connects shade, food access and stronger community ties.",
    ].join("\n"),
  };
  const fixture = await validFixture(request);
  const ungrounded = {
    ...fixture,
    screens: fixture.screens.map((screen) => ({ ...screen, sourceExcerpt: screen.sourceExcerpt ? "A fabricated quotation." : undefined })),
  };
  const provider: LessonProvider = { name: "ungrounded", async generate() { return ungrounded; } };
  await assert.rejects(() => generateLesson(request, provider, options), /no exact supporting excerpt/);
});

test("generation logs and diagnostics never contain lesson or student text", async () => {
  clearGenerationDiagnostics();
  const privateRequest = {
    ...defaultLessonRequest,
    source: "PRIVATE_LESSON_TEXT about a confidential workplace situation.",
    interests: "PRIVATE_STUDENT_INTEREST",
    learningGoal: "PRIVATE_STUDENT_GOAL",
  };
  const fixture = await validFixture(privateRequest);
  const provider: LessonProvider = { name: "privacy-test", async generate() { return fixture; } };
  const lines: string[] = [];
  await generateLesson(privateRequest, provider, { ...options, logger: (line) => lines.push(line) });
  const telemetry = JSON.stringify({ lines, diagnostics: getGenerationDiagnostics() });
  assert.doesNotMatch(telemetry, /PRIVATE_LESSON_TEXT|PRIVATE_STUDENT_INTEREST|PRIVATE_STUDENT_GOAL/);
  assert.match(telemetry, /contentHash/);
});
