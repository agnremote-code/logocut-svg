import type { LessonDraft, PostClassSummary } from "@/types/lesson";

export function createPostClassSummary(lesson: LessonDraft): PostClassSummary {
  const vocabulary = Array.from(new Set(lesson.screens.flatMap((screen) => screen.vocabulary.map((item) => item.term)))).slice(0, 8);
  const corrections = lesson.screens.filter((screen) => screen.type === "error-correction").flatMap((screen) => screen.answers).slice(0, 4);
  const grammar = lesson.screens.find((screen) => screen.type === "microgrammar")?.body || "Contextual language patterns from today’s class";
  const pronunciation = lesson.screens.find((screen) => screen.type === "pronunciation")?.body || "Clear stress, rhythm and intelligibility";
  const homework = lesson.screens.find((screen) => screen.type === "homework")?.instruction || "Review today’s vocabulary and prepare a short personal response.";
  const classSummary = `Today we practised ${lesson.title.toLowerCase()} at ${lesson.level} level, with a focus on ${lesson.objectives[0]?.toLowerCase() || "clear communication"}.`;
  return {
    classSummary,
    correctedSentences: corrections,
    vocabularyStudied: vocabulary,
    grammarStudied: grammar,
    pronunciationTarget: pronunciation,
    homework,
    suggestedNextClass: lesson.suggestedNextLesson,
    studentMessage: `${classSummary}\n\nKey vocabulary: ${vocabulary.join(", ") || "See your workbook"}.\n\nHomework: ${homework}\n\nGreat work today!`,
  };
}

export function copyReadyHomework(summary: PostClassSummary) {
  return `Homework\n${summary.homework}`;
}

export function copyReadyNextClass(summary: PostClassSummary) {
  return `Next class\n${summary.suggestedNextClass}`;
}
