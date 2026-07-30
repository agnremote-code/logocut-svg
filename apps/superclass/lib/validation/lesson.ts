import {
  lessonFocuses,
  lessonFormats,
  languageIds,
  languageModes,
  lessonLevels,
  skills,
  sourceModes,
  visualStyles,
  type LessonDraft,
  type LessonRequest,
} from "@/types/lesson";
import { isValidLessonDuration, lessonScreenRange } from "@/lib/lesson/duration";
import { hasRepeatedLayoutRun } from "@/lib/lesson/creative-brief";
import { interpretLessonRequest } from "@/lib/lesson/intent";
import { createLessonPlan } from "@/lib/lesson/planning";
import { normalizeLanguageId } from "@/lib/lesson/language";
import { validateTopicAndLanguage } from "@/lib/lesson/quality";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const isString = (value: unknown): value is string => typeof value === "string";
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const includes = <T extends readonly unknown[]>(items: T, value: unknown): value is T[number] => items.includes(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);

export function extractYouTubeId(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0]?.slice(0, 11) ?? null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v")?.slice(0, 11) ?? null;
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0] ?? "")) return parts[1]?.slice(0, 11) ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export function validateVideoUrl(value: string): ValidationResult<{ url: string; youtubeId: string | null }> {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return { ok: false, errors: ["Use a valid http or https video URL."] };
    return { ok: true, value: { url: url.toString(), youtubeId: extractYouTubeId(value) } };
  } catch {
    return { ok: false, errors: ["Enter a valid video URL."] };
  }
}

export function validateLessonRequest(input: unknown): ValidationResult<LessonRequest> {
  if (!input || typeof input !== "object") return { ok: false, errors: ["Malformed lesson request."] };
  const value = input as Record<string, unknown>;
  const errors: string[] = [];

  if (!includes(sourceModes, value.sourceMode)) errors.push("Choose a valid source mode.");
  const sourceMode = includes(sourceModes, value.sourceMode) ? value.sourceMode : "idea";
  const source = isString(value.source) ? value.source.trim() : "";
  const transcript = isString(value.transcript) ? value.transcript.trim() : "";
  const videoUrl = isString(value.videoUrl) ? value.videoUrl.trim() : "";
  const activeSource = sourceMode === "video" ? transcript : source;

  if (sourceMode !== "video" && activeSource.length < 12) errors.push("Add at least 12 characters of lesson material.");
  if (activeSource.length > 12_000) errors.push("Keep source material under 12,000 characters.");
  if (sourceMode === "video") {
    const video = validateVideoUrl(videoUrl);
    if (!video.ok) errors.push(...video.errors);
    if (transcript.length < 12) errors.push("Import captions or upload the video/audio before building this source-grounded lesson.");
  }
  const targetLanguage = normalizeLanguageId(value.language);
  const supportLanguage = normalizeLanguageId(value.supportLanguage ?? "en");
  if (!targetLanguage || !includes(languageIds, targetLanguage)) errors.push("Choose a valid target language.");
  if (!supportLanguage || !includes(languageIds, supportLanguage)) errors.push("Choose a valid support language.");
  if (!includes(languageModes, value.languageMode ?? "smart")) errors.push("Choose a valid lesson language mode.");
  if (!includes(lessonLevels, value.level)) errors.push("Choose a valid CEFR level.");
  if (!isValidLessonDuration(value.duration)) errors.push("Choose a lesson duration between 20 and 120 minutes.");
  if (value.studentType !== "individual" && value.studentType !== "group") errors.push("Choose an individual or group class.");
  if (!includes(lessonFocuses, value.lessonFocus)) errors.push("Choose a valid lesson focus.");
  if (!includes(lessonFormats, value.lessonFormat ?? "automatic")) errors.push("Choose a valid lesson format.");
  if (!includes(visualStyles, value.visualStyle)) errors.push("Choose a valid visual style.");
  if (!["neutral", "rioplatense", "spain", "mexican", "custom"].includes(String(value.dialect))) errors.push("Choose a valid dialect.");
  if (!["compact", "standard", "repetition-heavy"].includes(String(value.practiceDensity))) errors.push("Choose a valid practice density.");
  if (!Array.isArray(value.skillsFocus) || value.skillsFocus.length === 0 || value.skillsFocus.some((item) => !includes(skills, item))) {
    errors.push("Choose at least one valid skill focus.");
  }
  if (!isBoolean(value.includeHomework) || !isBoolean(value.includeRoleplay)) errors.push("Invalid lesson options.");
  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      sourceMode,
      profileId: isString(value.profileId) ? value.profileId : "",
      source,
      videoUrl,
      transcript,
      language: targetLanguage as LessonRequest["language"],
      customLanguage: isString(value.customLanguage) ? value.customLanguage.trim().slice(0, 80) : "",
      supportLanguage: supportLanguage as LessonRequest["supportLanguage"],
      customSupportLanguage: isString(value.customSupportLanguage) ? value.customSupportLanguage.trim().slice(0, 80) : "",
      languageMode: (value.languageMode ?? "smart") as LessonRequest["languageMode"],
      dialect: value.dialect as LessonRequest["dialect"],
      customDialect: isString(value.customDialect) ? value.customDialect.trim() : "",
      level: value.level as LessonRequest["level"],
      duration: value.duration as LessonRequest["duration"],
      studentType: value.studentType as LessonRequest["studentType"],
      age: isString(value.age) ? value.age.trim().slice(0, 80) : "",
      interests: isString(value.interests) ? value.interests.trim().slice(0, 300) : "",
      learningGoal: isString(value.learningGoal) ? value.learningGoal.trim().slice(0, 300) : "",
      strengths: isString(value.strengths) ? value.strengths.trim().slice(0, 300) : "",
      difficulties: isString(value.difficulties) ? value.difficulties.trim().slice(0, 300) : "",
      skillsFocus: value.skillsFocus as LessonRequest["skillsFocus"],
      lessonFocus: value.lessonFocus as LessonRequest["lessonFocus"],
      lessonFormat: (value.lessonFormat ?? "automatic") as LessonRequest["lessonFormat"],
      customClassInstructions: isString(value.customClassInstructions) ? value.customClassInstructions.trim().slice(0, 2_000) : "",
      practiceDensity: value.practiceDensity as LessonRequest["practiceDensity"],
      visualStyle: value.visualStyle as LessonRequest["visualStyle"],
      includeHomework: value.includeHomework as boolean,
      includeRoleplay: value.includeRoleplay as boolean,
      includeSmallTalk: isBoolean(value.includeSmallTalk) ? value.includeSmallTalk : true,
      includeCorrection: isBoolean(value.includeCorrection) ? value.includeCorrection : true,
      includePronunciation: isBoolean(value.includePronunciation) ? value.includePronunciation : false,
      lastClassCovered: isString(value.lastClassCovered) ? value.lastClassCovered.trim().slice(0, 500) : "",
      continueOrCorrect: isString(value.continueOrCorrect) ? value.continueOrCorrect.trim().slice(0, 500) : "",
      recentTopics: isStringArray(value.recentTopics) ? value.recentTopics.slice(0, 20).map((item) => item.slice(0, 120)) : [],
      recentVocabulary: isStringArray(value.recentVocabulary) ? value.recentVocabulary.slice(0, 80).map((item) => item.slice(0, 80)) : [],
    },
  };
}

const limits: Record<string, { title: number; body: number; questions: number }> = {
  cover: { title: 90, body: 180, questions: 0 },
  vocabulary: { title: 60, body: 220, questions: 0 },
  default: { title: 68, body: 360, questions: 4 },
};

export function validateLessonDraft(input: unknown, request?: LessonRequest): ValidationResult<LessonDraft> {
  if (!input || typeof input !== "object") return { ok: false, errors: ["Generated lesson is not an object."] };
  const lesson = input as Record<string, unknown>;
  const errors: string[] = [];
  const ids = new Set<string>();
  const questions = new Set<string>();
  if (lesson.schemaVersion !== 1) errors.push("Unsupported lesson schema version.");
  if (!isString(lesson.id) || !lesson.id.trim()) errors.push("Lesson ID is missing.");
  if (!isString(lesson.requestId) || !lesson.requestId.trim()) errors.push("Request ID is missing.");
  if (!isString(lesson.contentHash) || !lesson.contentHash.trim()) errors.push("Content hash is missing.");
  if (!isString(lesson.title) || !lesson.title.trim()) errors.push("Lesson title is missing.");
  if (!isString(lesson.language) || !lesson.language.trim()) errors.push("Lesson language is missing.");
  if (!isString(lesson.dialect)) errors.push("Lesson dialect is invalid.");
  if (!includes(lessonLevels, lesson.level)) errors.push("Lesson level is invalid.");
  if (!isValidLessonDuration(lesson.duration)) errors.push("Lesson duration is invalid.");
  if (!includes(visualStyles, lesson.visualStyle)) errors.push("Lesson visual style is invalid.");
  if (!isString(lesson.studentProfile)) errors.push("Student profile is invalid.");
  if (!isStringArray(lesson.objectives) || lesson.objectives.length === 0) errors.push("Lesson objectives are missing.");
  if (!includes(sourceModes, lesson.sourceMode)) errors.push("Lesson source mode is invalid.");
  if (!isString(lesson.createdAt) || Number.isNaN(Date.parse(lesson.createdAt))) errors.push("Lesson creation date is invalid.");
  if (!isString(lesson.suggestedNextLesson)) errors.push("Suggested next lesson is invalid.");
  if (!isStringArray(lesson.levelSignals) || lesson.levelSignals.length === 0) errors.push("Lesson has no level-specific validation signals.");
  if (!Array.isArray(lesson.screens)) errors.push("Lesson screens are missing.");

  if (errors.length) return { ok: false, errors };

  const typed = lesson as unknown as LessonDraft;
  const screenRange = lessonScreenRange(typed.duration, typed.level);
  if (typed.screens.length < screenRange[0] || typed.screens.length > screenRange[1]) errors.push("Screen count does not match lesson duration.");
  for (const [index, rawScreen] of typed.screens.entries()) {
    if (!rawScreen || typeof rawScreen !== "object") {
      errors.push(`Screen ${index + 1} is invalid.`);
      continue;
    }
    const screen = rawScreen as LessonDraft["screens"][number];
    if (!isString(screen.id) || !screen.id.trim()) {
      errors.push(`Screen ${index + 1} has no ID.`);
      continue;
    }
    const baseRule = limits[screen.type] ?? limits.default;
    const rule = ["topic-menu", "verb-bank", "connector-bank"].includes(screen.layout)
      ? { ...baseRule, questions: 4 }
      : baseRule;
    if (!isString(screen.title) || !screen.title.trim() || screen.title.length > rule.title) errors.push(`Invalid title on ${screen.id}.`);
    if (!isString(screen.instruction) || !screen.instruction.trim()) errors.push(`Instruction is missing on ${screen.id}.`);
    if (screen.body !== undefined && !isString(screen.body)) errors.push(`Body is invalid on ${screen.id}.`);
    if ((screen.body?.length ?? 0) > rule.body) errors.push(`Body is too long on ${screen.id}.`);
    if (!isStringArray(screen.prompts)) errors.push(`Prompts are invalid on ${screen.id}.`);
    if (!Array.isArray(screen.vocabulary) || screen.vocabulary.some((item) => !item || !isString(item.term) || !isString(item.meaning) || !isString(item.example))) {
      errors.push(`Vocabulary is invalid on ${screen.id}.`);
    }
    if (!isStringArray(screen.answers)) errors.push(`Answers are invalid on ${screen.id}.`);
    if (!isStringArray(screen.teacherNotes)) errors.push(`Teacher notes are invalid on ${screen.id}.`);
    if (!Number.isInteger(screen.timing) || screen.timing < 0) errors.push(`Timing is invalid on ${screen.id}.`);
    if (!isString(screen.layout)) errors.push(`Layout is invalid on ${screen.id}.`);
    if (screen.sourceExcerpt !== undefined && !isString(screen.sourceExcerpt)) errors.push(`Source excerpt is invalid on ${screen.id}.`);
    if (screen.videoId !== undefined && !isString(screen.videoId)) errors.push(`Video ID is invalid on ${screen.id}.`);
    if (Array.isArray(screen.prompts) && screen.prompts.length > rule.questions) errors.push(`Too many prompts on ${screen.id}.`);
    if (ids.has(screen.id)) errors.push(`Duplicate screen ${screen.id}.`);
    ids.add(screen.id);
    for (const prompt of Array.isArray(screen.prompts) ? screen.prompts : []) {
      if (!isString(prompt)) continue;
      const normalized = prompt.toLowerCase().replace(/\W/g, "");
      if (questions.has(normalized)) errors.push(`Duplicate question on ${screen.id}.`);
      questions.add(normalized);
    }
  }

  if (hasRepeatedLayoutRun(typed.screens.map((screen) => screen.layout))) {
    errors.push("A layout is repeated more than twice consecutively.");
  }
  const purposes = typed.screens
    .filter((screen) => screen.type !== "answer-key")
    .map((screen) => `${screen.type}:${screen.title.toLocaleLowerCase().replace(/\W/g, "")}`);
  if (new Set(purposes).size !== purposes.length) errors.push("Every student screen needs a unique pedagogical purpose.");

  if (request) {
    if (typed.level !== request.level || typed.duration !== request.duration || typed.sourceMode !== request.sourceMode) {
      errors.push("Generated lesson does not match the requested level, duration, or source mode.");
    }
    const intent = interpretLessonRequest(request);
    const plan = createLessonPlan(request, intent);
    const sourceGrounded = intent.sourceKind === "video" || intent.sourceKind === "source-material";
    if (sourceGrounded) {
      const source = request.sourceMode === "video" ? request.transcript : request.source;
      const normalize = (value: string) => value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
      const normalizedSource = normalize(source);
      const groundedScreens = typed.screens.filter((screen) => {
        const excerpt = screen.sourceExcerpt?.trim();
        return excerpt && excerpt.length >= 8 && normalizedSource.includes(normalize(excerpt));
      });
      if (groundedScreens.length === 0) errors.push("Source-based lesson has no exact supporting excerpt.");
      const comprehension = typed.screens.filter((screen) => screen.type === "comprehension");
      if (!comprehension.length || comprehension.some((screen) => screen.answers.length === 0)) {
        errors.push("Source comprehension screens require answer evidence.");
      }
    }
    const rawCommand = request.source.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    if (rawCommand && typed.title.trim().toLocaleLowerCase() === rawCommand) errors.push("Raw user command cannot be used as the lesson title.");
    if (plan.specializedTemplate === "ser-estar" && request.level === "A1") {
      const studentScreens = typed.screens.filter((screen) => screen.type !== "answer-key");
      if (studentScreens.length < 10 || studentScreens.length > 13) errors.push("A1 ser/estar requires 10–13 student screens.");
      const opening = studentScreens[0];
      if (opening?.layout === "topic-menu" || /palabras.*verbos.*frases.*preguntas/i.test([opening?.title, opening?.body, ...(opening?.prompts ?? [])].filter(Boolean).join(" "))) {
        errors.push("A1 ser/estar cannot open with a generic module menu.");
      }
    }
    const quality = validateTopicAndLanguage(typed, request);
    errors.push(...quality.errors);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: typed };
}
