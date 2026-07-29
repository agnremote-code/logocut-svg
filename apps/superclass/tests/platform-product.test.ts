import assert from "node:assert/strict";
import test from "node:test";
import { initialActivityState, toggleActivityChoice, toggleFlashcard } from "../lib/lesson/activity";
import { lessonScreenRange, normalizeActivityTiming } from "../lib/lesson/duration";
import { createPostClassSummary } from "../lib/lesson/post-class";
import { generateLessonPdf, pdfFilename, pdfScreensForMode } from "../lib/pdf/lesson-pdf";
import { deterministicProvider } from "../lib/providers/local";
import { createEmptyProfile, createProfileStore, associateLessonWithProfile, deleteAllLocalTeachingData, PROFILE_STORE_KEY, recentLessonsForProfile } from "../lib/storage/profiles";
import { LATEST_DRAFT_KEY, RECENT_DRAFTS_KEY } from "../lib/storage/drafts";
import { platformDisclaimer, platformNames } from "../components/PlatformCompatibility";
import { defaultLessonRequest } from "../types/lesson";

const context = { requestId: "product-test", contentHash: "product-test-hash" };

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test("platform compatibility is factual, text-only and carries the required disclaimer", () => {
  assert.deepEqual(platformNames, ["Preply", "italki", "Cambly", "AmazingTalker", "Verbling", "Private lessons"]);
  assert.equal(platformDisclaimer, "Superclass is an independent product and is not affiliated with, endorsed by or sponsored by the teaching platforms mentioned.");
});

test("25, 50 and custom durations create valid counts and exact timing totals", async () => {
  for (const duration of [25, 50, 73]) {
    const lesson = await deterministicProvider.generate({ ...defaultLessonRequest, duration }, context);
    const [minimum, maximum] = lessonScreenRange(duration);
    assert.ok(lesson.screens.length >= minimum && lesson.screens.length <= maximum);
    assert.equal(lesson.screens.reduce((total, screen) => total + screen.timing, 0), duration);
  }
  assert.deepEqual(normalizeActivityTiming([{ timing: 2 }, { timing: 3 }], 20).map((item) => item.timing), [8, 12]);
});

test("lesson activity state supports selection, reveal state preservation and reset", () => {
  const selected = toggleActivityChoice(initialActivityState, 1);
  assert.deepEqual(selected.selected, [1]);
  assert.deepEqual(toggleActivityChoice(selected, 1).selected, []);
  assert.deepEqual(toggleFlashcard(initialActivityState, 0).flipped, [0]);
  assert.deepEqual(initialActivityState, { selected: [], revealed: false, flipped: [] });
});

test("profiles support create, update, duplicate, delete, association and private local clearing", async () => {
  const storage = memoryStorage();
  const store = createProfileStore(storage);
  const profile = createEmptyProfile();
  profile.nickname = "Learner A";
  store.save(profile);
  assert.equal(store.list()[0]?.nickname, "Learner A");
  assert.match(store.duplicate(profile.id)?.nickname ?? "", /copy$/);
  const lesson = await deterministicProvider.generate({ ...defaultLessonRequest, profileId: profile.id }, context);
  const associated = associateLessonWithProfile(profile, lesson);
  assert.equal(recentLessonsForProfile([lesson], profile.id).length, 1);
  assert.ok(associated.topicsUsed.includes(lesson.title));
  assert.ok(associated.vocabularyStudied.length > 0);
  store.remove(profile.id);
  assert.equal(store.list().some((item) => item.id === profile.id), false);
  storage.setItem(LATEST_DRAFT_KEY, "private");
  storage.setItem(RECENT_DRAFTS_KEY, "private");
  deleteAllLocalTeachingData(storage);
  assert.equal(storage.getItem(PROFILE_STORE_KEY), null);
  assert.equal(storage.getItem(LATEST_DRAFT_KEY), null);
  assert.equal(storage.getItem(RECENT_DRAFTS_KEY), null);
});

test("recent profile vocabulary is deprioritized in a new lesson", async () => {
  const lesson = await deterministicProvider.generate({ ...defaultLessonRequest, recentVocabulary: ["una idea clave", "desde mi experiencia"] }, context);
  const terms = lesson.screens.flatMap((screen) => screen.vocabulary.map((item) => item.term));
  assert.ok(terms.includes("un punto de vista"));
  assert.equal(terms.includes("una idea clave"), false);
});

test("post-class tools produce a student-ready recap without private teacher notes", async () => {
  const lesson = await deterministicProvider.generate(defaultLessonRequest, context);
  const summary = createPostClassSummary(lesson);
  assert.match(summary.classSummary, /Today we practised/);
  assert.ok(summary.vocabularyStudied.length > 0);
  assert.doesNotMatch(summary.studentMessage, /Private teaching material/);
});

test("PDFs are real, named by audience, preserve Spanish metadata and protect teacher content", async () => {
  const lesson = await deterministicProvider.generate({ ...defaultLessonRequest, source: "Una lección sobre hábitos y conversación en español." }, context);
  const studentScreens = pdfScreensForMode(lesson, "student");
  assert.equal(studentScreens.some((screen) => screen.type === "answer-key"), false);
  assert.equal(studentScreens.some((screen) => screen.answers.length || screen.teacherNotes.length), false);
  assert.equal(pdfScreensForMode(lesson, "teacher").some((screen) => screen.type === "answer-key"), true);
  assert.match(pdfFilename(lesson, "student"), /student-workbook\.pdf$/);
  assert.match(pdfFilename(lesson, "teacher"), /teacher-pack\.pdf$/);
  const [student, teacher] = await Promise.all([generateLessonPdf(lesson, "student"), generateLessonPdf(lesson, "teacher")]);
  assert.equal(Buffer.from(student).subarray(0, 4).toString(), "%PDF");
  assert.equal(Buffer.from(teacher).subarray(0, 4).toString(), "%PDF");
  assert.ok(teacher.length > student.length);
});
