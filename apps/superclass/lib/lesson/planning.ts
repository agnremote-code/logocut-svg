import { languageContract } from "@/lib/lesson/language";
import { selectLessonArchetype } from "@/lib/lesson/archetypes";
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

export function createLessonPlan(request: LessonRequest): LessonPlan {
  const material = request.sourceMode === "video" ? request.transcript : request.source;
  const exactTopic = clean(material.split(/[\n.!?]/)[0] || "Practical language");
  const normalizedTopic = normalize(exactTopic);
  const specializedTemplate = specializedGrammar(normalizedTopic);
  const explicitGrammar = specializedTemplate || request.lessonFocus === "grammar-focused" || /\bverb|verbo|grammar|gramática|tense|tiempo verbal\b/.test(normalizedTopic);
  const topicType: TopicType =
    request.sourceMode !== "idea" ? "source-comprehension"
      : explicitGrammar ? "grammar"
        : request.lessonFocus === "pronunciation-focused" ? "pronunciation"
          : /job|interview|work|business|professional/.test(normalizedTopic) ? "professional-language"
            : /vocab|famil(?:y|ia)|words|palabras/.test(normalizedTopic) ? "vocabulary"
              : "conversation";
  const serEstar = specializedTemplate === "ser-estar";
  const archetype = selectLessonArchetype(request);
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
    imageSlotPlan: archetype.imageUsage,
    customInstructions: request.customClassInstructions,
    specializedTemplate,
  };
}
