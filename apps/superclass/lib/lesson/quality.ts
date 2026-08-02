import { createLessonPlan } from "@/lib/lesson/planning";
import type { LessonDraft, LessonRequest } from "@/types/lesson";

const studentText = (lesson: LessonDraft) => lesson.screens
  .filter((screen) => screen.type !== "answer-key")
  .map((screen) => [screen.title, screen.instruction, screen.body, ...screen.prompts, ...screen.vocabulary.flatMap((item) => [item.term, item.meaning, item.example])].filter(Boolean).join(" "))
  .join(" ");

export function topicCoverageScore(lesson: LessonDraft, request: LessonRequest) {
  const plan = createLessonPlan(request);
  const relevant = lesson.screens.filter((screen) => !["cover", "objective", "answer-key", "homework"].includes(screen.type));
  if (!relevant.length) return 0;
  const keywordPattern = new RegExp(plan.requiredKeywords.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
  const direct = relevant.filter((screen) => keywordPattern.test([screen.title, screen.instruction, screen.body, ...screen.prompts, ...screen.answers].filter(Boolean).join(" ")));
  return direct.length / relevant.length;
}

export function validateTopicAndLanguage(lesson: LessonDraft, request: LessonRequest) {
  const plan = createLessonPlan(request);
  const errors: string[] = [];
  const text = studentText(lesson);
  const lower = text.toLocaleLowerCase();
  const coverage = topicCoverageScore(lesson, request);
  const requiredCoverage = plan.topicType === "grammar" ? 0.8 : 0.55;
  if (coverage < requiredCoverage) errors.push(`Topic coverage ${Math.round(coverage * 100)}% is below the required ${Math.round(requiredCoverage * 100)}%.`);
  for (const prohibited of plan.prohibitedContent) {
    if (lower.includes(prohibited)) errors.push(`Unrelated preset content detected: ${prohibited}.`);
  }
  if (plan.specializedTemplate === "ser-estar") {
    if (!/\bser\b/i.test(lesson.title) || !/\bestar\b/i.test(lesson.title)) errors.push("Lesson title must identify Ser and Estar.");
    if (!lesson.screens.some((screen) => screen.layout === "comparison" || screen.layout === "grammar-contrast")) errors.push("Ser/estar lesson needs a two-column comparison.");
    if (!lesson.screens.some((screen) => screen.type === "error-correction")) errors.push("Ser/estar lesson needs error correction.");
    if (!lesson.screens.some((screen) => screen.type === "personal-questions")) errors.push("Ser/estar lesson needs personal speaking practice.");
  }
  if (request.language === "es") {
    const spanishSignals = (text.match(/\b(?:el|la|los|las|que|una|un|es|está|soy|ser|estar|elige|completa|corrige|habla|dónde|cómo|porque)\b/gi) ?? []).length;
    const englishSignals = (text.match(/\b(?:the|is|are|choose|complete|correct|speak|where|how|because|lesson|student)\b/gi) ?? []).length;
    if (spanishSignals < 12 || englishSignals > spanishSignals * 1.25) errors.push("Student-facing lesson is predominantly in the wrong language.");
  }
  if (request.language === "en") {
    const englishSignals = (text.match(/\b(?:the|is|are|choose|complete|correct|speak|where|how|because|lesson|student)\b/gi) ?? []).length;
    if (englishSignals < 8) errors.push("Student-facing lesson is not sufficiently grounded in English.");
  }
  const layouts = new Set(lesson.screens.map((screen) => screen.layout));
  if (request.duration >= 60 && layouts.size < 6) errors.push("A 60-minute lesson requires at least six visibly distinct layouts.");
  return { ok: errors.length === 0, errors, topicCoverage: coverage };
}
