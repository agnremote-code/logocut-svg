import { localVisualAssetProvider } from "@/lib/visual-assets/local";
import type { VisualAssetProvider, VisualAssetSlot } from "@/lib/visual-assets/types";

export const configuredVisualAssetProvider: VisualAssetProvider = {
  name: "configured",
  resolve() {
    return null;
  },
};

export const teacherUploadVisualAssetProvider: VisualAssetProvider = {
  name: "teacher-upload",
  resolve() {
    return null;
  },
};

export function resolveVisualAsset(slot: VisualAssetSlot) {
  return localVisualAssetProvider.resolve(slot);
}

export type { VisualAsset, VisualAssetProvider, VisualAssetSlot } from "@/lib/visual-assets/types";
