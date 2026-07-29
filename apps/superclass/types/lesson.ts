export const lessonLevels = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const lessonDurations = [25, 30, 45, 50, 60, 90] as const;
export const sourceModes = ["idea", "text", "video"] as const;
export const lessonFocuses = ["conversation", "balanced", "grammar-focused", "pronunciation-focused", "source-comprehension"] as const;
export const visualStyles = ["retro-game", "clean-classroom", "editorial", "dark-debate", "travel", "corporate"] as const;
export const skills = ["speaking", "listening", "pronunciation", "vocabulary", "grammar", "reading"] as const;

export type LessonLevel = (typeof lessonLevels)[number];
export type LessonDuration = number;
export type SourceMode = (typeof sourceModes)[number];
export type LessonFocus = (typeof lessonFocuses)[number];
export type VisualStyle = (typeof visualStyles)[number];
export type SkillFocus = (typeof skills)[number];
export type StudentType = "individual" | "group";
export type PracticeDensity = "compact" | "standard" | "repetition-heavy";
export type Dialect = "neutral" | "rioplatense" | "spain" | "mexican" | "custom";

export type LessonRequest = {
  profileId: string;
  sourceMode: SourceMode;
  source: string;
  videoUrl: string;
  transcript: string;
  language: string;
  dialect: Dialect;
  customDialect: string;
  level: LessonLevel;
  duration: LessonDuration;
  studentType: StudentType;
  age: string;
  interests: string;
  learningGoal: string;
  strengths: string;
  difficulties: string;
  skillsFocus: SkillFocus[];
  lessonFocus: LessonFocus;
  practiceDensity: PracticeDensity;
  visualStyle: VisualStyle;
  includeHomework: boolean;
  includeRoleplay: boolean;
  includeSmallTalk: boolean;
  includeCorrection: boolean;
  includePronunciation: boolean;
  lastClassCovered: string;
  continueOrCorrect: string;
  recentTopics: string[];
  recentVocabulary: string[];
};

export type StudentProfile = {
  schemaVersion: 1;
  id: string;
  nickname: string;
  targetLanguage: string;
  dialect: Dialect;
  customDialect: string;
  level: LessonLevel;
  ageGroup: string;
  interests: string;
  profession: string;
  goals: string;
  strengths: string;
  difficulties: string;
  pronunciationTargets: string;
  grammarTargets: string;
  preferredVisualStyle: VisualStyle;
  preferredPracticeDensity: PracticeDensity;
  topicsUsed: string[];
  vocabularyStudied: string[];
  teacherNotes: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PostClassSummary = {
  classSummary: string;
  correctedSentences: string[];
  vocabularyStudied: string[];
  grammarStudied: string;
  pronunciationTarget: string;
  homework: string;
  suggestedNextClass: string;
  studentMessage: string;
};

export type ScreenType =
  | "cover"
  | "objective"
  | "warmup"
  | "context"
  | "source"
  | "video"
  | "comprehension"
  | "vocabulary"
  | "pronunciation"
  | "sentence-frames"
  | "microgrammar"
  | "controlled-practice"
  | "error-correction"
  | "personal-questions"
  | "discussion"
  | "debate"
  | "review"
  | "exit-task"
  | "homework"
  | "answer-key";

export type VocabularyItem = {
  term: string;
  meaning: string;
  example: string;
};

export type LessonScreen = {
  id: string;
  type: ScreenType;
  title: string;
  instruction: string;
  body?: string;
  prompts: string[];
  vocabulary: VocabularyItem[];
  answers: string[];
  teacherNotes: string[];
  timing: number;
  sourceExcerpt?: string;
  videoId?: string;
};

export type LessonDraft = {
  schemaVersion: 1;
  id: string;
  requestId: string;
  contentHash: string;
  title: string;
  language: string;
  dialect: string;
  level: LessonLevel;
  duration: LessonDuration;
  visualStyle: VisualStyle;
  studentProfile: string;
  objectives: string[];
  screens: LessonScreen[];
  sourceMode: SourceMode;
  createdAt: string;
  suggestedNextLesson: string;
  levelSignals: string[];
  profileId?: string;
};

export const defaultLessonRequest: LessonRequest = {
  profileId: "",
  sourceMode: "idea",
  source: "A B1 conversation class about living abroad and adapting to a new culture.",
  videoUrl: "",
  transcript: "",
  language: "Spanish",
  dialect: "neutral",
  customDialect: "",
  level: "B1",
  duration: 60,
  studentType: "individual",
  age: "Adult",
  interests: "travel, languages and culture",
  learningGoal: "Speak with more confidence and organize longer answers",
  strengths: "Listening comprehension",
  difficulties: "Speaking spontaneously and verb conjugation",
  skillsFocus: ["speaking", "vocabulary", "grammar"],
  lessonFocus: "balanced",
  practiceDensity: "standard",
  visualStyle: "retro-game",
  includeHomework: true,
  includeRoleplay: false,
  includeSmallTalk: true,
  includeCorrection: true,
  includePronunciation: false,
  lastClassCovered: "",
  continueOrCorrect: "",
  recentTopics: [],
  recentVocabulary: [],
};
