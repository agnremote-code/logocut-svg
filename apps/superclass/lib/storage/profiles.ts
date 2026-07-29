import type { LessonDraft, StudentProfile } from "@/types/lesson";
import { LATEST_DRAFT_KEY, RECENT_DRAFTS_KEY } from "@/lib/storage/drafts";

export const PROFILE_STORE_KEY = "superclass.student-profiles.v1";

export function createEmptyProfile(): StudentProfile {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: `profile-${crypto.randomUUID()}`,
    nickname: "New student",
    targetLanguage: "Spanish",
    dialect: "neutral",
    customDialect: "",
    level: "B1",
    ageGroup: "Adult",
    interests: "",
    profession: "",
    goals: "",
    strengths: "",
    difficulties: "",
    pronunciationTargets: "",
    grammarTargets: "",
    preferredVisualStyle: "clean-classroom",
    preferredPracticeDensity: "standard",
    topicsUsed: [],
    vocabularyStudied: [],
    teacherNotes: "",
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

function parseProfiles(raw: string | null): StudentProfile[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StudentProfile =>
      Boolean(item && item.schemaVersion === 1 && typeof item.id === "string" && typeof item.nickname === "string"),
    );
  } catch {
    return [];
  }
}

export function createProfileStore(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">) {
  const list = () => parseProfiles(storage.getItem(PROFILE_STORE_KEY));
  const write = (profiles: StudentProfile[]) => storage.setItem(PROFILE_STORE_KEY, JSON.stringify(profiles));
  return {
    list,
    save(profile: StudentProfile) {
      const profiles = list();
      const updated = { ...profile, updatedAt: new Date().toISOString() };
      const index = profiles.findIndex((item) => item.id === profile.id);
      if (index >= 0) profiles[index] = updated;
      else profiles.unshift(updated);
      write(profiles);
      return updated;
    },
    duplicate(id: string) {
      const source = list().find((item) => item.id === id);
      if (!source) return null;
      const now = new Date().toISOString();
      const copy = { ...source, id: `profile-${crypto.randomUUID()}`, nickname: `${source.nickname} copy`, archived: false, createdAt: now, updatedAt: now };
      write([copy, ...list()]);
      return copy;
    },
    remove(id: string) {
      write(list().filter((item) => item.id !== id));
    },
    clear() {
      storage.removeItem(PROFILE_STORE_KEY);
    },
  };
}

export function associateLessonWithProfile(profile: StudentProfile, lesson: LessonDraft): StudentProfile {
  const vocabulary = lesson.screens.flatMap((screen) => screen.vocabulary.map((item) => item.term));
  return {
    ...profile,
    topicsUsed: Array.from(new Set([lesson.title, ...profile.topicsUsed])).slice(0, 12),
    vocabularyStudied: Array.from(new Set([...vocabulary, ...profile.vocabularyStudied])).slice(0, 40),
    updatedAt: new Date().toISOString(),
  };
}

export function recentLessonsForProfile(lessons: LessonDraft[], profileId: string) {
  return lessons.filter((lesson) => lesson.profileId === profileId);
}

export function deleteAllLocalTeachingData(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(PROFILE_STORE_KEY);
  storage.removeItem(LATEST_DRAFT_KEY);
  storage.removeItem(RECENT_DRAFTS_KEY);
}
