import type { LessonDraft } from "@/types/lesson";

export function toStudentLesson(lesson: LessonDraft): LessonDraft {
  return {
    ...lesson,
    screens: lesson.screens
      .filter((screen) => screen.type !== "answer-key")
      .map((screen) => ({ ...screen, answers: [], teacherNotes: [] })),
  };
}
