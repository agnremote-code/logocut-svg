import type { LessonScreen } from "@/types/lesson";

export type VisualAssetSource = "local" | "configured" | "teacher-upload";
export type VisualCompositionKind = "ser-estar-orbit" | "people-and-place" | "editorial-path" | "video-frames" | "conversation-map";

export type VisualAsset = {
  source: VisualAssetSource;
  kind: "svg-composition" | "image";
  composition?: VisualCompositionKind;
  src?: string;
  alt: string;
  credit: string;
};

export type VisualAssetSlot = {
  purpose: "cover-atmosphere" | "meaning-map" | "source-context" | "practice-context";
  screen: Pick<LessonScreen, "type" | "layout" | "title" | "body">;
};

export interface VisualAssetProvider {
  readonly name: VisualAssetSource;
  resolve(slot: VisualAssetSlot): VisualAsset | null;
}
