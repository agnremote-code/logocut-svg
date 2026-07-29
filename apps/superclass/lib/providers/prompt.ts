import type { LessonRequest } from "@/types/lesson";

const screenRanges = {
  30: "8–12",
  45: "12–17",
  60: "16–24",
  90: "24–36",
} as const;

export function buildLessonPrompt(request: LessonRequest) {
  const activeSource = request.sourceMode === "video" ? request.transcript : request.source;
  return [
    "Create a complete, classroom-ready language lesson as JSON matching the supplied schema.",
    "Hard requirements:",
    `- Produce ${screenRanges[request.duration]} screens for a ${request.duration}-minute lesson.`,
    `- Apply ${request.level} CEFR pedagogy and name at least three concrete level signals.`,
    "- Keep instructions concise, usable on a projected slide, and appropriate for the learner level.",
    "- Include private teacher notes and answer evidence wherever a question has a supported answer.",
    "- Never invent facts, quotations, transcript content, or claims about a real student.",
    "- For text or video mode, comprehension questions and answers must use only the supplied source.",
    "- Copy short supporting excerpts exactly from the supplied source into sourceExcerpt.",
    "- Keep every title under 68 characters (cover under 90), body under 360 characters, and at most four prompts per screen.",
    "- Use unique screen IDs and avoid duplicate questions.",
    "- Return JSON only through the structured response schema.",
    "",
    "Lesson settings:",
    JSON.stringify({
      sourceMode: request.sourceMode,
      source: activeSource,
      videoUrl: request.videoUrl,
      language: request.language,
      dialect: request.dialect === "custom" ? request.customDialect : request.dialect,
      level: request.level,
      duration: request.duration,
      studentType: request.studentType,
      age: request.age,
      interests: request.interests,
      learningGoal: request.learningGoal,
      strengths: request.strengths,
      difficulties: request.difficulties,
      skillsFocus: request.skillsFocus,
      lessonFocus: request.lessonFocus,
      practiceDensity: request.practiceDensity,
      visualStyle: request.visualStyle,
      includeHomework: request.includeHomework,
      includeRoleplay: request.includeRoleplay,
    }),
  ].join("\n");
}
