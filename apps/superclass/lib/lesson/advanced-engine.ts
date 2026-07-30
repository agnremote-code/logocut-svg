import { normalizeActivityTiming, targetScreenCount } from "@/lib/lesson/duration";
import type { LessonArchetype, LessonRequest, LessonScreen, ScreenLayout, ScreenType, VocabularyItem } from "@/types/lesson";

function make(index: number, type: ScreenType, layout: ScreenLayout, title: string, instruction: string, options: Partial<LessonScreen> = {}): LessonScreen {
  return {
    id: `advanced-${index + 1}-${type}`, type, layout, title, instruction,
    body: options.body, prompts: (options.prompts ?? []).slice(0, 4), vocabulary: options.vocabulary ?? [],
    answers: options.answers ?? [], teacherNotes: options.teacherNotes ?? [], timing: options.timing ?? 4,
    sourceExcerpt: options.sourceExcerpt, videoId: options.videoId,
  };
}

export function buildAdvancedScreens(request: LessonRequest, topic: string, archetype: LessonArchetype) {
  const casino = /vegas|casino|gambl/.test(`${topic} ${request.source}`.toLocaleLowerCase());
  const ethical = /ethic|ethical|ética|dilemma|debate/.test(`${topic} ${request.source}`.toLocaleLowerCase());
  const generic = !casino && !ethical;
  const debate = archetype === "advanced-debate";
  const title = casino ? "Las Vegas: designed to keep you playing?" : ethical ? "The line we choose to draw" : topic;
  const vocabulary: VocabularyItem[] = (casino
    ? [["the house edge", "built-in mathematical advantage", "The house edge is small but persistent."], ["near miss", "an outcome that feels close to winning", "Near misses can intensify motivation."], ["frictionless", "requiring almost no effort", "Frictionless payment changes the sense of loss."], ["moral hazard", "risk encouraged by protection from consequences", "The design may create a moral hazard."]]
    : [["draw a distinction", "separate two ideas precisely", "We should draw a distinction between influence and coercion."], ["unintended consequence", "a result that was not planned", "The policy may create an unintended consequence."], ["underlying assumption", "an idea taken for granted", "That argument rests on an underlying assumption."], ["proportional", "appropriate in scale or degree", "The response should be proportional to the harm."]]
  ).map(([term, meaning, example]) => ({ term, meaning, example }));
  const screens: LessonScreen[] = [];
  const add = (type: ScreenType, layout: ScreenLayout, screenTitle: string, instruction: string, options?: Partial<LessonScreen>) =>
    screens.push(make(screens.length, type, layout, screenTitle, generic ? `${instruction} Focus: ${topic}.` : instruction, options));

  add("cover", "cover", title, debate ? "Observe the atmosphere. Name the tension before taking a position." : "Read the headline as an editor: what is being framed?", {
    body: casino ? "LIGHTS · RISK · REWARD · CONTROL" : "CHOICE · PRESSURE · RESPONSIBILITY · CONSEQUENCE",
    teacherNotes: ["Goal: sustain a nuanced position and respond to a serious counterargument."], timing: 2,
  });
  add("context", "illustrated-context", casino ? "The room has no clocks" : "A decision under pressure", "Use the visual system as evidence: what behaviour is it trying to produce?", {
    body: casino ? "◆ light  →  anticipation  →  near miss  →  another decision ◆" : "individual choice  ⇄  social pressure  ⇄  institutional power",
    prompts: ["What is your first impression?", "Which design choice matters most?", "Where does influence become manipulation?"],
    answers: ["A strong answer identifies a mechanism and qualifies the claim."],
    teacherNotes: ["Bundled editorial diagram is present; no external image is claimed."],
  });
  add("vocabulary", "vocabulary-cards", "Language for precision", "Use each expression to sharpen, not decorate, an argument.", {
    vocabulary, answers: vocabulary.map((item) => item.example),
  });
  add("discussion", "personal-prompts", "Opinion scale", "Choose a position from 1–5, then state the condition that could move you.", {
    prompts: [
      casino ? "Casinos sell entertainment, not false hope." : "Adults are fully responsible for choices made under persuasive design.",
      "Regulation should target design rather than individual behaviour.",
      "A legal choice can still be ethically unacceptable.",
    ],
    answers: ["State a position, a reason, a qualification and a possible exception."],
  });
  add("debate", "debate-cards", "Argument / counterargument", "Build the strongest version of both sides before choosing.", {
    prompts: [
      casino ? "People know the odds; the decision is theirs." : "Personal freedom requires room for difficult choices.",
      casino ? "The environment deliberately exploits predictable biases." : "Power imbalances can make formal consent insufficient.",
      "What evidence would each side accept?",
      "Which claim is easiest to overstate?",
    ],
    answers: ["A fair synthesis separates legal permission, informed consent and design responsibility."],
  });
  add("controlled-practice", "sorting", "Rank the pressures", "Rank by influence, then defend the top two.", {
    prompts: casino ? ["near misses", "social proof", "easy payment", "reward uncertainty"] : ["economic pressure", "group norms", "interface design", "authority"],
    answers: ["No single ranking is required; the justification must explain mechanism and degree."],
  });
  add("debate", "dialogue", "The ethical dilemma", "Respond as a regulator, a business owner and an affected individual.", {
    body: casino
      ? "A: The product is legal and profitable. B: The most profitable users are those losing control."
      : "A: The system increases participation. B: It also makes refusal more costly.",
    prompts: ["What should change?", "Who should bear the cost?", "What would a proportional rule look like?"],
    answers: ["The response should identify a threshold, a responsible actor and a foreseeable consequence."],
  });
  add("discussion", "personal-prompts", "A longer turn", "Speak for ninety seconds. Acknowledge the strongest objection.", {
    prompts: [`Where should society draw the line on ${casino ? "gambling design" : "persuasive systems"}?`, "Which principle matters most?", "What is the strongest opposing view?"],
    answers: ["Position → evidence or mechanism → counterargument → qualified conclusion."],
  });
  add("review", "recap", "Editorial conclusion", "Write a headline and a two-sentence standfirst that preserve the nuance.", {
    prompts: ["Headline", "Central tension", "Qualified conclusion"],
    answers: ["Avoid a sensational claim; make the competing values visible."],
  });
  if (request.includeHomework) {
    add("homework", "homework", "After class: a 180-word position", "Write for a skeptical reader and address one counterargument.", {
      prompts: ["State your threshold.", "Use three target expressions.", "Concede one reasonable point."],
      answers: ["Teacher check: clarity, evidence, qualification and register."],
    });
  }
  const beforeKey = targetScreenCount(request.duration) - 1;
  let round = 1;
  while (screens.length < beforeKey) {
    add(round % 2 ? "debate" : "discussion", round % 2 ? "debate-cards" : "personal-prompts", `Pressure test ${round}`, "Change one assumption and revise your position.", {
      prompts: [`What changes in round ${round} for ${topic}?`, `What remains true in round ${round}?`, `Which consequence becomes more likely in round ${round}?`],
      answers: ["Revision should respond to the changed assumption rather than repeat the original claim."],
    });
    round += 1;
  }
  while (screens.length > beforeKey) screens.splice(Math.max(2, screens.length - 2), 1);
  add("answer-key", "recap", "Models and evidence", "Private tutor and teacher reference.", {
    answers: screens.flatMap((item) => item.answers).slice(0, 16), teacherNotes: ["Hidden in student mode."], timing: 1,
  });
  return normalizeActivityTiming(screens, request.duration);
}
