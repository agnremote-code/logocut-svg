import { selectLessonArchetype } from "@/lib/lesson/archetypes";
import type { InterpretedLessonIntent } from "@/lib/lesson/intent";
import type { LessonRequest, ScreenLayout, VisualSystem } from "@/types/lesson";

export type CreativeLessonBrief = {
  normalizedTitle: string;
  topic: string;
  level: string;
  duration: number;
  lessonGoal: string;
  languageDistribution: string;
  visualSystem: VisualSystem;
  visualMotif: string;
  screenSequence: ScreenLayout[];
  interactions: string[];
  sourceGrounding: string;
  objective: string;
  narrativeArc: string[];
  visualDirection: string;
  languageBalance: string;
  requiredContent: string[];
  activityPlan: string[];
  templateFamily: string;
  screenPurposes: string[];
  imageSlots: Array<{ purpose: string; provider: "local"; fallback: string }>;
};

const serEstarSequence: ScreenLayout[] = [
  "hero-cover",
  "how-it-works-cards",
  "grammar-contrast",
  "vocabulary-expression-bank",
  "photo-choice",
  "visual-menu-grid",
  "dynamic-panel",
  "canva-sentence-builder",
  "opinion-switch",
  "role-play-scenario",
  "split-image-questions",
  "rapid-fire",
  "final-manifesto",
  "feedback-screen",
];

function selectVisualSystem(request: LessonRequest, intent: InterpretedLessonIntent): VisualSystem {
  const text = `${intent.topic} ${request.customClassInstructions}`.toLocaleLowerCase();
  if (/map|travel|city|country|mission|journey|viaje|ciudad|país/.test(text)) return "playful-map";
  if (/debate|quest|challenge|game|misterio|desafío/.test(text) || request.level === "C1" || request.level === "C2") return "bold-quest";
  if (/article|history|culture|literature|film|editorial|texto|historia/.test(text) || request.sourceMode !== "idea") return "editorial";
  return "bright-classroom";
}

function genericSequence(request: LessonRequest): ScreenLayout[] {
  const base: ScreenLayout[] = [
    "hero-cover",
    "how-it-works-cards",
    request.sourceMode === "idea" ? "photo-choice" : "split-image-questions",
    "vocabulary-expression-bank",
    "dynamic-panel",
    "visual-menu-grid",
    "canva-sentence-builder",
    "role-play-scenario",
    "opinion-switch",
    "rapid-fire",
    "final-manifesto",
    "feedback-screen",
  ];
  if (request.duration >= 60) base.splice(5, 0, "grammar-contrast", "map-hub");
  if (request.duration >= 90) base.splice(8, 0, "photo-choice", "split-image-questions", "dynamic-panel", "rapid-fire");
  return base;
}

export function createCreativeLessonBrief(request: LessonRequest, intent: InterpretedLessonIntent): CreativeLessonBrief {
  const archetype = selectLessonArchetype(request, intent);
  const serEstar = intent.grammarTargets.includes("ser") && intent.grammarTargets.includes("estar");
  const objective = serEstar
    ? "Use SER for identity and origin, and ESTAR for location and current state, in accurate personal speaking."
    : `Use level-appropriate language to communicate clearly about ${intent.topic}.`;
  const narrativeArc = serEstar
    ? ["notice the contrast", "connect form to meaning", "choose", "sort", "repair", "role-play", "speak personally", "retrieve"]
    : archetype.sequence;
  const screenSequence = serEstar ? serEstarSequence : genericSequence(request);
  const languageDistribution = request.level === "A0" || request.level === "A1"
    ? "Target language visually primary with concise support-language scaffolding."
    : "Target language leads; support language appears only where it removes ambiguity.";
  const visualSystem = selectVisualSystem(request, intent);
  const visualMotif = serEstar
    ? "Two contrasting worlds: identity cards and location/status signals, joined by a central choice line."
    : visualSystem === "playful-map"
      ? `A mission map that turns ${intent.topic} into navigable stops.`
      : visualSystem === "editorial"
        ? `Bold cropped topic panels and annotated evidence from ${intent.topic}.`
        : visualSystem === "bold-quest"
          ? `High-contrast missions that progressively unlock ${intent.topic}.`
          : `Warm classroom cards with oversized topic typography and meaningful color cues for ${intent.topic}.`;
  const interactions = serEstar
    ? ["choice cards", "sorting", "detail reveal", "sentence builder", "opinion switch", "role selection", "rapid fire", "timer challenge"]
    : ["choice cards", "detail reveal", "sentence builder", "role selection", "random question", "timer challenge"];
  const sourceGrounding = request.sourceMode === "video"
    ? "Transcript-derived checkpoints, exact excerpts and youtube-nocookie video context are required."
    : request.sourceMode === "text"
      ? "Claims, comprehension answers and evidence must remain inside the pasted source."
      : "No external factual claims are required; examples must stay within the teacher's stated topic.";

  return {
    normalizedTitle: intent.title,
    topic: serEstar ? "Spanish grammar contrast" : intent.topic,
    level: intent.requestedLevel,
    duration: intent.duration,
    lessonGoal: objective,
    languageDistribution,
    visualSystem,
    visualMotif,
    screenSequence,
    interactions,
    sourceGrounding,
    objective,
    narrativeArc,
    visualDirection: `${visualSystem}; ${visualMotif} True 16:9 composition, large typography and materially different screen structures.`,
    languageBalance: languageDistribution,
    requiredContent: serEstar
      ? ["identity", "origin", "profession", "location", "emotion", "condition", "common errors", "personal speaking"]
      : [intent.topic, ...intent.grammarTargets],
    activityPlan: interactions,
    templateFamily: archetype.id,
    screenPurposes: screenSequence.map((layout, index) => `${index + 1}. ${layout.replaceAll("-", " ")} advances ${narrativeArc[index % narrativeArc.length]}`),
    imageSlots: [
      { purpose: "topic-led cover composition", provider: "local", fallback: "large typographic motif" },
      { purpose: "meaningful context panel", provider: "local", fallback: "topic-specific CSS composition" },
    ],
  };
}

export function hasRepeatedLayoutRun(layouts: ScreenLayout[], maximum = 2) {
  let run = 1;
  for (let index = 1; index < layouts.length; index += 1) {
    run = layouts[index] === layouts[index - 1] ? run + 1 : 1;
    if (run > maximum) return true;
  }
  return false;
}
