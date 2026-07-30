import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createCreativeLessonBrief, hasRepeatedLayoutRun } from "../lib/lesson/creative-brief";
import { interpretLessonRequest } from "../lib/lesson/intent";
import { languageOptions } from "../lib/lesson/language";
import { disabledGenerationCache } from "../lib/providers/cache";
import type { ProviderConfig } from "../lib/providers/config";
import { generateLesson } from "../lib/providers/generate";
import { deterministicProvider } from "../lib/providers/local";
import {
  configuredVisualAssetProvider,
  resolveVisualAsset,
  teacherUploadVisualAssetProvider,
} from "../lib/visual-assets";
import { validateLessonDraft, validateLessonRequest } from "../lib/validation/lesson";
import { defaultLessonRequest, emptyLessonRequest, sourceModes, type LessonRequest } from "../types/lesson";

const file = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const builder = file("../components/LessonBuilder.tsx");
const app = file("../components/LessonApp.tsx");
const classroom = file("../components/ClassroomMode.tsx");
const css = file("../app/globals.css");
const config: ProviderConfig = {
  provider: "local",
  openAiModel: "unused-in-local-tests",
  timeoutMs: 1_000,
  maxSourceChars: 12_000,
  cache: "none",
};

const serEstarRequest: LessonRequest = {
  ...defaultLessonRequest,
  sourceMode: "idea",
  source: "Haceme una clase sobre verbos er estar",
  language: "es",
  supportLanguage: "en",
  languageMode: "bilingual",
  level: "A1",
  duration: 60,
  lessonFocus: "balanced",
  lessonFormat: "automatic",
  customClassInstructions: "",
  includeHomework: true,
};

test("builder has exactly two unified creation modes and starts empty", () => {
  assert.deepEqual(sourceModes, ["idea", "video"]);
  assert.match(builder, /Idea or material/);
  assert.match(builder, /YouTube video/);
  assert.doesNotMatch(builder, /value:\s*"text"|>\s*Text\s*</);
  assert.equal(emptyLessonRequest.source, "");
  assert.match(app, /useState<LessonRequest>\(emptyLessonRequest\)/);
});

test("builder uses native language selects with Spanish and English first", () => {
  assert.deepEqual(languageOptions.slice(0, 2), [
    { id: "es", label: "Spanish" },
    { id: "en", label: "English" },
  ]);
  assert.match(builder, /<select id=\{id\}/);
  assert.match(builder, /id="target-language"/);
  assert.match(builder, /id="support-language"/);
  assert.doesNotMatch(builder, /datalist|role="combobox"/);
});

test("only essential controls are visible before the collapsed More control", () => {
  const moreControl = builder.indexOf('<details className="advanced-panel more-control"');
  assert.ok(moreControl > -1);
  for (const label of ["Target language", "Support language", "CEFR level", "Duration", "Generate class"]) {
    assert.ok(builder.indexOf(label) > -1);
    assert.ok(builder.indexOf(label) < moreControl || label === "Generate class");
  }
  for (const label of ["Dialect", "Class type", "Teaching focus", "Language balance", "Visual direction", "Specific instructions"]) {
    assert.ok(builder.indexOf(label) > moreControl);
  }
  assert.match(app, /useState\(false\)[\s\S]*advancedOpen/);
  assert.doesNotMatch(builder, /Copy prompt for ChatGPT|navigator\.clipboard|chatgpt|openai\.com/i);
});

test("intent interpreter separates and normalizes the raw SER/ESTAR command", () => {
  const intent = interpretLessonRequest(serEstarRequest);
  assert.equal(intent.title, "SER y ESTAR");
  assert.equal(intent.topic, "ser y estar");
  assert.equal(intent.focus, "grammar-focused");
  assert.deepEqual(intent.grammarTargets, ["ser", "estar"]);
  assert.equal(intent.requestedLevel, "A1");
  assert.equal(intent.requestedLanguage, "es");
  assert.doesNotMatch(`${intent.title} ${intent.topic}`, /Haceme|er estar/i);
});

test("creative brief defines an art-directed storyboard before planning", () => {
  const intent = interpretLessonRequest(serEstarRequest);
  const brief = createCreativeLessonBrief(serEstarRequest, intent);
  assert.match(brief.objective, /SER[\s\S]*ESTAR/i);
  assert.ok(brief.narrativeArc.length >= 6);
  assert.match(brief.visualDirection, /16:9[\s\S]*typographic hierarchy/i);
  assert.match(brief.languageBalance, /Target language[\s\S]*support language/i);
  assert.deepEqual(brief.requiredContent.slice(0, 4), ["identity", "origin", "profession", "location"]);
  assert.equal(brief.screenPurposes.length, 13);
  assert.ok(brief.imageSlots.every((slot) => slot.provider === "local"));
});

test("A1 SER/ESTAR is a validated 13-screen professional lesson", async () => {
  const lesson = await generateLesson(serEstarRequest, deterministicProvider, {
    config,
    cache: disabledGenerationCache,
    logger() {},
  });
  const studentScreens = lesson.screens.filter((screen) => screen.type !== "answer-key");
  assert.equal(lesson.title, "SER y ESTAR");
  assert.equal(studentScreens.length, 13);
  assert.deepEqual(studentScreens.map((screen) => screen.title), [
    "SER y ESTAR",
    "Meta de hoy",
    "Dos verbos, dos funciones",
    "Personas y lugares con SER",
    "Personas y lugares con ESTAR",
    "¿SER o ESTAR?",
    "Uní ejemplo y significado",
    "Completá frases cortas",
    "Corregí cuatro errores",
    "Construí frases personales",
    "Ahora hablá de vos",
    "Repaso en 30 segundos",
    "Tarea: mi mundo",
  ]);
  assert.deepEqual(studentScreens.map((screen) => screen.layout), [
    "cover",
    "objective",
    "comparison",
    "example-gallery",
    "illustrated-context",
    "multiple-choice",
    "sorting",
    "fill-gap",
    "error-correction",
    "sentence-builder",
    "guided-questions",
    "recap",
    "homework",
  ]);
  assert.equal(studentScreens.some((screen) => screen.type === "answer-key"), false);
  assert.equal(hasRepeatedLayoutRun(studentScreens.map((screen) => screen.layout)), false);
  assert.equal(new Set(studentScreens.map((screen) => `${screen.type}:${screen.title}`)).size, 13);
  assert.doesNotMatch(JSON.stringify(studentScreens[0]), /Palabras.*Verbos.*Frases.*Preguntas|Haceme|er estar/i);
  assert.equal(validateLessonDraft(lesson, { ...serEstarRequest, lessonFocus: "grammar-focused", lessonFormat: "grammar-workshop" }).ok, true);
});

test("B1 idea conversation survives the full interpretation and validation pipeline", async () => {
  const request: LessonRequest = {
    ...defaultLessonRequest,
    source: "Create a B1 conversation lesson about planning a meaningful weekend with friends, with useful phrases and a realistic dialogue.",
    language: "en",
    supportLanguage: "es",
    level: "B1",
    duration: 60,
    lessonFocus: "conversation",
  };
  const lesson = await generateLesson(request, deterministicProvider, {
    config,
    cache: disabledGenerationCache,
    logger() {},
  });
  assert.equal(lesson.title, "Planning a meaningful weekend with friends");
  assert.equal(lesson.archetype, "intermediate-conversation");
  assert.equal(hasRepeatedLayoutRun(lesson.screens.map((screen) => screen.layout)), false);
  assert.equal(validateLessonDraft(lesson, request).ok, true);
});

test("B2 YouTube captions become a source-grounded class with an interpreted title", async () => {
  const request: LessonRequest = {
    ...defaultLessonRequest,
    sourceMode: "video",
    source: "",
    videoUrl: "https://youtu.be/caption0001",
    transcript: "In this video, the speaker explains how small daily habits shape language learning. The main idea is to practise consistently, notice useful expressions, and use them in meaningful conversations.",
    language: "en",
    supportLanguage: "es",
    level: "B2",
    duration: 60,
    lessonFocus: "source-comprehension",
  };
  const lesson = await generateLesson(request, deterministicProvider, {
    config,
    cache: disabledGenerationCache,
    logger() {},
  });
  assert.equal(lesson.title, "Small daily habits shape language learning");
  assert.equal(lesson.level, "B2");
  assert.equal(lesson.archetype, "source-comprehension");
  assert.ok(lesson.screens.some((screen) => screen.videoId === "caption0001"));
  assert.ok(lesson.screens.some((screen) => screen.sourceExcerpt?.startsWith("In this video")));
  assert.equal(validateLessonDraft(lesson, request).ok, true);
});

test("screen density, blank optional instructions and source-grounded modes validate", async () => {
  assert.equal(validateLessonRequest({ ...defaultLessonRequest, customClassInstructions: "" }).ok, true);
  const lesson = await deterministicProvider.generate(serEstarRequest, {
    requestId: "density",
    contentHash: "density",
    intent: interpretLessonRequest(serEstarRequest),
  });
  assert.ok(lesson.screens.every((screen) => screen.title.length <= (screen.type === "cover" ? 90 : 68)));
  assert.ok(lesson.screens.every((screen) => (screen.body?.length ?? 0) <= 360));
  assert.ok(lesson.screens.every((screen) => screen.prompts.length <= 4));
});

test("YouTube captions remain primary and fallbacks appear only after failure", () => {
  assert.match(builder, /Paste a YouTube link\. Superclass will use available captions to build the class\./);
  assert.match(builder, /fetch\("\/api\/transcripts"/);
  assert.match(builder, /transcriptStatus === "unavailable" \|\| transcriptStatus === "error"/);
  const fallbackGate = builder.indexOf('transcriptStatus === "unavailable" || transcriptStatus === "error"');
  assert.ok(builder.indexOf("Upload audio or video") > fallbackGate);
  assert.ok(builder.indexOf("Paste transcript manually") > builder.indexOf("Upload audio or video"));
});

test("visual providers use real local SVG compositions without paid calls", () => {
  const slot = {
    purpose: "cover-atmosphere" as const,
    screen: { type: "cover" as const, layout: "cover" as const, title: "SER y ESTAR", body: "identity and location" },
  };
  const asset = resolveVisualAsset(slot);
  assert.equal(asset?.source, "local");
  assert.equal(asset?.kind, "svg-composition");
  assert.equal(asset?.composition, "ser-estar-orbit");
  assert.match(asset?.credit ?? "", /Repository-owned/);
  assert.equal(configuredVisualAssetProvider.resolve(slot), null);
  assert.equal(teacherUploadVisualAssetProvider.resolve(slot), null);
});

test("player and CSS preserve 16:9 hierarchy without a permanent teacher panel", () => {
  assert.match(css, /aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(css, /\.lesson-player[\s\S]*overflow:\s*hidden/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*\.simple-essential-grid\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*\.lesson-player \.classroom-canvas\s*\{\s*overflow-y:\s*auto/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.lesson-player \.player-actions button:nth-child\(2\)\s*\{\s*display:\s*inline-flex/);
  assert.match(classroom, /useState\(false\)[\s\S]*teacherToolsOpen/);
  assert.match(classroom, /teacherToolsOpen && <aside/);
  assert.doesNotMatch(classroom, /private-teacher-panel|panelOpen/);
  assert.match(classroom, /<VisualComposition screen=\{screen\} purpose="cover-atmosphere"/);
});
