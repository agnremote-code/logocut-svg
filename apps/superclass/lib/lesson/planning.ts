import { languageContract } from "@/lib/lesson/language";
import { selectLessonArchetype } from "@/lib/lesson/archetypes";
import { createCreativeLessonBrief, type CreativeLessonBrief } from "@/lib/lesson/creative-brief";
import { interpretLessonRequest, type InterpretedLessonIntent } from "@/lib/lesson/intent";
import type { LessonArchetype, LessonRequest, ScreenLayout } from "@/types/lesson";

export type TopicType = "grammar" | "vocabulary" | "conversation" | "pronunciation" | "reading" | "listening" | "source-comprehension" | "professional-language";

export type LessonPlan = {
  exactTopic: string;
  normalizedTopic: string;
  topicType: TopicType;
  language: ReturnType<typeof languageContract>;
  objectives: string[];
  expectedStructures: string[];
  requiredKeywords: string[];
  prohibitedContent: string[];
  activitySequence: ScreenLayout[];
  archetype: LessonArchetype;
  imageSlotPlan: string;
  customInstructions: string;
  intent: InterpretedLessonIntent;
  creativeBrief: CreativeLessonBrief;
  specializedTemplate?: "ser-estar" | "present-tense" | "preterite-imperfect" | "por-para" | "subjunctive" | "articles" | "gender-number" | "questions";
};

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const normalize = (value: string) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

function specializedGrammar(topic: string): LessonPlan["specializedTemplate"] {
  if (/\bser\b.*\bestar\b|\bestar\b.*\bser\b/.test(topic)) return "ser-estar";
  if (/present(?:e)?|present tense/.test(topic)) return "present-tense";
  if (/preterit|pretérito|imperfect/.test(topic)) return "preterite-imperfect";
  if (/\bpor\b.*\bpara\b|\bpara\b.*\bpor\b/.test(topic)) return "por-para";
  if (/subjunct|subjunt/.test(topic)) return "subjunctive";
  if (/article|articul/.test(topic)) return "articles";
  if (/gender|genero|number|numero/.test(topic)) return "gender-number";
  if (/question|pregunta/.test(topic)) return "questions";
  return undefined;
}

export function createLessonPlan(
  request: LessonRequest,
  intent = interpretLessonRequest(request),
  creativeBrief = createCreativeLessonBrief(request, intent),
): LessonPlan {
  const exactTopic = clean(intent.topic || "Practical language");
  const normalizedTopic = normalize(exactTopic);
  const specializedTemplate = specializedGrammar(normalizedTopic);
  const explicitGrammar = specializedTemplate || intent.focus === "grammar-focused" || /\bverb|verbo|grammar|gramática|tense|tiempo verbal\b/.test(normalizedTopic);
  const topicType: TopicType =
    intent.sourceKind === "video" || intent.sourceKind === "source-material" ? "source-comprehension"
      : explicitGrammar ? "grammar"
        : request.lessonFocus === "pronunciation-focused" ? "pronunciation"
          : /job|interview|work|business|professional/.test(normalizedTopic) ? "professional-language"
            : /vocab|famil(?:y|ia)|words|palabras/.test(normalizedTopic) ? "vocabulary"
              : "conversation";
  const serEstar = specializedTemplate === "ser-estar";
  const archetype = selectLessonArchetype(request, intent);
  return {
    exactTopic,
    normalizedTopic,
    topicType,
    language: languageContract(request),
    objectives: serEstar
      ? ["Choose ser or estar in common situations", "Explain the contrast using identity, origin, profession, location, conditions and emotions"]
      : [`Use ${exactTopic} accurately in a realistic context`, `Produce level-appropriate language about ${exactTopic}`],
    expectedStructures: serEstar
      ? ["ser + identity/origin/profession/general characteristic", "estar + location/temporary condition/emotion"]
      : [exactTopic],
    requiredKeywords: serEstar
      ? ["ser", "estar", "soy", "es", "son", "estoy", "está", "están", "identidad", "origen", "profesión", "características", "ubicación", "condición", "emociones"]
      : normalizedTopic.split(/\s+/).filter((word) => word.length > 3).slice(0, 6),
    prohibitedContent: /living abroad|vivir en el extranjero/.test(normalizedTopic) ? [] : ["living abroad", "adapting to a new culture", "culture shock"],
    activitySequence: archetype.allowedLayouts,
    archetype: archetype.id,
    imageSlotPlan: creativeBrief.imageSlots.map((slot) => `${slot.purpose}: ${slot.fallback}`).join("; "),
    customInstructions: request.customClassInstructions,
    intent,
    creativeBrief,
    specializedTemplate,
  };
}
