import type { LessonDraft } from "@/types/lesson";

export const STORAGE_SCHEMA_VERSION = 1;
export const RECENT_DRAFTS_KEY = "superclass:recent-drafts:v1";
export const LATEST_DRAFT_KEY = "superclass:latest-draft:v1";

export type StoredDraftEnvelope = {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  lesson: LessonDraft;
};

export function serializeDraft(lesson: LessonDraft): string {
  return JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION, lesson } satisfies StoredDraftEnvelope);
}

export function deserializeDraft(value: string): LessonDraft | null {
  try {
    const parsed = JSON.parse(value) as Partial<StoredDraftEnvelope>;
    if (parsed.schemaVersion !== STORAGE_SCHEMA_VERSION || parsed.lesson?.schemaVersion !== 1 || !Array.isArray(parsed.lesson.screens)) {
      return null;
    }
    return parsed.lesson;
  } catch {
    return null;
  }
}

export interface DraftStore {
  saveLatest(lesson: LessonDraft): void;
  loadLatest(): LessonDraft | null;
  list(): LessonDraft[];
  save(lesson: LessonDraft): void;
  duplicate(id: string): LessonDraft | null;
  remove(id: string): void;
}

export function createBrowserDraftStore(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">): DraftStore {
  const readRecent = () => {
    try {
      const values = JSON.parse(storage.getItem(RECENT_DRAFTS_KEY) ?? "[]") as string[];
      return values.map(deserializeDraft).filter((item): item is LessonDraft => Boolean(item));
    } catch {
      return [];
    }
  };
  const writeRecent = (lessons: LessonDraft[]) => storage.setItem(RECENT_DRAFTS_KEY, JSON.stringify(lessons.slice(0, 6).map(serializeDraft)));

  return {
    saveLatest(lesson) {
      storage.setItem(LATEST_DRAFT_KEY, serializeDraft(lesson));
    },
    loadLatest() {
      const value = storage.getItem(LATEST_DRAFT_KEY);
      return value ? deserializeDraft(value) : null;
    },
    list: readRecent,
    save(lesson) {
      writeRecent([lesson, ...readRecent().filter((item) => item.id !== lesson.id)]);
      this.saveLatest(lesson);
    },
    duplicate(id) {
      const source = readRecent().find((item) => item.id === id);
      if (!source) return null;
      const duplicate = { ...source, id: `${source.id}-copy-${Date.now()}`, title: `${source.title} — copy` };
      writeRecent([duplicate, ...readRecent()]);
      this.saveLatest(duplicate);
      return duplicate;
    },
    remove(id) {
      writeRecent(readRecent().filter((item) => item.id !== id));
      const latest = this.loadLatest();
      if (latest?.id === id) storage.removeItem(LATEST_DRAFT_KEY);
    },
  };
}
