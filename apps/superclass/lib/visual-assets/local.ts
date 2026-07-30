import type { VisualAssetProvider, VisualCompositionKind } from "@/lib/visual-assets/types";

function compositionFor(title: string, body = ""): VisualCompositionKind {
  const content = `${title} ${body}`.toLocaleLowerCase();
  if (/\bser\b.*\bestar\b|\bestar\b.*\bser\b/.test(content)) return "ser-estar-orbit";
  if (/persona|people|lugar|place|ubicación|location|ciudad|city/.test(content)) return "people-and-place";
  if (/video|watch|mira|caption|transcript/.test(content)) return "video-frames";
  if (/conversation|conversación|dialog|speaking|habla/.test(content)) return "conversation-map";
  return "editorial-path";
}

export const localVisualAssetProvider: VisualAssetProvider = {
  name: "local",
  resolve({ purpose, screen }) {
    return {
      source: "local",
      kind: "svg-composition",
      composition: compositionFor(screen.title, screen.body),
      alt: `${screen.title}: designed ${purpose.replaceAll("-", " ")} illustration`,
      credit: "Repository-owned Superclass SVG composition",
    };
  },
};
