import type { LessonLevel } from "@/types/lesson";

export function isValidLessonDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 20 && value <= 120;
}

export function targetScreenCount(duration: number, level?: LessonLevel) {
  if (level === "A0" || level === "A1") {
    if (duration <= 30) return 7;
    if (duration <= 45) return 10;
    if (duration <= 60) return 12;
    return Math.max(13, Math.min(22, Math.round(duration * 0.18)));
  }
  return Math.max(7, Math.min(36, Math.round(duration * 0.29)));
}

export function lessonScreenRange(duration: number, level?: LessonLevel): [number, number] {
  const target = targetScreenCount(duration, level);
  return [Math.max(6, target - 2), Math.min(38, target + 3)];
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
