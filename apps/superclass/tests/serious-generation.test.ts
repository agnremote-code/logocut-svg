import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { languageOptions, normalizeLanguageId } from "../lib/lesson/language";
import { createLessonPlan } from "../lib/lesson/planning";
import { topicCoverageScore, validateTopicAndLanguage } from "../lib/lesson/quality";
import { activeSourceIsReady, switchSourceMode } from "../lib/lesson/request-state";
import { toStudentLesson } from "../lib/lesson/modes";
import { generateLessonPdf, pdfScreensForMode } from "../lib/pdf/lesson-pdf";
import { disabledGenerationCache } from "../lib/providers/cache";
import type { ProviderConfig } from "../lib/providers/config";
import { generateLesson } from "../lib/providers/generate";
import { deterministicProvider } from "../lib/providers/local";
import type { LessonProvider } from "../lib/providers/types";
import { localTranscriptProvider } from "../lib/transcripts/providers";
import { TranscriptError } from "../lib/transcripts/types";
import { validateLessonRequest } from "../lib/validation/lesson";
import { defaultLessonRequest, type LessonRequest } from "../types/lesson";

const context = { requestId: "serious-test", contentHash: "serious-test-hash" };
const config: ProviderConfig = { provider: "local", openAiModel: "mock", timeoutMs: 1_000, maxSourceChars: 12_000, cache: "none" };
const serEstarRequest: LessonRequest = {
  ...defaultLessonRequest,
  sourceMode: "idea",
  source: "Verbos ser y estar",
  language: "es",
  supportLanguage: "en",
  languageMode: "bilingual",
  level: "B1",
  duration: 60,
  studentType: "individual",
  lessonFocus: "grammar-focused",
};

test("language architecture uses stable IDs with English and Spanish first", () => {
  assert.deepEqual(languageOptions.slice(0, 2), [{ id: "en", label: "English" }, { id: "es", label: "Spanish" }]);
  assert.equal(normalizeLanguageId("ENGLISH"), "en");
  assert.equal(normalizeLanguageId("Spanish"), "es");
  assert.equal(normalizeLanguageId("español"), "es");
  assert.equal(validateLessonRequest({ ...defaultLessonRequest, language: "SPANISH", supportLanguage: "English" }).ok, true);
});

test("builder exposes searchable target/support comboboxes and an explicit language mode", () => {
  const builder = readFileSync(new URL("../components/LessonBuilder.tsx", import.meta.url), "utf8");
  assert.match(builder, /role="combobox"/);
  assert.match(builder, /id="target-language"/);
  assert.match(builder, /id="support-language"/);
  assert.match(builder, /Lesson language mode/);
  assert.match(builder, /Smart by level/);
  assert.match(builder, /Bilingual/);
});

test("lesson plan locks topic, bilingual contract and prohibited preset leakage", () => {
  const plan = createLessonPlan(serEstarRequest);
  assert.equal(plan.exactTopic, "Verbos ser y estar");
  assert.equal(plan.specializedTemplate, "ser-estar");
  assert.equal(plan.language.targetLabel, "Spanish");
  assert.equal(plan.language.supportLabel, "English");
  assert.equal(plan.language.mode, "bilingual");
  assert.ok(plan.prohibitedContent.includes("living abroad"));
});

test("switching from invalid video to idea clears video-only state and allows generation", async () => {
  const invalidVideo = { ...serEstarRequest, sourceMode: "video" as const, videoUrl: "https://youtu.be/nocaption01", transcript: "" };
  const invalid = validateLessonRequest(invalidVideo);
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.match(invalid.errors.join(" "), /Import captions or upload/);
  const idea = { ...switchSourceMode(invalidVideo, "idea"), source: "Verbos ser y estar" };
  assert.equal(idea.videoUrl, "");
  assert.equal(idea.transcript, "");
  assert.equal(activeSourceIsReady(idea), true);
  assert.equal(validateLessonRequest(idea).ok, true);
  const lesson = await deterministicProvider.generate(idea, context);
  assert.equal(lesson.title, "SER vs ESTAR");
});

test("automatic local captions succeed and unavailable captions fail honestly", async () => {
  const imported = await localTranscriptProvider.importCaptions("https://youtu.be/caption0001");
  assert.equal(imported.mocked, true);
  assert.match(imported.transcript, /daily habits/);
  await assert.rejects(
    () => localTranscriptProvider.importCaptions("https://youtu.be/nocaption01"),
    (error: unknown) => error instanceof TranscriptError && error.code === "captions-unavailable",
  );
});

test("video fallback keeps uploaded media primary and manual transcript secondary", () => {
  const builder = readFileSync(new URL("../components/LessonBuilder.tsx", import.meta.url), "utf8");
  const upload = builder.indexOf("Upload the video or audio file");
  const manual = builder.indexOf("Advanced: paste transcript manually");
  assert.ok(upload > -1);
  assert.ok(manual > upload);
  assert.match(builder, /Imported transcript · editable/);
});

test("ser/estar output obeys topic, language, pedagogy and visual-layout contracts", async () => {
  const lesson = await generateLesson(serEstarRequest, deterministicProvider, { config, cache: disabledGenerationCache, logger() {} });
  const text = JSON.stringify(lesson);
  assert.match(lesson.title, /SER.*ESTAR/i);
  assert.doesNotMatch(text, /living abroad|adapting to a new culture/i);
  assert.ok(topicCoverageScore(lesson, serEstarRequest) >= 0.8);
  assert.equal(validateTopicAndLanguage(lesson, serEstarRequest).ok, true);
  assert.ok(lesson.screens.some((screen) => screen.layout === "comparison"));
  assert.ok(lesson.screens.some((screen) => screen.layout === "sorting"));
  assert.ok(lesson.screens.some((screen) => screen.type === "error-correction"));
  assert.ok(lesson.screens.some((screen) => screen.type === "personal-questions"));
  assert.ok(lesson.screens.some((screen) => screen.layout === "dialogue"));
  assert.ok(lesson.screens.some((screen) => screen.type === "answer-key"));
  assert.ok(new Set(lesson.screens.map((screen) => screen.layout)).size >= 6);
  assert.match(text, /Soy Elena|Estoy contenta|Madrid está en España/);
  assert.match(text, /Two verbs|Choose|identity/);
  assert.equal(toStudentLesson(lesson).screens.some((screen) => screen.answers.length || screen.teacherNotes.length || screen.type === "answer-key"), false);
});

test("wrong-language and topic-leakage validation fail visibly", async () => {
  const lesson = await deterministicProvider.generate(serEstarRequest, context);
  const wrong = {
    ...lesson,
    screens: lesson.screens.map((screen) => ({
      ...screen,
      title: "Generic English lesson",
      instruction: "Choose the correct option in this general lesson.",
      body: "The student is learning a generic unrelated topic.",
      prompts: ["Choose the answer."],
    })),
  };
  const quality = validateTopicAndLanguage(wrong, serEstarRequest);
  assert.equal(quality.ok, false);
  assert.match(quality.errors.join(" "), /Topic coverage|wrong language/);
});

test("one structured provider repair preserves the original request", async () => {
  const valid = await deterministicProvider.generate(serEstarRequest, context);
  let calls = 0;
  let repairErrors: string[] | undefined;
  const provider: LessonProvider = {
    name: "repair-test",
    async generate(request, providerContext) {
      calls += 1;
      assert.equal(request.source, "Verbos ser y estar");
      if (calls === 1) return { ...valid, title: "Living abroad", screens: valid.screens.map((screen) => ({ ...screen, title: "Living abroad" })) };
      repairErrors = providerContext.repairErrors;
      return valid;
    },
  };
  const lesson = await generateLesson(serEstarRequest, provider, { config, cache: disabledGenerationCache, logger() {} });
  assert.equal(calls, 2);
  assert.ok((repairErrors?.length ?? 0) > 0);
  assert.equal(lesson.title, "SER vs ESTAR");
});

test("local provider derives other lessons from the actual request", async () => {
  const job = await deterministicProvider.generate({ ...defaultLessonRequest, source: "Job interviews", language: "en", level: "B2" }, context);
  assert.match(job.title, /Job interviews/i);
  assert.doesNotMatch(JSON.stringify(job), /living abroad/i);
  const family = await deterministicProvider.generate({ ...defaultLessonRequest, source: "La familia", language: "es", level: "A1", lessonFocus: "conversation" }, context);
  assert.match(family.title, /familia/i);
  assert.match(JSON.stringify(family), /Puedo hablar|Lenguaje útil|Tu experiencia/);
});

test("specialized Spanish grammar templates teach the requested contrast", async () => {
  const cases = [
    ["Presente de indicativo", /hablo[\s\S]*hablas[\s\S]*habla/],
    ["Pretérito vs imperfecto", /evento completo[\s\S]*contexto/],
    ["Por vs para", /causa[\s\S]*finalidad/],
    ["Subjuntivo básico", /Quiero que[\s\S]*vengas/],
    ["Artículos", /el, la, los, las/],
    ["Género y número", /masculino y femenino/],
    ["Formación de preguntas", /¿Dónde trabajas\?/],
  ] as const;
  for (const [source, evidence] of cases) {
    const lesson = await deterministicProvider.generate({ ...serEstarRequest, source }, context);
    assert.match(JSON.stringify(lesson), evidence);
    assert.ok(new Set(lesson.screens.map((screen) => screen.layout)).size >= 6);
    assert.doesNotMatch(JSON.stringify(lesson), /living abroad/i);
  }
});

test("visual acceptance lesson set stays source-specific and structurally varied", async () => {
  const requests: LessonRequest[] = [
    { ...defaultLessonRequest, source: "Job interviews", language: "en", level: "B2", duration: 60 },
    { ...defaultLessonRequest, source: "La familia", language: "es", level: "A1", duration: 60 },
    {
      ...defaultLessonRequest,
      sourceMode: "video",
      source: "",
      videoUrl: "https://youtu.be/caption0001",
      transcript: "A chef explains three techniques for preparing fresh pasta and compares the texture of each dough.",
      language: "en",
      level: "B1",
      lessonFocus: "source-comprehension",
      duration: 60,
    },
    { ...defaultLessonRequest, source: "Debate sobre la inteligencia artificial en la educación", language: "es", level: "C1", duration: 60 },
  ];
  const lessons = await Promise.all(requests.map((request, index) => deterministicProvider.generate(request, { ...context, requestId: `visual-${index}` })));
  assert.match(lessons[0].title, /Job interviews/i);
  assert.match(lessons[1].title, /familia/i);
  assert.match(JSON.stringify(lessons[2]), /chef explains three techniques/i);
  assert.ok(lessons[3].screens.some((screen) => screen.layout === "debate-cards"));
  for (const lesson of lessons) {
    assert.ok(new Set(lesson.screens.map((screen) => screen.layout)).size >= 6);
    assert.doesNotMatch(JSON.stringify(lesson), /living abroad/i);
  }
});

test("classroom CSS keeps a real 16:9 desktop canvas with mobile overflow protection", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.classroom-canvas[\s\S]*aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(css, /@media\s*\(max-width:\s*700px\)[\s\S]*\.classroom-canvas[\s\S]*min-width:\s*0/);
});

test("PDF packs remain topic-correct, bilingual and private", async () => {
  const lesson = await deterministicProvider.generate(serEstarRequest, context);
  const student = pdfScreensForMode(lesson, "student");
  assert.equal(student.some((screen) => screen.type === "answer-key" || screen.answers.length || screen.teacherNotes.length), false);
  assert.match(JSON.stringify(student), /SER vs ESTAR|Dos verbos/);
  const bytes = await generateLessonPdf(lesson, "student");
  assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), "%PDF");
  assert.ok(bytes.length > 5_000);
});
