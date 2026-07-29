import type { LessonDuration, LessonLevel, SourceMode, VisualStyle } from "@/types/lesson";

export type AnalyticsEvent =
  | "homepage_view"
  | "demo_selected"
  | "lesson_form_started"
  | "advanced_options_opened"
  | "lesson_generation_started"
  | "lesson_generation_completed"
  | "lesson_generation_failed"
  | "lesson_preview_viewed"
  | "classroom_mode_started"
  | "screen_edited"
  | "print_started"
  | "unlock_cta_clicked";

export type SafeAnalyticsMetadata = Partial<{
  level: LessonLevel;
  duration: LessonDuration;
  sourceMode: SourceMode;
  visualStyle: VisualStyle;
  studentType: "individual" | "group";
  screenCount: number;
  reason: "validation" | "timeout" | "provider" | "unknown";
}>;

export type AnalyticsProvider = {
  track(event: AnalyticsEvent, metadata: SafeAnalyticsMetadata): void;
};

const disabledProvider: AnalyticsProvider = {
  track() {
    // External tracking is intentionally disabled for this isolated demo.
  },
};

let provider = disabledProvider;

export function setAnalyticsProvider(nextProvider: AnalyticsProvider) {
  provider = nextProvider;
}

export function track(event: AnalyticsEvent, metadata: SafeAnalyticsMetadata = {}) {
  provider.track(event, metadata);
}

export function sanitizeAnalyticsMetadata(input: Record<string, unknown>): SafeAnalyticsMetadata {
  const safeKeys = new Set(["level", "duration", "sourceMode", "visualStyle", "studentType", "screenCount", "reason"]);
  return Object.fromEntries(Object.entries(input).filter(([key]) => safeKeys.has(key))) as SafeAnalyticsMetadata;
}
