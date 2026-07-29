import type { LessonRequest, SourceMode } from "@/types/lesson";

export function switchSourceMode(request: LessonRequest, sourceMode: SourceMode): LessonRequest {
  return {
    ...request,
    sourceMode,
    ...(sourceMode === "idea" ? { transcript: "", videoUrl: "" } : {}),
  };
}

export function activeSourceIsReady(request: LessonRequest) {
  if (request.sourceMode === "video") return /^https?:\/\//i.test(request.videoUrl) && request.transcript.trim().length >= 12;
  return request.source.trim().length >= 12;
}
