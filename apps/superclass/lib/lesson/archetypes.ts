import { targetScreenCount } from "@/lib/lesson/duration";
import type { LessonArchetype, LessonFormat, LessonRequest, ScreenLayout } from "@/types/lesson";

export type LessonEngine = "beginner" | "intermediate" | "advanced";

export type LessonArchetypeDefinition = {
  id: LessonArchetype;
  label: string;
  engine: LessonEngine;
  allowedLayouts: ScreenLayout[];
  density: "low" | "medium" | "high";
  bilingualBehavior: string;
  imageUsage: string;
  maxQuestionsPerScreen: number;
  activityTypes: string[];
  hierarchy: string;
  teacherControls: string[];
  sequence: string[];
};

const definitions: Record<LessonArchetype, LessonArchetypeDefinition> = {
  "beginner-visual-topic": {
    id: "beginner-visual-topic", label: "Beginner visual vocabulary", engine: "beginner",
    allowedLayouts: ["topic-menu", "image-topic", "vocabulary-cards", "verb-bank", "sentence-builder", "connector-bank", "guided-questions", "recap", "feedback", "homework"],
    density: "low", bilingualBehavior: "Target language first; support language directly underneath.",
    imageUsage: "Bundled illustration or explicit planned image slot; never an invented URL.", maxQuestionsPerScreen: 4,
    activityTypes: ["visual naming", "compact word banks", "sentence building", "guided speaking"],
    hierarchy: "Large topic cue, compact bilingual banks, one speaking task at a time.",
    teacherControls: ["answer", "example", "optional correction"], sequence: ["Topic", "image", "vocabulary", "verbs", "starters", "connectors", "guided questions", "model", "recap", "homework"],
  },
  "beginner-essential-grammar": {
    id: "beginner-essential-grammar", label: "Beginner essential grammar", engine: "beginner",
    allowedLayouts: ["cover", "image-topic", "comparison", "rule-cards", "sentence-builder", "multiple-choice", "guided-questions", "recap", "homework"],
    density: "low", bilingualBehavior: "Bilingual instructions and examples with the target language dominant.",
    imageUsage: "Bundled diagrams and situation illustrations.", maxQuestionsPerScreen: 4,
    activityTypes: ["notice", "choose", "complete", "personal speaking"], hierarchy: "One structure, one model, one short task.",
    teacherControls: ["answer", "example"], sequence: ["Context", "meaning", "model", "guided practice", "speaking", "review"],
  },
  "intermediate-grammar-workshop": {
    id: "intermediate-grammar-workshop", label: "Grammar workshop", engine: "intermediate",
    allowedLayouts: ["cover", "objective", "comparison", "rule-cards", "example-gallery", "multiple-choice", "sorting", "fill-gap", "error-correction", "illustrated-context", "personal-prompts", "dialogue", "recap", "homework"],
    density: "medium", bilingualBehavior: "Target language first with selective support-language clarification.",
    imageUsage: "Context diagrams and optional source images.", maxQuestionsPerScreen: 4,
    activityTypes: ["compare", "choose", "sort", "transform", "correct", "personalize"],
    hierarchy: "Rule contrast followed by increasingly independent practice.", teacherControls: ["answer", "correction"],
    sequence: ["Comparison", "examples", "guided practice", "correction", "speaking", "review"],
  },
  "intermediate-conversation": {
    id: "intermediate-conversation", label: "Conversation journey", engine: "intermediate",
    allowedLayouts: ["cover", "illustrated-context", "vocabulary-cards", "example-gallery", "sentence-builder", "dialogue", "personal-prompts", "recap", "homework"],
    density: "medium", bilingualBehavior: "Primarily target language; support language only where it prevents confusion.",
    imageUsage: "One atmosphere image or designed diagram per context.", maxQuestionsPerScreen: 4,
    activityTypes: ["visual hook", "input", "guided speaking", "scenario", "reflection"], hierarchy: "Context before language; models before open speaking.",
    teacherControls: ["example", "optional correction"], sequence: ["Hook", "language", "short input", "guided speaking", "scenario", "recap"],
  },
  "advanced-editorial": {
    id: "advanced-editorial", label: "Article or text discussion", engine: "advanced",
    allowedLayouts: ["cover", "illustrated-context", "example-gallery", "vocabulary-cards", "personal-prompts", "debate-cards", "sorting", "dialogue", "recap", "homework"],
    density: "high", bilingualBehavior: "Target language only unless a precise support gloss is requested.",
    imageUsage: "Editorial atmosphere image, source image or clearly marked planned image slot.", maxQuestionsPerScreen: 4,
    activityTypes: ["first impression", "source reading", "opinion scale", "analysis", "synthesis"], hierarchy: "Editorial headline, evidence, interpretation, conclusion.",
    teacherControls: ["evidence", "model"], sequence: ["Editorial hook", "source", "language in context", "analysis", "reflection"],
  },
  "advanced-debate": {
    id: "advanced-debate", label: "Debate and critical thinking", engine: "advanced",
    allowedLayouts: ["cover", "illustrated-context", "vocabulary-cards", "debate-cards", "sorting", "dialogue", "personal-prompts", "recap", "homework"],
    density: "high", bilingualBehavior: "Target language dominant with rare terminology glosses.",
    imageUsage: "Cinematic diagram or verified image source.", maxQuestionsPerScreen: 4,
    activityTypes: ["opinion scale", "argument/counterargument", "ethical dilemma", "ranking", "long turn"], hierarchy: "Provocation, competing claims, decision, reflection.",
    teacherControls: ["counterargument", "evidence"], sequence: ["Atmosphere", "first impression", "language", "positions", "dilemma", "debate", "reflection"],
  },
  "travel-culture": {
    id: "travel-culture", label: "Travel and culture", engine: "intermediate",
    allowedLayouts: ["topic-menu", "image-topic", "vocabulary-cards", "illustrated-context", "sentence-builder", "dialogue", "personal-prompts", "recap", "homework"],
    density: "medium", bilingualBehavior: "Level-dependent bilingual support.", imageUsage: "Place image or repository-owned destination diagram.",
    maxQuestionsPerScreen: 4, activityTypes: ["visual exploration", "functional language", "scenario", "culture comparison"], hierarchy: "Place, useful language, decision, conversation.",
    teacherControls: ["example"], sequence: ["Destination", "language", "scenario", "culture", "recap"],
  },
  "source-comprehension": {
    id: "source-comprehension", label: "Source comprehension", engine: "advanced",
    allowedLayouts: ["cover", "example-gallery", "multiple-choice", "vocabulary-cards", "sorting", "debate-cards", "recap", "homework"],
    density: "high", bilingualBehavior: "Matches level; source language remains unchanged.",
    imageUsage: "Only a source image, teacher upload or explicit empty planned slot.", maxQuestionsPerScreen: 4,
    activityTypes: ["gist", "evidence", "inference", "response"], hierarchy: "Source evidence before opinion.",
    teacherControls: ["evidence", "answer"], sequence: ["Purpose", "source", "gist", "evidence", "inference", "response"],
  },
  "professional-scenario": {
    id: "professional-scenario", label: "Professional language", engine: "advanced",
    allowedLayouts: ["cover", "illustrated-context", "vocabulary-cards", "dialogue", "sorting", "debate-cards", "personal-prompts", "recap", "homework"],
    density: "high", bilingualBehavior: "Target language with concise terminology support.",
    imageUsage: "Workplace diagram or teacher-provided image.", maxQuestionsPerScreen: 4,
    activityTypes: ["brief", "language strategy", "role scenario", "decision", "debrief"], hierarchy: "Outcome first, language choices second.",
    teacherControls: ["model", "correction"], sequence: ["Brief", "language", "scenario", "decision", "debrief"],
  },
};

export const lessonFormatOptions: Array<{ value: LessonFormat; label: string; description: string }> = [
  { value: "automatic", label: "Automatic", description: "Superclass chooses a level-appropriate structure from your topic, source and goals." },
  { value: "beginner-visual-vocabulary", label: "Beginner visual vocabulary", description: "Bilingual image-led word banks, sentence starters and guided questions." },
  { value: "grammar-workshop", label: "Grammar workshop", description: "A focused comparison followed by practice, correction and personal speaking." },
  { value: "conversation-journey", label: "Conversation journey", description: "Useful language moves from a visual hook into guided and open speaking." },
  { value: "article-text-discussion", label: "Article or text discussion", description: "Source evidence, vocabulary in context and an editorial discussion arc." },
  { value: "video-comprehension", label: "Video comprehension", description: "Transcript-grounded gist, evidence and response activities." },
  { value: "debate-critical-thinking", label: "Debate and critical thinking", description: "Competing arguments, a dilemma and longer evidence-led speaking turns." },
  { value: "travel-culture", label: "Travel and culture", description: "Visual destination language, culture and practical scenarios." },
  { value: "professional-language", label: "Professional language", description: "Outcome-led workplace language and realistic professional decisions." },
  { value: "custom", label: "Custom instructions", description: "Your class instructions guide the closest safe lesson archetype." },
];

export function selectLessonArchetype(request: LessonRequest): LessonArchetypeDefinition {
  const topic = `${request.source} ${request.customClassInstructions} ${request.learningGoal}`.toLocaleLowerCase();
  const explicit: Partial<Record<LessonFormat, LessonArchetype>> = {
    "beginner-visual-vocabulary": "beginner-visual-topic",
    "grammar-workshop": ["A0", "A1"].includes(request.level) ? "beginner-essential-grammar" : "intermediate-grammar-workshop",
    "conversation-journey": ["A0", "A1"].includes(request.level) ? "beginner-visual-topic" : "intermediate-conversation",
    "article-text-discussion": "advanced-editorial",
    "video-comprehension": "source-comprehension",
    "debate-critical-thinking": "advanced-debate",
    "travel-culture": "travel-culture",
    "professional-language": "professional-scenario",
  };
  if (request.lessonFormat !== "automatic" && request.lessonFormat !== "custom" && explicit[request.lessonFormat]) {
    return definitions[explicit[request.lessonFormat]!];
  }
  if (request.sourceMode !== "idea") return definitions["source-comprehension"];
  if (/work|business|interview|professional|meeting/.test(topic)) return definitions["professional-scenario"];
  if (/travel|buenos aires|culture|ciudad|viaje/.test(topic)) {
    if (["A0", "A1"].includes(request.level)) return definitions["beginner-visual-topic"];
    if (["A2", "B1"].includes(request.level)) return definitions["travel-culture"];
    return definitions["advanced-editorial"];
  }
  const grammar = request.lessonFocus === "grammar-focused" || /\bser\b.*\bestar\b|\bgrammar|gramática|verb|tense\b/.test(topic);
  if (["A0", "A1"].includes(request.level)) return definitions[grammar ? "beginner-essential-grammar" : "beginner-visual-topic"];
  if (["A2", "B1"].includes(request.level)) return definitions[grammar ? "intermediate-grammar-workshop" : "intermediate-conversation"];
  if (/debate|ethic|casino|gambl|psycholog|dilemma|critical/.test(topic)) return definitions["advanced-debate"];
  return definitions[request.level === "C1" || request.level === "C2" ? "advanced-debate" : "advanced-editorial"];
}

export function classPlanPreview(request: LessonRequest) {
  const archetype = selectLessonArchetype(request);
  return {
    ...archetype,
    screens: targetScreenCount(request.duration),
    structure: archetype.sequence.slice(0, 6).join(" → "),
  };
}

export function archetypeDefinition(id: LessonArchetype) {
  return definitions[id];
}
