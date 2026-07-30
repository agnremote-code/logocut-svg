import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAnalyticsMetadata } from "../lib/analytics";
import { lessonScreenRange } from "../lib/lesson/duration";
import { toStudentLesson } from "../lib/lesson/modes";
import { deterministicProvider } from "../lib/providers/local";
import { generateLesson } from "../lib/providers/generate";
import { ProviderError, type LessonProvider } from "../lib/providers/types";
import { deserializeDraft, serializeDraft } from "../lib/storage/drafts";
import { extractYouTubeId, validateLessonDraft, validateLessonRequest, validateVideoUrl } from "../lib/validation/lesson";
import { defaultLessonRequest, lessonDurations, lessonLevels, type LessonRequest } from "../types/lesson";

const context = { requestId: "request-test", contentHash: "stablehash123456" };

test("valid lesson request passes shared runtime validation", () => {
  const result = validateLessonRequest(defaultLessonRequest);
  assert.equal(result.ok, true);
});

test("invalid lesson requests return useful errors", () => {
  const result = validateLessonRequest({ ...defaultLessonRequest, source: "short" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(" "), /12 characters/);
});

test("every CEFR level produces validated, level-specific output", async () => {
  for (const level of lessonLevels) {
    const lesson = await deterministicProvider.generate({ ...defaultLessonRequest, level }, context);
    assert.equal(lesson.level, level);
    assert.ok(lesson.levelSignals.length >= 3);
    assert.equal(validateLessonDraft(lesson).ok, true, `${level} lesson should validate`);
  }
});

test("every duration stays inside its required screen range", async () => {
  for (const duration of lessonDurations) {
    const lesson = await deterministicProvider.generate({ ...defaultLessonRequest, duration }, context);
    const [minimum, maximum] = lessonScreenRange(duration);
    assert.ok(lesson.screens.length >= minimum);
    assert.ok(lesson.screens.length <= maximum);
    assert.equal(validateLessonDraft(lesson).ok, true);
  }
});

test("idea material and video source modes stay differentiated and grounded", async () => {
  const idea = await deterministicProvider.generate(defaultLessonRequest, context);
  const materialRequest: LessonRequest = {
    ...defaultLessonRequest,
    sourceMode: "idea",
    source: [
      "City parks reduce heat and give neighbors a place to meet.",
      "Local funding remains uneven.",
      "Residents say shaded public areas make summer afternoons safer.",
      "The article compares two neighborhood projects and their results.",
    ].join("\n"),
  };
  const material = await deterministicProvider.generate(materialRequest, context);
  const videoRequest: LessonRequest = {
    ...defaultLessonRequest,
    sourceMode: "video",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    transcript: "The speaker explains three ways to adapt to a new city while maintaining familiar routines.",
  };
  const video = await deterministicProvider.generate(videoRequest, context);
  assert.equal(idea.screens.some((screen) => screen.type === "source"), false);
  assert.equal(material.screens.some((screen) => screen.sourceExcerpt?.includes("City parks")), true);
  assert.equal(video.screens.some((screen) => screen.videoId === "dQw4w9WgXcQ"), true);
});

test("roleplay is disabled by default and only appears when deliberately enabled", async () => {
  assert.equal(defaultLessonRequest.includeRoleplay, false);
  const without = await deterministicProvider.generate(defaultLessonRequest, context);
  const withRoleplay = await deterministicProvider.generate({ ...defaultLessonRequest, includeRoleplay: true }, context);
  assert.equal(without.screens.some((screen) => screen.title === "Optional roleplay"), false);
  assert.equal(withRoleplay.screens.some((screen) => screen.title === "Roleplay específico"), true);
});

test("A0 and C1 output differ pedagogically", async () => {
  const beginner = await deterministicProvider.generate(
    { ...defaultLessonRequest, level: "A0", practiceDensity: "repetition-heavy", skillsFocus: ["speaking", "pronunciation"] },
    context,
  );
  const advanced = await deterministicProvider.generate({ ...defaultLessonRequest, level: "C1" }, context);
  assert.ok(beginner.screens.some((screen) => screen.type === "sentence-frames"));
  assert.ok(beginner.screens.some((screen) => screen.type === "pronunciation"));
  assert.ok(advanced.screens.some((screen) => screen.type === "debate"));
  assert.notDeepEqual(beginner.levelSignals, advanced.levelSignals);
});

test("lesson validators enforce screen limits and reject duplicate questions", async () => {
  const lesson = await deterministicProvider.generate(defaultLessonRequest, context);
  assert.equal(validateLessonDraft(lesson).ok, true);
  const duplicated = {
    ...lesson,
    screens: lesson.screens.map((screen, index) =>
      index === 2 ? { ...screen, prompts: ["What is your first association with this topic?", "What is your first association with this topic?"] } : screen,
    ),
  };
  assert.equal(validateLessonDraft(duplicated).ok, false);
});

test("student mode excludes teacher notes, answers and answer-key screens", async () => {
  const lesson = await deterministicProvider.generate(defaultLessonRequest, context);
  const student = toStudentLesson(lesson);
  assert.equal(student.screens.some((screen) => screen.type === "answer-key"), false);
  assert.equal(student.screens.some((screen) => screen.teacherNotes.length > 0 || screen.answers.length > 0), false);
});

test("local draft serialization rejects incompatible schemas", async () => {
  const lesson = await deterministicProvider.generate(defaultLessonRequest, context);
  assert.deepEqual(deserializeDraft(serializeDraft(lesson)), JSON.parse(JSON.stringify(lesson)));
  assert.equal(deserializeDraft('{"schemaVersion":99,"lesson":{}}'), null);
  assert.equal(deserializeDraft("not json"), null);
});

test("analytics sanitizer excludes lesson text and personal context", () => {
  const result = sanitizeAnalyticsMetadata({
    level: "B1",
    duration: 60,
    sourceMode: "idea",
    source: "private lesson text",
    studentName: "Private",
    interests: "personal context",
  });
  assert.deepEqual(result, { level: "B1", duration: 60, sourceMode: "idea" });
});

test("deterministic provider is stable for the same request and context", async () => {
  const first = await deterministicProvider.generate(defaultLessonRequest, context);
  const second = await deterministicProvider.generate(defaultLessonRequest, context);
  assert.deepEqual(first, second);
});

test("screen regeneration changes only the selected screen", async () => {
  const lesson = await deterministicProvider.generate(defaultLessonRequest, context);
  const target = lesson.screens[1];
  const regenerated = await deterministicProvider.regenerateScreen?.(lesson, target.id);
  assert.ok(regenerated);
  assert.notEqual(regenerated.screens[1].instruction, lesson.screens[1].instruction);
  assert.deepEqual(regenerated.screens[0], lesson.screens[0]);
  assert.deepEqual(regenerated.screens.slice(2), lesson.screens.slice(2));
});

test("provider failures are surfaced and never replaced by fake success", async () => {
  const failingProvider: LessonProvider = {
    name: "failing-test-provider",
    async generate() {
      throw new Error("offline");
    },
  };
  await assert.rejects(() => generateLesson(defaultLessonRequest, failingProvider), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.equal(error.code, "provider-failure");
    return true;
  });
});

test("video URL validation accepts safe URLs and extracts YouTube IDs", () => {
  assert.equal(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(validateVideoUrl("javascript:alert(1)").ok, false);
  assert.equal(validateVideoUrl("not-a-url").ok, false);
  assert.equal(validateVideoUrl("https://example.com/video").ok, true);
});

test("video requests require teacher-supplied transcript or notes", () => {
  const result = validateLessonRequest({ ...defaultLessonRequest, sourceMode: "video", videoUrl: "https://youtu.be/dQw4w9WgXcQ", transcript: "" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(" "), /Import captions or upload/);
});
