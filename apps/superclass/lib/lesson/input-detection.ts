import type { LessonRequest, SourceMode } from "@/types/lesson";

export type TextToClassInputKind = "idea" | "source-material" | "lesson-notes" | "transcript" | "youtube";

export type DetectedLessonInput = {
  kind: TextToClassInputKind;
  sourceMode: SourceMode;
  source: string;
  videoUrl: string;
};

const youtubePattern = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?[^\s]*v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{6,}/i;

export function detectLessonInput(value: string): DetectedLessonInput {
  const input = value.trim();
  if (youtubePattern.test(input)) return { kind: "youtube", sourceMode: "video", source: "", videoUrl: input };

  const lines = input.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const transcriptSignals = lines.filter((line) => /^(?:speaker\s*\d*|teacher|student|host|guest|[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ -]{0,24}):\s+/i.test(line)).length;
  if (transcriptSignals >= 2) return { kind: "transcript", sourceMode: "text", source: input, videoUrl: "" };

  const noteSignals = lines.filter((line) => /^(?:[-*•]|\d+[.)]|objective:|goal:|vocabulary:|grammar:|activity:|homework:)/i.test(line)).length;
  if (noteSignals >= 2) return { kind: "lesson-notes", sourceMode: "text", source: input, videoUrl: "" };

  if (input.length >= 500 || lines.length >= 5) return { kind: "source-material", sourceMode: "text", source: input, videoUrl: "" };
  return { kind: "idea", sourceMode: "idea", source: input, videoUrl: "" };
}

export function applyDetectedInput(request: LessonRequest, input: DetectedLessonInput): LessonRequest {
  return {
    ...request,
    sourceMode: input.sourceMode,
    source: input.source,
    videoUrl: input.videoUrl,
    transcript: input.sourceMode === "video" ? request.transcript : "",
    lessonFocus: input.sourceMode === "text" ? "source-comprehension" : request.lessonFocus,
    lessonFormat: input.sourceMode === "video" ? "video-comprehension" : input.sourceMode === "text" ? "article-text-discussion" : request.lessonFormat,
  };
}
