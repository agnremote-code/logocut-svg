import type { LessonDraft } from "@/types/lesson";

export interface GenerationCache {
  get(contentHash: string): Promise<LessonDraft | null>;
  set(contentHash: string, lesson: LessonDraft): Promise<void>;
}

export class MemoryGenerationCache implements GenerationCache {
  private readonly values: Map<string, LessonDraft>;

  constructor(values = new Map<string, LessonDraft>()) {
    this.values = values;
  }

  async get(contentHash: string) {
    return this.values.get(contentHash) ?? null;
  }

  async set(contentHash: string, lesson: LessonDraft) {
    this.values.set(contentHash, lesson);
  }

  clear() {
    this.values.clear();
  }
}

const cacheKey = Symbol.for("superclass.generationCache");
const cacheGlobal = globalThis as typeof globalThis & { [cacheKey]?: Map<string, LessonDraft> };
export const memoryGenerationCache = new MemoryGenerationCache((cacheGlobal[cacheKey] ??= new Map()));

export const disabledGenerationCache: GenerationCache = {
  async get() {
    return null;
  },
  async set() {},
};
