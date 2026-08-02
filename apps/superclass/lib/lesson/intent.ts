import { normalizeLanguageId } from "@/lib/lesson/language";
import type { LanguageId, LessonFocus, LessonLevel, LessonRequest, VisualStyle } from "@/types/lesson";

export type InterpretedSourceKind = "idea" | "source-material" | "detailed-brief" | "video";

export type InterpretedLessonIntent = {
  command: string;
  topic: string;
  title: string;
  sourceKind: InterpretedSourceKind;
  requestedLevel: LessonLevel;
  requestedLanguage: LanguageId;
  supportLanguage: LanguageId;
  grammarTargets: string[];
  activityPreferences: string[];
  visualPreferences: string[];
  duration: number;
  focus: LessonFocus;
};

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const folded = (value: string) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

function isSerEstar(value: string) {
  const text = folded(value);
  return /\b(?:verbos?\s+)?(?:ser|er)\s*(?:(?:y|e|o|vs\.?|versus|\/|and)\s*)?estar\b|\bestar\s*(?:(?:y|e|o|vs\.?|versus|\/|and)\s*)?ser\b/.test(text);
}

function requestedLevel(value: string, fallback: LessonLevel) {
  return (value.match(/\b(A0|A1|A2|B1|B2|C1|C2)\b/i)?.[1]?.toUpperCase() as LessonLevel | undefined) ?? fallback;
}

function requestedDuration(value: string, fallback: number) {
  const match = folded(value).match(/\b(\d{2,3})\s*(?:minutos?|minutes?|mins?)\b/);
  const parsed = Number(match?.[1]);
  return Number.isInteger(parsed) && parsed >= 20 && parsed <= 120 ? parsed : fallback;
}

function requestedTargetLanguage(value: string, fallback: LanguageId) {
  const text = folded(value);
  const match = text.match(/\b(?:clase|lesson|curso)\s+(?:de|en|in)\s+(espanol|spanish|ingles|english|frances|french|portugues|portuguese|aleman|german|italiano|italian)\b/);
  return normalizeLanguageId(match?.[1]) ?? fallback;
}

function requestedSupportLanguage(value: string, fallback: LanguageId) {
  const text = folded(value);
  const match = text.match(/\b(?:apoyo|support|explicaciones?|translations?)\s+(?:en|in)\s+(espanol|spanish|ingles|english|frances|french|portugues|portuguese)\b/);
  return normalizeLanguageId(match?.[1]) ?? fallback;
}

function stripCommand(value: string) {
  return clean(value)
    .replace(/^(?:por favor[,:]?\s*)?/i, "")
    .replace(/^(?:in this video|en este video),?\s+(?:the speaker|el hablante|la persona)\s+(?:explains?|shows?|discusses?|explica|muestra|presenta)\s+(?:how|why|that|cómo|como|por qué|que)?\s*/i, "")
    .replace(/^(?:haceme|hazme|creame|créame|crea|prepara|armame|ármame|diseña|disena)\s+(?:una?\s+)?(?:clase|lección|leccion|presentación|presentacion)\s+(?:de|sobre|acerca de|para practicar)?\s*/i, "")
    .replace(/^(?:please\s+)?(?:create|make|build|design|prepare)\s+(?:me\s+)?(?:an?\s+)?(?:(?:A0|A1|A2|B1|B2|C1|C2)\s+)?(?:(?:bilingual|visual|interactive|conversation|grammar)\s+)*(?:class|lesson|presentation)\s+(?:about|on|for)?\s*/i, "")
    .replace(/^(?:una?\s+)?(?:clase|lección|leccion)\s+(?:práctica|practica|visual|bilingüe|bilingue)?\s*(?:de|sobre)?\s*/i, "")
    .replace(/^(?:verbos?\s+)?(?:er|ser)\s+(?:y|e|o|vs\.?|versus|\/|and)?\s*estar\b/i, "ser y estar")
    .replace(/,\s*(?:with|including|include|con|incluye)\b.*$/i, "")
    .replace(/\b(?:con|incluye|including|with)\s+(?:ejemplos?|examples?|práctica|practica|practice|preguntas?|questions?).*$/i, "")
    .replace(/[.!?]+$/, "")
    .trim();
}

function classroomTitle(raw: string, targetLanguage: LanguageId) {
  if (isSerEstar(raw)) return "SER y ESTAR";
  const topic = stripCommand(raw).split(/[\n.!?]/)[0]?.trim() || (targetLanguage === "es" ? "Comunicación práctica" : "Practical communication");
  const concise = topic.split(/\s+/).slice(0, 8).join(" ");
  return concise.charAt(0).toLocaleUpperCase() + concise.slice(1);
}

function inferSourceKind(request: LessonRequest): InterpretedSourceKind {
  if (request.sourceMode === "video") return "video";
  if (request.sourceMode === "text") return "source-material";
  const source = request.source.trim();
  if (request.customClassInstructions.trim() || /\b(?:include|incluye|start with|empieza con|finish with|termina con|visual style|estilo visual)\b/i.test(source)) return "detailed-brief";
  if (source.length > 700 || source.split(/\n+/).length >= 4) return "source-material";
  return "idea";
}

function inferFocus(value: string, fallback: LessonFocus): LessonFocus {
  const text = folded(value);
  if (isSerEstar(text) || /\b(?:gramatica|grammar|verbos?|tense|tiempo verbal)\b/.test(text)) return "grammar-focused";
  if (/\b(?:pronunciacion|pronunciation|sounds?|sonidos?)\b/.test(text)) return "pronunciation-focused";
  if (/\b(?:articulo|article|texto|text|transcript|transcripcion|comprension|comprehension)\b/.test(text)) return "source-comprehension";
  if (/\b(?:conversacion|conversation|speaking|hablar|discusion|discussion)\b/.test(text)) return "conversation";
  return fallback;
}

function activityPreferences(value: string) {
  const text = folded(value);
  const preferences = [
    [/\b(?:choice|elige|multiple choice|opcion)\b/, "short choice practice"],
    [/\b(?:gap|completa|fill)\b/, "sentence completion"],
    [/\b(?:correct|corrige|errores?)\b/, "error correction"],
    [/\b(?:personal|speaking|hablar|preguntas?)\b/, "personal speaking"],
    [/\b(?:dialog|dialogo|roleplay|escenario)\b/, "guided scenario"],
  ] as const;
  return preferences.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
}

function visualPreferences(value: string, fallback: VisualStyle) {
  const text = folded(value);
  return [
    fallback.replaceAll("-", " "),
    ...(text.match(/\b(?:editorial|cinematic|cinematico|colourful|colorido|minimal|visual|illustrated|ilustrado)\b/g) ?? []),
  ].filter((item, index, all) => all.indexOf(item) === index);
}

export function interpretLessonRequest(request: LessonRequest): InterpretedLessonIntent {
  const command = clean(request.sourceMode === "video" ? request.transcript : request.source);
  const targetLanguage = requestedTargetLanguage(command, request.language);
  const topic = isSerEstar(command)
    ? "ser y estar"
    : stripCommand(command).split(/[\n.!?]/)[0]?.trim() || (targetLanguage === "es" ? "comunicación práctica" : "practical communication");
  return {
    command,
    topic,
    title: classroomTitle(command, targetLanguage),
    sourceKind: inferSourceKind(request),
    requestedLevel: requestedLevel(command, request.level),
    requestedLanguage: targetLanguage,
    supportLanguage: requestedSupportLanguage(command, request.supportLanguage),
    grammarTargets: isSerEstar(command) ? ["ser", "estar"] : [],
    activityPreferences: activityPreferences(`${command} ${request.customClassInstructions}`),
    visualPreferences: visualPreferences(`${command} ${request.customClassInstructions}`, request.visualStyle),
    duration: requestedDuration(command, request.duration),
    focus: inferFocus(command, request.lessonFocus),
  };
}

export function applyInterpretedIntent(request: LessonRequest, intent: InterpretedLessonIntent): LessonRequest {
  return {
    ...request,
    level: intent.requestedLevel,
    duration: intent.duration,
    language: intent.requestedLanguage,
    supportLanguage: intent.supportLanguage,
    lessonFocus: intent.focus,
    lessonFormat: intent.grammarTargets.length ? "grammar-workshop" : request.lessonFormat,
  };
}
