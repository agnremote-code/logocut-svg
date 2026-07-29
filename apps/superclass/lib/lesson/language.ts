import type { LanguageId, LanguageMode, LessonLevel, LessonRequest } from "@/types/lesson";

export const languageOptions: ReadonlyArray<{ id: LanguageId; label: string }> = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "pt", label: "Portuguese" },
  { id: "de", label: "German" },
  { id: "it", label: "Italian" },
  { id: "ja", label: "Japanese" },
  { id: "ko", label: "Korean" },
  { id: "zh", label: "Mandarin Chinese" },
  { id: "ar", label: "Arabic" },
  { id: "ru", label: "Russian" },
  { id: "nl", label: "Dutch" },
  { id: "other", label: "Other" },
];

const aliases: Record<string, LanguageId> = {
  english: "en", en: "en", inglés: "en", ingles: "en",
  spanish: "es", es: "es", español: "es", espanol: "es",
  french: "fr", fr: "fr", portuguese: "pt", pt: "pt", german: "de", de: "de",
  italian: "it", it: "it", japanese: "ja", ja: "ja", korean: "ko", ko: "ko",
  chinese: "zh", "mandarin chinese": "zh", mandarin: "zh", zh: "zh", arabic: "ar", ar: "ar",
  russian: "ru", ru: "ru", dutch: "nl", nl: "nl", other: "other",
};

export function normalizeLanguageId(value: unknown): LanguageId | null {
  if (typeof value !== "string") return null;
  return aliases[value.trim().toLocaleLowerCase()] ?? null;
}

export function languageLabel(id: LanguageId, custom = "") {
  if (id === "other") return custom.trim() || "Other language";
  return languageOptions.find((option) => option.id === id)?.label ?? "Other language";
}

export function smartLanguageMode(level: LessonLevel): LanguageMode {
  if (level === "A0" || level === "A1") return "bilingual";
  if (level === "A2" || level === "B1") return "bilingual";
  return "target-only";
}

export function effectiveLanguageMode(request: LessonRequest): LanguageMode {
  return request.languageMode === "smart" ? smartLanguageMode(request.level) : request.languageMode;
}

export function targetLanguageRatio(level: LessonLevel, mode: LanguageMode) {
  if (mode === "target-only") return 0.98;
  if (mode === "support-heavy") return level === "A0" ? 0.5 : 0.6;
  const ratios: Record<LessonLevel, number> = { A0: 0.55, A1: 0.65, A2: 0.75, B1: 0.85, B2: 0.93, C1: 0.97, C2: 0.99 };
  return ratios[level];
}

export function languageContract(request: LessonRequest) {
  const mode = effectiveLanguageMode(request);
  return {
    targetId: request.language,
    targetLabel: languageLabel(request.language, request.customLanguage),
    supportId: request.supportLanguage,
    supportLabel: languageLabel(request.supportLanguage, request.customSupportLanguage),
    mode,
    targetRatio: targetLanguageRatio(request.level, mode),
    teacherNotesLanguage: request.supportLanguage,
  };
}
