import { selectLessonArchetype } from "@/lib/lesson/archetypes";
import type { InterpretedLessonIntent } from "@/lib/lesson/intent";
import type { LessonRequest, ScreenLayout } from "@/types/lesson";

export type CreativeLessonBrief = {
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

export function createCreativeLessonBrief(request: LessonRequest, intent: InterpretedLessonIntent): CreativeLessonBrief {
  const archetype = selectLessonArchetype(request, intent);
  const serEstar = intent.grammarTargets.includes("ser") && intent.grammarTargets.includes("estar");
  const narrativeArc = serEstar
    ? ["recognize the meaning contrast", "see each verb in human situations", "choose with support", "repair errors", "speak personally", "retrieve quickly"]
    : archetype.sequence;
  const screenPurposes = serEstar
    ? [
      "invite the learner into the contrast",
      "make the outcome visible",
      "map identity/origin against location/state",
      "notice SER through people and places",
      "notice ESTAR through people and places",
      "choose the verb by meaning",
      "match examples to meaning",
      "complete short sentences",
      "repair four common errors",
      "build personal sentences",
      "answer guided speaking questions",
      "retrieve the contrast quickly",
      "extend practice after class",
    ]
    : archetype.activityTypes.map((activity) => `${activity} connected to ${intent.topic}`);
  return {
    objective: serEstar
      ? "Use SER for identity and origin, and ESTAR for location and current state, in short personal sentences."
      : `Use level-appropriate language to communicate clearly about ${intent.topic}.`,
    narrativeArc,
    visualDirection: `${intent.visualPreferences.join(", ")}; true 16:9 composition; strong typographic hierarchy; one designed visual system per screen.`,
    languageBalance: request.level === "A0" || request.level === "A1"
      ? "Target language is visually primary; support language sits directly underneath in smaller type."
      : archetype.bilingualBehavior,
    requiredContent: serEstar
      ? ["identity", "origin", "profession", "location", "emotion", "condition", "people", "places"]
      : [intent.topic, ...intent.grammarTargets],
    activityPlan: intent.activityPreferences.length ? intent.activityPreferences : archetype.activityTypes,
    templateFamily: archetype.id,
    screenPurposes,
    imageSlots: [
      { purpose: "cover atmosphere", provider: "local", fallback: "designed geometric composition" },
      { purpose: serEstar ? "people and place meaning map" : "topic context", provider: "local", fallback: "repository-owned SVG diagram" },
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
