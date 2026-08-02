import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canvaLayoutNames, countInteractiveScreens } from "../lib/lesson/canva-storyboard";
import { createCreativeLessonBrief, hasRepeatedLayoutRun } from "../lib/lesson/creative-brief";
import { applyDetectedInput, detectLessonInput } from "../lib/lesson/input-detection";
import { interpretLessonRequest } from "../lib/lesson/intent";
import { languageOptions } from "../lib/lesson/language";
import { disabledGenerationCache } from "../lib/providers/cache";
import type { ProviderConfig } from "../lib/providers/config";
import { generateLesson } from "../lib/providers/generate";
import { deterministicProvider } from "../lib/providers/local";
import { validateLessonDraft } from "../lib/validation/lesson";
import { defaultLessonRequest, emptyLessonRequest, type LessonRequest } from "../types/lesson";

const file = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const builder = file("../components/LessonBuilder.tsx");
const app = file("../components/LessonApp.tsx");
const workspace = file("../components/LessonWorkspace.tsx");
const classroom = file("../components/ClassroomMode.tsx");
const layouts = file("../components/canva/CanvaLayouts.tsx");
const css = file("../app/globals.css");
const config: ProviderConfig = { provider: "local", openAiModel: "unused", timeoutMs: 1_000, maxSourceChars: 12_000, cache: "none" };

const acceptanceRequest: LessonRequest = {
  ...defaultLessonRequest,
  source: "Create a B1 Spanish class about SER and ESTAR for an English-speaking student. Focus on speaking and common mistakes.",
  language: "es",
  supportLanguage: "en",
  level: "B1",
  duration: 60,
};

test("the visible builder is one input with four essentials and collapsed More options", () => {
  assert.match(builder, /What do you want to teach\?/);
  assert.match(builder, /Describe the class, paste material, or add a YouTube link\.\.\./);
  assert.match(builder, /Target language/);
  assert.match(builder, /Student level/);
  assert.match(builder, /Duration/);
  assert.match(builder, /Create class/);
  assert.match(builder, /<details className="text-class-more"/);
  assert.doesNotMatch(builder, /mode-tabs|Idea or material|YouTube video|Text or transcript|Copy prompt for ChatGPT/i);
  assert.equal(emptyLessonRequest.source, "");
  assert.match(app, /detectLessonInput/);
});

test("language selectors are native and Spanish and English come first", () => {
  assert.deepEqual(languageOptions.slice(0, 2), [{ id: "es", label: "Spanish" }, { id: "en", label: "English" }]);
  assert.match(builder, /<select id=\{id\}/);
  assert.match(builder, /id="target-language"/);
  assert.match(builder, /id="support-language"/);
  assert.doesNotMatch(builder, /datalist|role="combobox"/);
  assert.ok(builder.indexOf("Support language") > builder.indexOf('<details className="text-class-more"'));
});

test("input detection separates ideas, material, notes, transcripts and YouTube", () => {
  assert.equal(detectLessonInput("A B1 lesson about weekend plans").kind, "idea");
  assert.equal(detectLessonInput("https://www.youtube.com/watch?v=caption0001").kind, "youtube");
  assert.equal(detectLessonInput("- Goal: speaking\n- Vocabulary: travel\n- Activity: role play").kind, "lesson-notes");
  assert.equal(detectLessonInput("Teacher: Welcome.\nStudent: Thank you.\nTeacher: What did you notice?").kind, "transcript");
  assert.equal(detectLessonInput("Long source paragraph. ".repeat(35)).kind, "source-material");
  const prepared = applyDetectedInput(defaultLessonRequest, detectLessonInput("Long source paragraph. ".repeat(35)));
  assert.equal(prepared.sourceMode, "text");
  assert.equal(prepared.lessonFocus, "source-comprehension");
});

test("creative brief normalizes SER/ESTAR and selects a complete visual storyboard", () => {
  const intent = interpretLessonRequest(acceptanceRequest);
  const brief = createCreativeLessonBrief(acceptanceRequest, intent);
  assert.equal(brief.normalizedTitle, "SER y ESTAR");
  assert.equal(brief.topic, "Spanish grammar contrast");
  assert.equal(brief.level, "B1");
  assert.equal(brief.duration, 60);
  assert.equal(brief.visualSystem, "bright-classroom");
  assert.match(brief.visualMotif, /identity cards/i);
  assert.equal(brief.screenSequence.length, 14);
  assert.ok(brief.interactions.length >= 6);
  assert.match(brief.sourceGrounding, /No external factual claims/i);
});

test("all fifteen Canva IA 2 layouts are native components", () => {
  assert.deepEqual(canvaLayoutNames, ["HeroCover", "VisualMenuGrid", "SplitImageQuestions", "HowItWorksCards", "MapHub", "VocabularyExpressionBank", "RolePlayScenario", "PhotoChoice", "OpinionSwitch", "RapidFire", "FinalManifesto", "DynamicPanel", "GrammarContrast", "SentenceBuilder", "FeedbackScreen"]);
  for (const name of canvaLayoutNames) assert.match(layouts, new RegExp(`export function ${name}`));
  assert.doesNotMatch(layouts, /canva-sdk|tailwindcdn|<svg|from ["']@canva/i);
});

test("the exact B1 SER/ESTAR acceptance class is a validated 14-screen presentation", async () => {
  const lesson = await generateLesson(acceptanceRequest, deterministicProvider, { config, cache: disabledGenerationCache, logger() {} });
  assert.equal(lesson.title, "SER y ESTAR");
  assert.equal(lesson.duration, 60);
  assert.equal(lesson.screens.length, 14);
  assert.deepEqual(lesson.screens.map((screen) => screen.title), [
    "SER y ESTAR", "El recorrido", "Dos verbos, dos funciones", "Frases que abren la conversación", "¿Qué verbo ves?", "Clasificá por significado", "Una diferencia que cambia todo", "Construí la idea", "Cambiá el verbo, cambiá el mensaje", "Una conversación real", "Tu mundo en ocho frases", "Ronda rápida", "Tu desafío final", "Lo que ya podés hacer",
  ]);
  assert.deepEqual(lesson.screens.map((screen) => screen.layout), [
    "hero-cover", "how-it-works-cards", "grammar-contrast", "vocabulary-expression-bank", "photo-choice", "visual-menu-grid", "dynamic-panel", "canva-sentence-builder", "opinion-switch", "role-play-scenario", "split-image-questions", "rapid-fire", "final-manifesto", "feedback-screen",
  ]);
  assert.ok(new Set(lesson.screens.map((screen) => screen.layout)).size >= 4);
  assert.ok(countInteractiveScreens(lesson.screens) >= 4);
  assert.ok(countInteractiveScreens(lesson.screens) / lesson.screens.length >= .4);
  assert.equal(hasRepeatedLayoutRun(lesson.screens.map((screen) => screen.layout)), false);
  assert.ok(lesson.screens.some((screen) => screen.type === "error-correction"));
  assert.ok(lesson.screens.some((screen) => screen.layout === "role-play-scenario"));
  assert.ok(lesson.screens.some((screen) => screen.layout === "split-image-questions"));
  assert.equal(validateLessonDraft(lesson, { ...acceptanceRequest, lessonFocus: "grammar-focused", lessonFormat: "grammar-workshop" }).ok, true);
  assert.doesNotMatch(lesson.title, /Create a B1/i);
});

test("generated classes open directly into one edit field and the required actions", () => {
  assert.match(app, /if \(lesson\) return/);
  assert.match(workspace, /Describe a change\.\.\./);
  assert.match(workspace, /Regenerate this screen/);
  assert.match(workspace, />Present</);
  assert.match(workspace, /Saved ✓|>Save</);
  assert.doesNotMatch(workspace, /Edit mode|Download Student Workbook|Unlock the Full Lesson/);
});

test("teacher answers are hidden by default and presentation has no permanent teacher panel", () => {
  assert.match(layouts, /const \[open, setOpen\] = useState\(false\)/);
  assert.match(layouts, /open && <aside/);
  assert.doesNotMatch(classroom, /teacher-tools-drawer|private-teacher-panel|teacherMode/);
});

test("the stage is true 16:9, near-full-width and responsive", () => {
  assert.match(css, /\.canva-canvas[^}]*aspect-ratio:16\/9/);
  assert.match(css, /\.canva-presenter>main \.canva-canvas\{width:min\(92vw/);
  assert.match(css, /@media \(max-width:620px\)/);
  assert.match(css, /\.canva-presenter>main \.canva-canvas\{width:96vw\}/);
  assert.match(css, /container-type:inline-size/);
  assert.match(css, /overflow:hidden/);
});

test("YouTube stays transcript-grounded and never makes a paid test call", async () => {
  const input = detectLessonInput("https://youtu.be/caption0001");
  const request = { ...applyDetectedInput(defaultLessonRequest, input), transcript: "The speaker compares two study habits and explains why short daily practice is sustainable.", language: "en" as const, level: "B2" as const, duration: 60 };
  const lesson = await generateLesson(request, deterministicProvider, { config, cache: disabledGenerationCache, logger() {} });
  assert.equal(lesson.sourceMode, "video");
  assert.ok(lesson.screens.some((screen) => screen.videoId === "caption0001"));
  assert.ok(lesson.screens.some((screen) => screen.sourceExcerpt?.startsWith("The speaker")));
  assert.equal(validateLessonDraft(lesson, request).ok, true);
});
