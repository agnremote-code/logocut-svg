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
const landing = `${file("../components/LessonApp.tsx")} ${builder}`;
const layouts = file("../components/canva/CanvaLayouts.tsx");
const css = file("../app/globals.css");

const request = (partial: Partial<LessonRequest>): LessonRequest => ({ ...defaultLessonRequest, ...partial });

test("product positioning is the focused Text to Class promise", () => {
  assert.match(landing, /TEXT TO CLASS/);
  assert.match(landing, /What do you want to teach\?/);
  assert.match(landing, /Describe the class, paste material, or add a YouTube link/);
  assert.doesNotMatch(landing, /Pricing preview|Preply|italki/);
});

test("Light Editorial is the default and its active palette has readable text", () => {
  assert.equal(defaultLessonRequest.visualStyle, "light-editorial");
  assert.match(css, /\.lesson-player\.visual-light-editorial[^}]+#f7f9fc[^}]+#17324d/);
  const activeTheme = css.match(/\.lesson-player\.visual-light-editorial\s*\{[^}]+\}/)?.[0] ?? "";
  assert.doesNotMatch(activeTheme, /#b6ef35|#d9ff61|color:\s*white/i);
});

test("teacher answers are closed by default and no permanent teacher panel remains", () => {
  assert.match(layouts, /const \[open, setOpen\] = useState\(false\)/);
  assert.doesNotMatch(classroom, /private-teacher-panel|PRIVATE TEACHER PANEL|panelOpen|teacher-tools-drawer/);
  assert.match(layouts, /Respuesta docente/);
  assert.match(layouts, /open && <aside/);
});

test("student canvas never renders answers before the teacher explicitly reveals them", () => {
  assert.match(layouts, /if \(!screen\.answers\.length && !screen\.teacherNotes\.length\) return null/);
  assert.match(layouts, /aria-expanded=\{open\}/);
  assert.match(layouts, /\{open && <aside/);
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

test("intermediate ser/estar is a 14-screen Canva-quality grammar workshop", async () => {
  const lesson = await deterministicProvider.generate(request({
    source: "Una clase práctica de gramática sobre ser y estar.",
    level: "B1", duration: 50, lessonFormat: "grammar-workshop", lessonFocus: "grammar-focused",
  }), context);
  assert.equal(lesson.archetype, "intermediate-grammar-workshop");
  assert.equal(lesson.screens.length, 14);
  assert.deepEqual(lesson.screens.map((screen) => screen.layout), [
    "hero-cover", "how-it-works-cards", "grammar-contrast", "vocabulary-expression-bank", "photo-choice", "visual-menu-grid", "dynamic-panel", "canva-sentence-builder",
    "opinion-switch", "role-play-scenario", "split-image-questions", "rapid-fire", "final-manifesto", "feedback-screen",
  ]);
  assert.match(JSON.stringify(lesson), /identity\/origin[\s\S]*location\/state/i);
  assert.equal(lesson.screens.some((screen) => screen.answers.length > 0), true);
  assert.doesNotMatch(classroom, /TEACHER ANSWER \/ MODEL|teacherMode/);
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
  assert.equal(selectLessonArchetype(request({
    sourceMode: "idea",
    source: "A source article for discussion.\nIt contains a central claim.\nIt gives two examples.\nIt ends with a conclusion.",
  })).id, "source-comprehension");
});

test("builder keeps specific instructions internal and removes the ChatGPT helper", () => {
  assert.match(builder, /Specific instructions/);
  assert.match(builder, /More options/);
  assert.doesNotMatch(builder, /Copy prompt for ChatGPT|navigator\.clipboard\.writeText|chatgpt|openai\.com/i);
});

test("Canva classroom CSS preserves 16:9 desktop fit and mobile scaling", () => {
  assert.match(css, /aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(css, /\.canva-presenter[^}]+overflow:hidden/);
  assert.match(css, /\.canva-presenter>main \.canva-canvas\{width:min\(92vw/);
  assert.match(css, /@media \(max-width:620px\)/);
  assert.match(css, /container-type:inline-size/);
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
