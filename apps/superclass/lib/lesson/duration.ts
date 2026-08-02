import type { LessonLevel } from "@/types/lesson";

export function isValidLessonDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 20 && value <= 120;
}

export function targetScreenCount(duration: number, level?: LessonLevel) {
  void level;
  if (duration <= 30) return 9;
  if (duration <= 45) return 11;
  if (duration <= 60) return 14;
  if (duration <= 90) return 18;
  return Math.max(19, Math.min(24, Math.round(duration * 0.2)));
}

export function lessonScreenRange(duration: number, level?: LessonLevel): [number, number] {
  void level;
  if (duration <= 30) return [8, 10];
  if (duration <= 45) return [10, 12];
  if (duration <= 60) return [12, 15];
  if (duration <= 90) return [16, 20];
  const target = targetScreenCount(duration);
  return [Math.max(18, target - 2), Math.min(26, target + 2)];
}

export function normalizeActivityTiming<T extends { timing: number }>(activities: T[], duration: number): T[] {
  const current = activities.reduce((sum, item) => sum + item.timing, 0) || 1;
  const scaled = activities.map((item) => ({ ...item, timing: Math.max(1, Math.round((item.timing / current) * duration)) }));
  let difference = duration - scaled.reduce((sum, item) => sum + item.timing, 0);
  let index = 0;
  while (difference !== 0 && scaled.length) {
    const direction = difference > 0 ? 1 : -1;
    const target = scaled[index % scaled.length];
    if (direction > 0 || target.timing > 1) {
      target.timing += direction;
      difference -= direction;
    }
    index += 1;
  }
  return scaled;
}
