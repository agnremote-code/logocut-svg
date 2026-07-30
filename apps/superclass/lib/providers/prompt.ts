import { lessonScreenRange } from "@/lib/lesson/duration";
import { createCreativeLessonBrief, type CreativeLessonBrief } from "@/lib/lesson/creative-brief";
import { interpretLessonRequest, type InterpretedLessonIntent } from "@/lib/lesson/intent";
import { createLessonPlan } from "@/lib/lesson/planning";
import type { LessonRequest } from "@/types/lesson";

export function buildLessonPrompt(
  request: LessonRequest,
  repairErrors: string[] = [],
  intent: InterpretedLessonIntent = interpretLessonRequest(request),
  creativeBrief: CreativeLessonBrief = createCreativeLessonBrief(request, intent),
) {
  const activeSource = request.sourceMode === "video" ? request.transcript : request.source;
  const [minimumScreens, maximumScreens] = lessonScreenRange(request.duration, request.level);
  const plan = createLessonPlan(request, intent, creativeBrief);
  return [
    "Create a complete, classroom-ready language lesson as JSON matching the supplied schema.",
    "Hard requirements:",
    `- Produce ${minimumScreens}-${maximumScreens} screens for a ${request.duration}-minute lesson and make activity timing total approximately ${request.duration} minutes.`,
    `- Apply ${request.level} CEFR pedagogy and name at least three concrete level signals.`,
    "- Keep instructions concise, usable on a projected slide, and appropriate for the learner level.",
    "- Include private teacher notes and answer evidence wherever a question has a supported answer.",
    "- Never invent facts, quotations, transcript content, or claims about a real student.",
    "- For source material or video, comprehension questions and answers must use only the supplied source.",
    "- Copy short supporting excerpts exactly from the supplied source into sourceExcerpt.",
    "- Keep every title under 68 characters (cover under 90), body under 360 characters, and at most four prompts per screen.",
    "- Use unique screen IDs and avoid duplicate questions.",
    "- Return JSON only through the structured response schema.",
    `- Follow this interpreted intent exactly: ${JSON.stringify(intent)}.`,
    `- Follow this internal creative lesson brief exactly: ${JSON.stringify(creativeBrief)}.`,
    `- Follow this validated pedagogical plan exactly: ${JSON.stringify(plan)}.`,
    `- Keep student-facing content primarily in ${plan.language.targetLabel}; ${plan.language.supportLabel} is support only under ${plan.language.mode} mode.`,
    `- Target approximately ${Math.round(plan.language.targetRatio * 100)}% target-language instructional exposure.`,
    "- Never reuse unrelated content from a preset, previous lesson, or example.",
    "- Use at least six materially different layout values for lessons of 60 minutes or longer.",
    ...(repairErrors.length ? ["", "This is the single repair attempt. Correct every validation failure without changing the topic or settings:", ...repairErrors.map((error) => `- ${error}`)] : []),
    "",
    "Lesson settings:",
    JSON.stringify({
      sourceMode: request.sourceMode,
      interpretedSourceKind: intent.sourceKind,
      interpretedTitle: intent.title,
      source: activeSource,
      videoUrl: request.videoUrl,
      targetLanguage: plan.language.targetLabel,
      targetLanguageId: request.language,
      supportLanguage: plan.language.supportLabel,
      supportLanguageId: request.supportLanguage,
      languageMode: plan.language.mode,
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
      lessonFormat: request.lessonFormat,
      customClassInstructions: request.customClassInstructions,
      practiceDensity: request.practiceDensity,
      visualStyle: request.visualStyle,
      includeHomework: request.includeHomework,
      includeRoleplay: request.includeRoleplay,
      includeSmallTalk: request.includeSmallTalk,
      includeCorrection: request.includeCorrection,
      includePronunciation: request.includePronunciation,
      lastClassCovered: request.lastClassCovered,
      continueOrCorrect: request.continueOrCorrect,
      avoidRecentTopics: request.recentTopics,
      avoidRecentVocabulary: request.recentVocabulary,
    }),
  ].join("\n");
}
