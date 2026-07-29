import type { LessonProvider } from "@/lib/providers/types";
import { languageLabel } from "@/lib/lesson/language";
import { normalizeActivityTiming, targetScreenCount } from "@/lib/lesson/duration";
import { createLessonPlan } from "@/lib/lesson/planning";
import { buildSerEstarScreens } from "@/lib/lesson/ser-estar";
import { buildSpanishGrammarScreens } from "@/lib/lesson/spanish-grammar";
import { buildSpanishTopicScreens } from "@/lib/lesson/spanish-generic";
import { buildBeginnerScreens } from "@/lib/lesson/beginner-engine";
import { buildAdvancedScreens } from "@/lib/lesson/advanced-engine";
import { selectLessonArchetype } from "@/lib/lesson/archetypes";
import { extractYouTubeId } from "@/lib/validation/lesson";
import type { LessonDraft, LessonRequest, LessonScreen, ScreenLayout, ScreenType, VocabularyItem } from "@/types/lesson";

const levelGuidance = {
  A0: {
    signals: ["one instruction at a time", "full-sentence models", "high repetition"],
    objective: "answer simple questions with complete modelled sentences",
    promptLead: "Say the full sentence",
    support: "Model first. Point, repeat twice, then ask for one complete sentence.",
  },
  A1: {
    signals: ["controlled questions", "reusable sentence patterns", "guided speaking"],
    objective: "use practical phrases in a short guided exchange",
    promptLead: "Complete the sentence",
    support: "Offer a model, a word bank and ten seconds of planning time.",
  },
  A2: {
    signals: ["clear scaffolding", "practical vocabulary", "short speaking turns"],
    objective: "describe a familiar situation with connected simple sentences",
    promptLead: "Build a short answer",
    support: "Ask for two connected sentences and reformulate only after the learner finishes.",
  },
  B1: {
    signals: ["personal experience", "microgrammar in context", "longer speaking turns"],
    objective: "explain experiences and opinions with organized supporting detail",
    promptLead: "Explain and support",
    support: "Ask for a reason and example before offering correction.",
  },
  B2: {
    signals: ["authentic vocabulary", "reformulation", "extended production"],
    objective: "discuss the topic fluently and reformulate ideas with precision",
    promptLead: "Develop your position",
    support: "Push for precise verbs, natural connectors and a sixty-second response.",
  },
  C1: {
    signals: ["nuance", "competing perspectives", "advanced correction"],
    objective: "argue a nuanced position and respond to competing interpretations",
    promptLead: "Qualify your argument",
    support: "Challenge assumptions and save language feedback for the end of the turn.",
  },
  C2: {
    signals: ["ambiguity", "rhetorical language", "high-level synthesis"],
    objective: "navigate ambiguity and shape a rhetorically effective argument",
    promptLead: "Interrogate the premise",
    support: "Focus feedback on register, implication and rhetorical effect.",
  },
} as const;

const focusLabel = {
  conversation: "confident conversation",
  balanced: "integrated communication",
  "grammar-focused": "accurate grammar in context",
  "pronunciation-focused": "clear, confident pronunciation",
  "source-comprehension": "source comprehension and response",
} as const;

const vocabularyByContext: Record<string, string[]> = {
  travel: ["local insight", "get around", "worth the detour", "travel light", "hidden gem", "make the most of"],
  work: ["align on", "trade-off", "rollout", "stakeholder", "friction", "value proposition"],
  culture: ["sense of belonging", "adapt to", "unwritten rule", "culture shock", "fit in", "common ground"],
  family: ["get along", "look after", "take after", "close-knit", "family routine", "spend time together"],
  debate: ["draw a distinction", "underlying assumption", "unintended consequence", "counterargument", "nuanced", "evidence suggests"],
  default: ["key idea", "point of view", "make a connection", "in practice", "for example", "on the other hand"],
};

function clean(value: string, limit = 90) {
  const normalized = value.replace(/[#*_`>\[\]]/g, "").replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return normalized.slice(0, limit + 1).replace(/\s+\S*$/, "").trim();
}

function topicFrom(request: LessonRequest) {
  const material = request.sourceMode === "video" ? request.transcript : request.source;
  const first = material.split(/[.\n!?]/)[0] ?? "A practical language lesson";
  const topic = clean(
    first
      .replace(/^(a|an)\s+[A-C][0-2]\s+/i, "")
      .replace(/^(?:a|an)?\s*(?:(?:practical|conversation|language|travel)\s+)*(?:class|lesson)\s+(?:about|on)\s+/i, ""),
    84,
  );
  const repeated = request.recentTopics.some((item) => item.toLowerCase().includes(topic.toLowerCase()));
  return repeated && request.continueOrCorrect ? `${topic}: ${clean(request.continueOrCorrect, 48)}` : topic;
}

function contextKey(request: LessonRequest, topic: string) {
  const haystack = `${topic} ${request.interests} ${request.learningGoal}`.toLowerCase();
  if (/mental|social media|debate|society/.test(haystack)) return "debate";
  if (/fintech|technology|professional|work|finance|corporate/.test(haystack)) return "work";
  if (/argentina|travel|trip|tour/.test(haystack)) return "travel";
  if (/family/.test(haystack)) return "family";
  if (/culture|abroad|language|history|art/.test(haystack)) return "culture";
  return "default";
}

function vocabulary(topic: string, key: string, recent: string[] = []): VocabularyItem[] {
  const blocked = new Set(recent.map((item) => item.toLowerCase()));
  const source = vocabularyByContext[key] ?? vocabularyByContext.default;
  const ordered = [...source.filter((item) => !blocked.has(item.toLowerCase())), ...source.filter((item) => blocked.has(item.toLowerCase()))];
  return ordered.slice(0, 6).map((term, index) => ({
    term,
    meaning: `Useful language for idea ${index + 1} in this ${key === "default" ? "topic" : key} context.`,
    example: clean(`Use "${term}" to make a natural point about ${topic}.`, 120),
  }));
}

function screen(
  index: number,
  type: ScreenType,
  title: string,
  instruction: string,
  options: Partial<Omit<LessonScreen, "id" | "type" | "title" | "instruction">> = {},
): LessonScreen {
  const layoutByType: Partial<Record<ScreenType, ScreenLayout>> = {
    cover: "cover", objective: "objective", vocabulary: "vocabulary-cards", pronunciation: "pronunciation",
    microgrammar: "rule-cards", "sentence-frames": "sentence-builder", "controlled-practice": "multiple-choice",
    "error-correction": "error-correction", "personal-questions": "personal-prompts", discussion: "dialogue",
    debate: "debate-cards", review: "recap", "exit-task": "recap", homework: "homework", context: "illustrated-context",
    source: "example-gallery", video: "illustrated-context", comprehension: "multiple-choice", "answer-key": "recap", warmup: "personal-prompts",
  };
  return {
    id: `screen-${index + 1}-${type}`,
    type,
    title: clean(title, type === "cover" ? 90 : 64),
    instruction: clean(instruction, 150),
    body: options.body ? clean(options.body, 340) : undefined,
    prompts: (options.prompts ?? []).slice(0, 4).map((item) => clean(item, 150)),
    vocabulary: options.vocabulary ?? [],
    answers: (options.answers ?? []).map((item) => clean(item, 180)),
    teacherNotes: (options.teacherNotes ?? []).map((item) => clean(item, 220)),
    timing: options.timing ?? 3,
    layout: options.layout ?? layoutByType[type] ?? "example-gallery",
    sourceExcerpt: options.sourceExcerpt ? clean(options.sourceExcerpt, 320) : undefined,
    videoId: options.videoId,
  };
}

function profileSummary(request: LessonRequest) {
  const details = [
    `${request.age || "Learner"} · ${request.studentType}`,
    request.interests && `interests: ${clean(request.interests, 90)}`,
    request.strengths && `strength: ${clean(request.strengths, 80)}`,
    request.difficulties && `focus: ${clean(request.difficulties, 90)}`,
  ].filter(Boolean);
  return details.join(" · ");
}

function lessonTitle(request: LessonRequest, topic: string, specializedTemplate?: string) {
  const material = `${topic} ${request.source}`.toLocaleLowerCase();
  if (specializedTemplate === "ser-estar") return "SER vs ESTAR";
  if (/buenos aires/.test(material)) return "Buenos Aires en Español";
  if (/routine|rutina diaria/.test(material)) return "Mi rutina diaria";
  if (/las vegas|casino|gambl/.test(material)) return "Las Vegas: Risk by Design";
  if (/ethical|ética|dilemma/.test(material)) return "Where Should We Draw the Line?";
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}

function buildScreens(request: LessonRequest, topic: string) {
  const plan = createLessonPlan(request);
  const archetype = selectLessonArchetype(request);
  if (plan.specializedTemplate === "ser-estar" && request.language === "es") return buildSerEstarScreens(request);
  if (archetype.engine === "beginner") return buildBeginnerScreens(request, topic);
  if (plan.specializedTemplate && request.language === "es" && request.sourceMode === "idea") return buildSpanishGrammarScreens(request, plan);
  if (archetype.engine === "advanced" && request.sourceMode === "idea" && request.language !== "es") return buildAdvancedScreens(request, topic, archetype.id);
  if (request.language === "es") return buildSpanishTopicScreens(request, topic, extractYouTubeId(request.videoUrl) ?? undefined);
  const guidance = levelGuidance[request.level];
  const key = contextKey(request, topic);
  const vocab = vocabulary(topic, key, request.recentVocabulary);
  const sourceText = request.sourceMode === "video" ? request.transcript : request.source;
  const sourceExcerpt = request.sourceMode === "idea" ? undefined : sourceText.slice(0, 320);
  const screens: LessonScreen[] = [];
  const add = (type: ScreenType, title: string, instruction: string, options?: Parameters<typeof screen>[4]) => {
    screens.push(screen(screens.length, type, title, instruction, options));
  };

  add("cover", topic, `${request.level} ${request.language} · ${request.duration} minutes · ${focusLabel[request.lessonFocus]}`, {
    body: request.learningGoal || guidance.objective,
    timing: 1,
    teacherNotes: ["Welcome the learner and state one concrete success target."],
  });
  add("objective", "Today you will be able to…", "Read the goal aloud, then make it personal.", {
    prompts: [`I can ${guidance.objective}.`, `My personal goal is to ${clean(request.learningGoal || "speak with more confidence", 90)}.`],
    answers: [`Success means the learner can ${guidance.objective}.`],
    teacherNotes: [guidance.support],
    timing: 2,
  });
  add("warmup", request.level === "A0" ? "Start with what you know" : "Make the topic yours", guidance.promptLead, {
    prompts:
      request.level === "A0"
        ? [`I know __ about ${topic}.`, `I like __ because __.`, `For me, ${topic} is __.`]
        : [`What is your first association with ${topic}?`, `When has this topic affected you personally?`, `What would you like to express more clearly today?`],
    teacherNotes: [guidance.support, request.difficulties ? `Listen for: ${request.difficulties}.` : "Collect one useful correction for later."],
    timing: request.includeSmallTalk ? 12 : 5,
  });
  add("context", key === "work" ? "The real workplace situation" : key === "travel" ? "The situation on the ground" : "A real-life situation", "Notice who is speaking, what they need and what could go wrong.", {
    body: clean(`Imagine a realistic ${request.studentType === "group" ? "group" : "one-to-one"} situation involving ${topic}. The speaker must choose clear, level-appropriate language and respond naturally.`, 300),
    prompts: [`What does the speaker need to achieve?`, `What language will make the exchange easier?`],
    timing: 3,
  });

  if (request.sourceMode === "video") {
    add("video", "Watch with a purpose", "Watch once for the main idea. Use the supplied transcript for support.", {
      prompts: ["What is the speaker’s main message?", "Which phrase carries the strongest meaning?"],
      sourceExcerpt,
      videoId: extractYouTubeId(request.videoUrl) ?? undefined,
      teacherNotes: ["Questions use only the imported or teacher-edited transcript supplied with this request."],
      timing: 6,
    });
  } else if (request.sourceMode === "text") {
    add("source", "Read for meaning", "Read once without stopping. Then mark the sentence that matters most.", {
      sourceExcerpt,
      prompts: ["What is the central idea?", "Which detail best supports it?", "What remains unclear?"],
      answers: ["Accept answers supported by the displayed source excerpt."],
      teacherNotes: ["Ask the learner to point to source evidence before discussing opinions."],
      timing: 6,
    });
  }

  if (request.sourceMode !== "idea" || request.lessonFocus === "source-comprehension") {
    add("comprehension", "Check the source, not your memory", "Answer with evidence from the source.", {
      prompts: ["What happened or was argued first?", "Which detail changes the meaning?", "What can we infer without inventing information?"],
      answers: sourceExcerpt ? [`Evidence must come from: “${clean(sourceExcerpt, 140)}…”`] : ["Use only the source supplied by the teacher."],
      teacherNotes: ["Separate source answers from open discussion."],
      timing: 5,
    });
  }

  add("vocabulary", "Language that unlocks the topic", "Choose three expressions. Say each one in a new sentence.", {
    vocabulary: vocab,
    answers: vocab.map((item) => item.example),
    teacherNotes: [`Prioritize vocabulary connected to ${request.interests || topic}.`, "Correct collocation before minor pronunciation."],
    timing: 6,
  });

  if (request.includePronunciation || request.skillsFocus.includes("pronunciation") || request.lessonFocus === "pronunciation-focused" || request.level === "A0") {
    const pronunciationTarget = /rolled r|vowel|pronunciation/i.test(request.difficulties)
      ? clean(request.difficulties, 70)
      : request.dialect === "rioplatense"
        ? "Rioplatense rhythm and the y/ll sound"
        : "word stress and clear vowel sounds";
    add("pronunciation", "Make the key phrase easy to hear", "Listen, mark the stress, then repeat from slow to natural speed.", {
      body: `Focus: ${pronunciationTarget}.`,
      prompts: [`Say “${vocab[0]?.term}” slowly, then naturally.`, `Use “${vocab[1]?.term}” in one complete sentence.`],
      answers: ["Clear rhythm and intelligibility matter more than imitating an accent."],
      teacherNotes: ["Model once. Use backchaining only if the learner needs it."],
      timing: 4,
    });
  }

  if (request.level === "A0" || request.level === "A1" || request.level === "A2") {
    add("sentence-frames", "Build a complete answer", "Choose a frame. Replace the blanks. Say the whole sentence.", {
      prompts: [`I think __ because __.`, `In my experience, __.`, `I want to __, but __.`],
      answers: [`I think ${topic} is important because it affects daily life.`],
      teacherNotes: ["Keep the frame visible during speaking. Remove one support at a time."],
      timing: 5,
    });
  }

  if (request.skillsFocus.includes("grammar") || request.lessonFocus === "grammar-focused" || /conjugation|grammar|tense/i.test(request.difficulties)) {
    add("microgrammar", "One pattern you can use today", "Notice the pattern, choose the form, then use it about your life.", {
      body: request.level <= "A2" ? "Model: I usually… / Yesterday I… / Next time I will…" : "Use a contrast connector to organize a nuanced answer: although…, whereas…, even though…",
      prompts: [`Complete one accurate sentence about ${topic}.`, "Change the time or point of view without changing the meaning."],
      answers: ["Answers vary; preserve meaning and check the target form in context."],
      teacherNotes: [request.difficulties ? `Target the reported difficulty: ${request.difficulties}.` : "Keep explanation under ninety seconds."],
      timing: 5,
    });
  }

  add("controlled-practice", "Try it with support", "Use the vocabulary and the visible success checklist.", {
    prompts: [`Give a ${request.level <= "A2" ? "two-sentence" : "forty-five-second"} answer about ${topic}.`, `Use “${vocab[0]?.term}” and one connector.`, "Listen to your answer and improve one detail."],
    answers: ["A successful answer is complete, relevant and uses at least one target expression."],
    teacherNotes: [guidance.support],
    timing: 6,
  });
  if (request.includeCorrection) {
    add("error-correction", "Repair the message", "Choose the best correction and explain what changed.", {
      prompts: [`Correct: “I am agree about ${topic}.”`, `Improve: “It is good.”`, `Reformulate one sentence from your first answer.`],
      answers: [`“I agree about…” or “I agree that…”`, `Replace “good” with a precise idea and reason.`],
      teacherNotes: ["Use errors typical of the selected level; do not invent errors attributed to a real student."],
      timing: 4,
    });
  }
  add("personal-questions", "Make the language personal", guidance.promptLead, {
    prompts: [`How does ${topic} connect to your own life?`, `What has changed your view of it?`, `What would you do differently next time?`],
    teacherNotes: [request.interests ? `Connect follow-up questions naturally to ${request.interests}.` : guidance.support],
    timing: 6,
  });

  if (request.includeRoleplay) {
    add("controlled-practice", "Optional roleplay", "Choose a role, a goal and one phrase you must use.", {
      body: key === "work" ? "One person proposes a change; the other questions risk, timing and value." : `Create a realistic exchange connected to ${topic}.`,
      prompts: ["What do you need from the other person?", "Which target phrase will help you get it?"],
      answers: ["Roleplay is successful when both speakers reach a clear outcome."],
      teacherNotes: ["Roleplay was deliberately enabled by the teacher."],
      timing: 7,
    });
  }

  if (request.level === "C1" || request.level === "C2" || key === "debate") {
    add("debate", "Test the strongest argument", "Take a position, qualify it, then answer the best counterargument.", {
      prompts: [`Which common claim about ${topic} is too simplistic?`, "What evidence would change your mind?", "Where should we draw the line?", "What is the strongest opposing view?"],
      answers: ["Strong answers acknowledge uncertainty, define terms and address a counterargument."],
      teacherNotes: ["Do not reward complexity without clarity. Track register and rhetorical effect."],
      timing: 8,
    });
  } else {
    add("discussion", "Speak beyond the model", "Build a clear answer, add a reason, then invite a response.", {
      prompts: [`What is one benefit and one difficulty connected to ${topic}?`, "Which option would you choose and why?", "What advice would you give someone in this situation?"],
      teacherNotes: ["Delay correction until the learner completes the idea."],
      timing: 8,
    });
  }

  add("review", "Prove what you can do now", "Recall, use and improve.", {
    prompts: ["Recall three target expressions without looking.", `Give a stronger answer about ${topic}.`, "Name one correction you will remember."],
    answers: vocab.slice(0, 3).map((item) => item.term),
    teacherNotes: ["Compare the final answer with the warm-up, not with native-speaker perfection."],
    timing: 4,
  });
  add("exit-task", "Your sixty-second finish", "Speak without interruption, then check the success criteria.", {
    prompts: [`Explain your view of ${topic}.`, "Use two target expressions.", "Add one precise example."],
    answers: ["Complete idea · clear organization · target language · understandable delivery"],
    teacherNotes: ["Record one next-step priority and one specific success."],
    timing: 4,
  });
  if (request.includeHomework) {
    add("homework", "A useful ten-minute follow-up", "Create something you could use outside class.", {
      prompts: [`Write or record a response about ${topic}.`, "Use four target expressions.", "Underline one sentence you improved."],
      answers: ["Teacher version: check completion, target-language use and one self-correction."],
      teacherNotes: ["Keep homework independent of paid platforms."],
      timing: 2,
    });
  }

  const target = targetScreenCount(request.duration);
  const protectedTypes: ScreenType[] = ["cover", "objective", "warmup", "vocabulary", "discussion", "debate", "review", "exit-task"];
  while (screens.length > target - 1) {
    const removable = screens.findIndex((item, index) => index > 2 && !protectedTypes.includes(item.type));
    if (removable === -1) break;
    screens.splice(removable, 1);
  }
  let practiceNumber = 1;
  while (screens.length < target - 1) {
    add("controlled-practice", `Practice round ${practiceNumber}`, request.practiceDensity === "repetition-heavy" ? "Repeat the pattern with one new detail." : "Apply the language in a fresh situation.", {
      prompts: [
        `${guidance.promptLead}: connect ${topic} to scenario ${practiceNumber}.`,
        `In round ${practiceNumber}, use target expression ${((practiceNumber - 1) % vocab.length) + 1} in a complete response.`,
      ],
      answers: ["Answers vary; check relevance, target language and level-appropriate complexity."],
      teacherNotes: [guidance.support],
      timing: request.practiceDensity === "compact" ? 3 : 4,
    });
    practiceNumber += 1;
  }
  add("answer-key", "Teacher answer key", "Reveal after the learner has committed to an answer.", {
    body: "Suggested answers support teaching judgment; they are not the only acceptable responses.",
    answers: [
      `Target language: ${vocab.slice(0, 4).map((item) => item.term).join(", ")}.`,
      `Level check: ${guidance.signals.join(", ")}.`,
      "Source questions must be justified using the supplied source excerpt.",
    ],
    teacherNotes: ["Private teaching material. Hidden in student mode and classroom mode until revealed."],
    timing: 1,
  });

  return normalizeActivityTiming(screens, request.duration);
}

export const deterministicProvider: LessonProvider<LessonDraft> = {
  name: "deterministic-local",
  async generate(request, context) {
    const topic = topicFrom(request);
    const plan = createLessonPlan(request);
    const archetype = selectLessonArchetype(request);
    const guidance = levelGuidance[request.level];
    const dialect = request.dialect === "custom" ? request.customDialect || "Custom" : request.dialect;
    return {
      schemaVersion: 1,
      id: `lesson-${context.contentHash}`,
      requestId: context.requestId,
      contentHash: context.contentHash,
      title: lessonTitle(request, topic, plan.specializedTemplate),
      dialect,
      level: request.level,
      duration: request.duration,
      visualStyle: request.visualStyle,
      archetype: archetype.id,
      studentProfile: profileSummary(request),
      objectives: plan.specializedTemplate === "ser-estar" ? [
        "Elegir ser o estar en situaciones comunes.",
        "Usar ser para identidad, origen, profesión y características.",
        "Usar estar para ubicación, emociones y condiciones actuales.",
      ] : [
        `Use level-appropriate language to ${guidance.objective}.`,
        `Apply vocabulary and skills connected to ${topic}.`,
        request.learningGoal ? `Personal goal: ${clean(request.learningGoal, 130)}.` : "Finish with a clear, independent response.",
      ],
      language: languageLabel(request.language, request.customLanguage),
      screens: buildScreens(request, topic),
      sourceMode: request.sourceMode,
      createdAt: new Date(0).toISOString(),
      suggestedNextLesson: `Build on today’s corrections with a new real-life situation connected to ${topic}.`,
      levelSignals: [...guidance.signals],
      profileId: request.profileId || undefined,
    } satisfies LessonDraft;
  },
  async regenerateScreen(lesson, screenId) {
    return {
      ...lesson,
      screens: lesson.screens.map((screen) =>
        screen.id === screenId ? { ...screen, instruction: `${screen.instruction} Try one fresh example.` } : screen,
      ),
    };
  },
};
