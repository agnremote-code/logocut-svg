import type { LessonScreen, ScreenType } from "@/types/lesson";

export type LessonModule = "Welcome" | "Warm-up" | "Input" | "Vocabulary" | "Pronunciation" | "Grammar" | "Practice" | "Conversation" | "Review" | "Homework";

const moduleByType: Record<ScreenType, LessonModule> = {
  cover: "Welcome",
  objective: "Welcome",
  warmup: "Warm-up",
  context: "Input",
  source: "Input",
  video: "Input",
  comprehension: "Input",
  vocabulary: "Vocabulary",
  pronunciation: "Pronunciation",
  "sentence-frames": "Grammar",
  microgrammar: "Grammar",
  "controlled-practice": "Practice",
  "error-correction": "Practice",
  "personal-questions": "Conversation",
  discussion: "Conversation",
  debate: "Conversation",
  review: "Review",
  "exit-task": "Review",
  homework: "Homework",
  "answer-key": "Review",
};

export function moduleForScreen(screen: LessonScreen) {
  return moduleByType[screen.type];
}

export function groupLessonModules(screens: LessonScreen[]) {
  const groups = new Map<LessonModule, { module: LessonModule; indexes: number[]; minutes: number }>();
  screens.forEach((screen, index) => {
    const lessonModule = moduleForScreen(screen);
    const existing = groups.get(lessonModule) ?? { module: lessonModule, indexes: [], minutes: 0 };
    existing.indexes.push(index);
    existing.minutes += screen.timing;
    groups.set(lessonModule, existing);
  });
  return Array.from(groups.values());
}

export type ActivityState = { selected: number[]; revealed: boolean; flipped: number[] };
export const initialActivityState: ActivityState = { selected: [], revealed: false, flipped: [] };

export function toggleActivityChoice(state: ActivityState, index: number): ActivityState {
  return { ...state, selected: state.selected.includes(index) ? state.selected.filter((item) => item !== index) : [...state.selected, index] };
}

export function toggleFlashcard(state: ActivityState, index: number): ActivityState {
  return { ...state, flipped: state.flipped.includes(index) ? state.flipped.filter((item) => item !== index) : [...state.flipped, index] };
}
