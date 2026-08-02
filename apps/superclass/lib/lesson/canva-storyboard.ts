import type { CreativeLessonBrief } from "@/lib/lesson/creative-brief";
import type { LessonDraft, LessonScreen, ScreenLayout, VisualSystem } from "@/types/lesson";

export const canvaLayoutNames = [
  "HeroCover",
  "VisualMenuGrid",
  "SplitImageQuestions",
  "HowItWorksCards",
  "MapHub",
  "VocabularyExpressionBank",
  "RolePlayScenario",
  "PhotoChoice",
  "OpinionSwitch",
  "RapidFire",
  "FinalManifesto",
  "DynamicPanel",
  "GrammarContrast",
  "SentenceBuilder",
  "FeedbackScreen",
] as const;

export const interactiveCanvaLayouts = new Set<ScreenLayout>([
  "visual-menu-grid",
  "map-hub",
  "vocabulary-expression-bank",
  "role-play-scenario",
  "photo-choice",
  "opinion-switch",
  "rapid-fire",
  "final-manifesto",
  "dynamic-panel",
  "grammar-contrast",
  "canva-sentence-builder",
  "feedback-screen",
]);

export function isInteractiveCanvaLayout(layout: ScreenLayout) {
  return interactiveCanvaLayouts.has(layout);
}

export function countInteractiveScreens(screens: LessonScreen[]) {
  return screens.filter((screen) => isInteractiveCanvaLayout(screen.layout)).length;
}

export function visualSystemClass(system: VisualSystem) {
  return `system-${system}`;
}

export function visualSystemForLesson(lesson: Pick<LessonDraft, "title" | "sourceMode" | "level" | "archetype">): VisualSystem {
  const text = `${lesson.title} ${lesson.archetype ?? ""}`.toLocaleLowerCase();
  if (/travel|journey|map|city|country/.test(text)) return "playful-map";
  if (/debate|quest/.test(text) || lesson.level === "C1" || lesson.level === "C2") return "bold-quest";
  if (lesson.sourceMode !== "idea" || /editorial|article/.test(text)) return "editorial";
  return "bright-classroom";
}

export function applyCanvaStoryboard(lesson: LessonDraft, brief: CreativeLessonBrief): LessonDraft {
  const screens = lesson.screens.map((screen, index) => ({
    ...screen,
    layout: (screen.layout.includes("-") && interactiveCanvaLayouts.has(screen.layout)) || screen.layout === "hero-cover" || screen.layout === "how-it-works-cards" || screen.layout === "split-image-questions"
      ? screen.layout
      : brief.screenSequence[index % brief.screenSequence.length],
  }));
  return { ...lesson, title: brief.normalizedTitle, screens };
}
