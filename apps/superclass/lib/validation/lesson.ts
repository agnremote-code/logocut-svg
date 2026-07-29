import {
  lessonDurations,
  lessonFocuses,
  lessonLevels,
  skills,
  sourceModes,
  visualStyles,
  type LessonDraft,
  type LessonRequest,
} from "@/types/lesson";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const isString = (value: unknown): value is string => typeof value === "string";
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const includes = <T extends readonly unknown[]>(items: T, value: unknown): value is T[number] => items.includes(value);

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
    if (transcript.length < 12) errors.push("Paste a transcript or notes for this video so the lesson stays source-grounded.");
  }
  if (!isString(value.language) || value.language.trim().length < 2) errors.push("Choose the language being taught.");
  if (!includes(lessonLevels, value.level)) errors.push("Choose a valid CEFR level.");
  if (!includes(lessonDurations, value.duration)) errors.push("Choose a valid lesson duration.");
  if (value.studentType !== "individual" && value.studentType !== "group") errors.push("Choose an individual or group class.");
  if (!includes(lessonFocuses, value.lessonFocus)) errors.push("Choose a valid lesson focus.");
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
      source,
      videoUrl,
      transcript,
      language: String(value.language).trim(),
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
      practiceDensity: value.practiceDensity as LessonRequest["practiceDensity"],
      visualStyle: value.visualStyle as LessonRequest["visualStyle"],
      includeHomework: value.includeHomework as boolean,
      includeRoleplay: value.includeRoleplay as boolean,
    },
  };
}

const limits: Record<string, { title: number; body: number; questions: number }> = {
  cover: { title: 90, body: 180, questions: 0 },
  vocabulary: { title: 60, body: 220, questions: 0 },
  default: { title: 68, body: 360, questions: 4 },
};

export function validateLessonDraft(lesson: LessonDraft): ValidationResult<LessonDraft> {
  const errors: string[] = [];
  const ids = new Set<string>();
  const questions = new Set<string>();
  const screenRange = lesson.duration === 30 ? [8, 12] : lesson.duration === 45 ? [12, 17] : lesson.duration === 60 ? [16, 24] : [24, 36];
  if (lesson.screens.length < screenRange[0] || lesson.screens.length > screenRange[1]) errors.push("Screen count does not match lesson duration.");
  for (const screen of lesson.screens) {
    const rule = limits[screen.type] ?? limits.default;
    if (!screen.title.trim() || screen.title.length > rule.title) errors.push(`Invalid title on ${screen.id}.`);
    if ((screen.body?.length ?? 0) > rule.body) errors.push(`Body is too long on ${screen.id}.`);
    if (screen.prompts.length > rule.questions) errors.push(`Too many prompts on ${screen.id}.`);
    if (ids.has(screen.id)) errors.push(`Duplicate screen ${screen.id}.`);
    ids.add(screen.id);
    for (const prompt of screen.prompts) {
      const normalized = prompt.toLowerCase().replace(/\W/g, "");
      if (questions.has(normalized)) errors.push(`Duplicate question on ${screen.id}.`);
      questions.add(normalized);
    }
  }
  if (!lesson.levelSignals.length) errors.push("Lesson has no level-specific validation signals.");
  return errors.length ? { ok: false, errors } : { ok: true, value: lesson };
}
