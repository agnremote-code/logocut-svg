export type LessonLevel = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type LessonStyle = "conversation" | "balanced" | "grammar";
export type VisualStyle = "retro" | "clean" | "editorial";

export type LessonRequest = {
  source: string;
  language: string;
  level: LessonLevel;
  duration: 30 | 45 | 60 | 90;
  studentType: "individual" | "group";
  lessonStyle: LessonStyle;
  visualStyle: VisualStyle;
};

export type LessonSlide = {
  id: string;
  type: "cover" | "warmup" | "vocabulary" | "input" | "comprehension" | "discussion" | "grammar" | "practice" | "review" | "homework";
  title: string;
  body: string;
  teacherNote?: string;
};

export type LessonDraft = {
  id: string;
  title: string;
  level: LessonLevel;
  language: string;
  duration: number;
  objective: string;
  slides: LessonSlide[];
};

function cleanTopic(source: string) {
  const firstLine = source.trim().split(/\n+/)[0] ?? "Untitled lesson";
  return firstLine.replace(/^class about\s+/i, "").slice(0, 72);
}

export function buildLessonDraft(input: LessonRequest): LessonDraft {
  const topic = cleanTopic(input.source);
  const title = topic.charAt(0).toUpperCase() + topic.slice(1);
  const isGrammar = input.lessonStyle === "grammar";

  const slides: LessonSlide[] = [
    {
      id: "cover",
      type: "cover",
      title,
      body: `${input.level} ${input.language} lesson · ${input.duration} minutes`,
      teacherNote: "Introduce the objective and activate prior knowledge.",
    },
    {
      id: "warmup",
      type: "warmup",
      title: "Start with experience",
      body: `Ask three personal questions connected to ${topic}. Move from an easy fact to an opinion and then to a short story.`,
      teacherNote: "Do not correct every error. Collect two useful examples for later feedback.",
    },
    {
      id: "vocabulary",
      type: "vocabulary",
      title: "Language that unlocks the topic",
      body: `Teach six high-frequency expressions the learner needs to discuss ${topic}. Include one contrast, one opinion phrase and one natural connector.`,
      teacherNote: "Check meaning with examples, not translation alone.",
    },
    {
      id: "input",
      type: "input",
      title: "Notice it in context",
      body: `Present a short, natural text or transcript about ${topic}. Highlight the target expressions and keep the input appropriate for ${input.level}.`,
    },
    {
      id: "comprehension",
      type: "comprehension",
      title: "Understand before analyzing",
      body: "Use two gist questions, three detail questions and one inference question. Reveal answers progressively.",
    },
    {
      id: isGrammar ? "grammar" : "discussion",
      type: isGrammar ? "grammar" : "discussion",
      title: isGrammar ? "Microgrammar in action" : "Make it personal",
      body: isGrammar
        ? `Extract one grammar pattern from the context, explain the pattern briefly, then contrast correct and incorrect examples about ${topic}.`
        : `Use four escalating discussion prompts about ${topic}: preference, experience, disagreement and hypothetical choice.`,
    },
    {
      id: "practice",
      type: "practice",
      title: "Produce something real",
      body: `The learner completes a practical speaking or writing task using the new language. Provide a model, constraints and a visible success checklist.`,
    },
    {
      id: "review",
      type: "review",
      title: "Finish with proof of learning",
      body: "Ask the learner to recall three expressions, correct one sentence and answer the lesson objective in their own words.",
    },
    {
      id: "homework",
      type: "homework",
      title: "A five-minute follow-up",
      body: `Create one short task connected to ${topic} that recycles the lesson language without requiring another platform.`,
    },
  ];

  return {
    id: crypto.randomUUID(),
    title,
    level: input.level,
    language: input.language,
    duration: input.duration,
    objective: `By the end of the lesson, the learner can discuss ${topic} with level-appropriate vocabulary and clearer organization.`,
    slides,
  };
}
