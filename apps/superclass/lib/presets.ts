import { defaultLessonRequest, type LessonRequest } from "@/types/lesson";

export type DemoPreset = { id: string; label: string; detail: string; request: LessonRequest };

export const demoPresets: DemoPreset[] = [
  {
    id: "a0-buenos-aires", label: "A0 Buenos Aires", detail: "Visual bilingual vocabulary and guided speaking",
    request: {
      ...defaultLessonRequest, source: "Buenos Aires en español: lugares, personas, cosas y adjetivos para hablar de la ciudad.",
      level: "A0", duration: 45, dialect: "rioplatense", languageMode: "bilingual",
      lessonFormat: "beginner-visual-vocabulary", practiceDensity: "repetition-heavy",
      learningGoal: "Describe a city with short complete sentences", visualStyle: "light-editorial",
    },
  },
  {
    id: "a1-routine", label: "A1 daily routine", detail: "Image-led everyday verbs and sentence building",
    request: {
      ...defaultLessonRequest, source: "Mi rutina diaria: la mañana, el trabajo, la comida y la noche.",
      level: "A1", duration: 45, languageMode: "bilingual", lessonFormat: "beginner-visual-vocabulary",
      learningGoal: "Describe a simple daily routine", visualStyle: "light-editorial",
    },
  },
  {
    id: "b1-ser-estar", label: "B1 ser / estar", detail: "Intermediate comparison, practice, correction and speaking",
    request: {
      ...defaultLessonRequest, source: "Una clase práctica de gramática sobre ser y estar.",
      level: "B1", duration: 50, languageMode: "smart", lessonFormat: "grammar-workshop",
      lessonFocus: "grammar-focused", learningGoal: "Choose ser or estar accurately in common situations", visualStyle: "light-editorial",
    },
  },
  {
    id: "b2-las-vegas", label: "B2 Las Vegas", detail: "Casino psychology, decision-making and discussion",
    request: {
      ...defaultLessonRequest, source: "Las Vegas, casino design, risk, reward and the psychology of gambling.",
      language: "en", supportLanguage: "es", level: "B2", duration: 60, languageMode: "target-only",
      lessonFormat: "debate-critical-thinking", lessonFocus: "conversation", learningGoal: "Discuss design, responsibility and risk with precision",
      visualStyle: "editorial",
    },
  },
  {
    id: "c1-ethical-debate", label: "C1 ethical debate", detail: "Competing claims, social pressure and a qualified conclusion",
    request: {
      ...defaultLessonRequest, source: "An ethical debate about persuasive technology, personal choice and social responsibility.",
      language: "en", supportLanguage: "es", level: "C1", duration: 60, languageMode: "target-only",
      lessonFormat: "debate-critical-thinking", learningGoal: "Defend a nuanced position and answer a serious counterargument",
      visualStyle: "dark-debate",
    },
  },
];
