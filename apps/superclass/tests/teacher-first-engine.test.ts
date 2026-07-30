import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { selectLessonArchetype } from "../lib/lesson/archetypes";
import { generateLessonPdf, pdfScreensForMode } from "../lib/pdf/lesson-pdf";
import { deterministicProvider } from "../lib/providers/local";
import { defaultLessonRequest, type LessonRequest } from "../types/lesson";

const context = { requestId: "teacher-first", contentHash: "teacher-first-hash" };
const file = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const classroom = file("../components/ClassroomMode.tsx");
const builder = file("../components/LessonBuilder.tsx");
const landing = `${file("../components/LessonApp.tsx")} ${file("../components/MarketingSections.tsx")} ${file("../components/PlatformCompatibility.tsx")}`;
const css = file("../app/globals.css");

const request = (partial: Partial<LessonRequest>): LessonRequest => ({ ...defaultLessonRequest, ...partial });

test("product positioning consistently includes tutors and teachers", () => {
  assert.match(landing, /tutors and teachers/i);
  assert.match(landing, /Describe the class\. Open it\. Teach it\./);
  assert.match(landing, /Preply[\s\S]*italki/);
});

test("Light Editorial is the default and its active palette has readable text", () => {
  assert.equal(defaultLessonRequest.visualStyle, "light-editorial");
  assert.match(css, /\.lesson-player\.visual-light-editorial[^}]+#f7f9fc[^}]+#17324d/);
  const activeTheme = css.match(/\.lesson-player\.visual-light-editorial\s*\{[^}]+\}/)?.[0] ?? "";
  assert.doesNotMatch(activeTheme, /#b6ef35|#d9ff61|color:\s*white/i);
});

test("Teacher tools are closed by default and no permanent teacher panel remains", () => {
  assert.match(classroom, /useState\(false\)[\s\S]*teacherToolsOpen|teacherToolsOpen[\s\S]*useState\(false\)/);
  assert.doesNotMatch(classroom, /private-teacher-panel|PRIVATE TEACHER PANEL|panelOpen/);
  assert.match(classroom, /Teacher tools/);
  assert.match(classroom, /teacherMode && teacherToolsOpen/);
});

test("student mode hides teacher tools and answers", () => {
  assert.match(classroom, /teacherMode && <button[^>]+[\s\S]*Teacher tools/);
  assert.match(classroom, /teacherMode && screen\.answers\.length/);
  assert.match(classroom, /teacherMode && state\.revealed/);
});

test("beginner engine is bilingual, bank-based and limits questions", async () => {
  const lesson = await deterministicProvider.generate(request({
    source: "Buenos Aires en español: lugares, personas y vida cotidiana.",
    level: "A0", duration: 45, languageMode: "bilingual", lessonFormat: "beginner-visual-vocabulary",
  }), context);
  assert.equal(lesson.archetype, "beginner-visual-topic");
  assert.ok(lesson.screens.some((screen) => screen.layout === "image-topic"));
  assert.ok(lesson.screens.some((screen) => screen.layout === "vocabulary-cards" && screen.vocabulary.length >= 6));
  assert.ok(lesson.screens.some((screen) => screen.layout === "sentence-builder"));
  assert.ok(lesson.screens.some((screen) => screen.layout === "connector-bank"));
  assert.ok(lesson.screens.every((screen) => screen.prompts.length <= 4));
  assert.match(JSON.stringify(lesson), /Buenos Aires[\s\S]*interesting|interesante[\s\S]*interesting/i);
});

test("intermediate ser/estar is a 14-screen grammar workshop plus private key", async () => {
  const lesson = await deterministicProvider.generate(request({
    source: "Una clase práctica de gramática sobre ser y estar.",
    level: "B1", duration: 50, lessonFormat: "grammar-workshop", lessonFocus: "grammar-focused",
  }), context);
  assert.equal(lesson.archetype, "intermediate-grammar-workshop");
  assert.equal(lesson.screens.filter((screen) => screen.type !== "answer-key").length, 14);
  assert.deepEqual(lesson.screens.filter((screen) => screen.type !== "answer-key").map((screen) => screen.layout), [
    "cover", "objective", "comparison", "rule-cards", "rule-cards", "multiple-choice", "sorting", "fill-gap",
    "error-correction", "illustrated-context", "personal-prompts", "dialogue", "recap", "homework",
  ]);
  assert.match(JSON.stringify(lesson), /Who or what something is[\s\S]*Where something is or how it is now/);
  assert.doesNotMatch(classroom, /TEACHER ANSWER \/ MODEL/);
});

test("advanced engine uses editorial and debate structures instead of beginner banks", async () => {
  const lesson = await deterministicProvider.generate(request({
    source: "Las Vegas, casino design, risk, reward and the psychology of gambling.",
    language: "en", level: "B2", duration: 60, lessonFormat: "debate-critical-thinking",
  }), context);
  assert.equal(lesson.archetype, "advanced-debate");
  assert.ok(lesson.screens.some((screen) => screen.layout === "debate-cards"));
  assert.ok(lesson.screens.some((screen) => screen.layout === "sorting"));
  assert.ok(lesson.screens.some((screen) => screen.type === "debate"));
  assert.equal(lesson.screens.some((screen) => screen.layout === "topic-menu"), false);
});

test("automatic archetype selection responds to level, source and focus", () => {
  assert.equal(selectLessonArchetype(request({ level: "A0", source: "La familia" })).id, "beginner-visual-topic");
  assert.equal(selectLessonArchetype(request({ level: "B1", source: "Ser y estar", lessonFocus: "grammar-focused" })).id, "intermediate-grammar-workshop");
  assert.equal(selectLessonArchetype(request({ level: "C1", source: "An ethical debate about persuasive technology" })).id, "advanced-debate");
  assert.equal(selectLessonArchetype(request({ sourceMode: "text", source: "A source text with enough material for discussion." })).id, "source-comprehension");
});

test("builder exposes custom class instructions and a copy-only ChatGPT helper", () => {
  assert.match(builder, /How should this class work\?/);
  assert.match(builder, /Copy prompt for ChatGPT/);
  assert.match(builder, /navigator\.clipboard\.writeText/);
  assert.match(builder, /No direct integration and no data is sent automatically/);
  assert.doesNotMatch(builder, /fetch\([^)]*chatgpt|openai\.com/i);
  assert.match(builder, /CLASS PLAN[\s\S]*Approximately/);
});

test("classroom CSS preserves 16:9 desktop fit and mobile overflow safety", () => {
  assert.match(css, /aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*max-height:\s*calc\(100vh - 180px\)/);
  assert.match(css, /\.lesson-player\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(css, /\.classroom-canvas[\s\S]*min-width:\s*0/);
  assert.match(css, /word-wrap|overflow-wrap/);
});

test("PDFs follow the selected archetype without exposing private answers to students", async () => {
  const lesson = await deterministicProvider.generate(request({
    source: "Mi rutina diaria con verbos simples.", level: "A1", duration: 45,
    lessonFormat: "beginner-visual-vocabulary", languageMode: "bilingual",
  }), context);
  assert.equal(pdfScreensForMode(lesson, "student").some((screen) => screen.answers.length || screen.teacherNotes.length), false);
  const bytes = await generateLessonPdf(lesson, "student");
  assert.ok(bytes.byteLength > 3_000);
  assert.match(file("../lib/pdf/lesson-pdf.ts"), /lesson\.archetype/);
  assert.doesNotMatch(file("../lib/pdf/lesson-pdf.ts"), /internal validation|coverage percentage/i);
});
