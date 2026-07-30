import { normalizeActivityTiming, targetScreenCount } from "@/lib/lesson/duration";
import type { LessonRequest, LessonScreen, ScreenLayout, ScreenType, VocabularyItem } from "@/types/lesson";

const pair = (target: string, support: string) => `${target} || ${support}`;

function make(index: number, type: ScreenType, layout: ScreenLayout, title: string, instruction: string, options: Partial<LessonScreen> = {}): LessonScreen {
  return {
    id: `beginner-${index + 1}-${type}`,
    type,
    layout,
    title,
    instruction,
    body: options.body,
    prompts: (options.prompts ?? []).slice(0, 4),
    vocabulary: options.vocabulary ?? [],
    answers: options.answers ?? [],
    teacherNotes: options.teacherNotes ?? [],
    timing: options.timing ?? 4,
  };
}

const buenosAiresVocabulary: VocabularyItem[] = [
  { term: pair("interesante", "interesting"), meaning: "ADJETIVOS / ADJECTIVES", example: pair("Buenos Aires es interesante.", "Buenos Aires is interesting.") },
  { term: pair("tranquilo/a", "quiet / calm"), meaning: "ADJETIVOS / ADJECTIVES", example: pair("El barrio es tranquilo.", "The neighbourhood is quiet.") },
  { term: pair("el café", "the café"), meaning: "LUGARES / PLACES", example: pair("Hay un café cerca.", "There is a café nearby.") },
  { term: pair("la plaza", "the square"), meaning: "LUGARES / PLACES", example: pair("La plaza es grande.", "The square is big.") },
  { term: pair("el colectivo", "the bus"), meaning: "COSAS / THINGS", example: pair("Tomo el colectivo.", "I take the bus.") },
  { term: pair("la gente", "the people"), meaning: "PERSONAS / PEOPLE", example: pair("La gente es amable.", "The people are friendly.") },
];

const routineVocabulary: VocabularyItem[] = [
  { term: pair("la mañana", "the morning"), meaning: "MOMENTOS / TIMES", example: pair("Trabajo por la mañana.", "I work in the morning.") },
  { term: pair("el desayuno", "breakfast"), meaning: "COSAS / THINGS", example: pair("Preparo el desayuno.", "I make breakfast.") },
  { term: pair("temprano", "early"), meaning: "ADVERBIOS / ADVERBS", example: pair("Me levanto temprano.", "I get up early.") },
  { term: pair("en casa", "at home"), meaning: "LUGARES / PLACES", example: pair("Ceno en casa.", "I have dinner at home.") },
  { term: pair("ocupado/a", "busy"), meaning: "ADJETIVOS / ADJECTIVES", example: pair("Estoy ocupada hoy.", "I am busy today.") },
  { term: pair("la noche", "the evening / night"), meaning: "MOMENTOS / TIMES", example: pair("Estudio por la noche.", "I study at night.") },
];

export function buildBeginnerScreens(request: LessonRequest, topic: string) {
  const routine = /routine|rutina|daily|día/.test(`${topic} ${request.source}`.toLocaleLowerCase());
  const buenosAires = /buenos aires/i.test(`${topic} ${request.source}`);
  const family = /family|familia|relatives/.test(`${topic} ${request.source}`.toLocaleLowerCase());
  const title = routine ? "Mi rutina diaria" : buenosAires ? "Buenos Aires en Español" : topic;
  const familyVocabulary: VocabularyItem[] = [
    { term: pair("la madre", "the mother"), meaning: "PERSONAS / PEOPLE", example: pair("Mi madre es amable.", "My mother is kind.") },
    { term: pair("el padre", "the father"), meaning: "PERSONAS / PEOPLE", example: pair("Mi padre trabaja.", "My father works.") },
    { term: pair("la hermana", "the sister"), meaning: "PERSONAS / PEOPLE", example: pair("Tengo una hermana.", "I have one sister.") },
    { term: pair("el hermano", "the brother"), meaning: "PERSONAS / PEOPLE", example: pair("Mi hermano estudia.", "My brother studies.") },
    { term: pair("juntos", "together"), meaning: "PALABRAS / WORDS", example: pair("Comemos juntos.", "We eat together.") },
    { term: pair("la familia", "the family"), meaning: "TEMA / TOPIC", example: pair("Mi familia es pequeña.", "My family is small.") },
  ];
  const vocabulary = routine ? routineVocabulary : family ? familyVocabulary : buenosAiresVocabulary;
  const verbs = routine
    ? [pair("me levanto", "I get up"), pair("desayuno", "I have breakfast"), pair("trabajo / estudio", "I work / study"), pair("ceno", "I have dinner"), pair("duermo", "I sleep")]
    : [pair("vivir — vivo", "to live — I live"), pair("ir — voy", "to go — I go"), pair("tomar — tomo", "to take — I take"), pair("gustar — me gusta", "to like — I like"), pair("haber — hay", "there is / are")];
  const screens: LessonScreen[] = [];
  const add = (type: ScreenType, layout: ScreenLayout, screenTitle: string, instruction: string, options?: Partial<LessonScreen>) => {
    const anchoredInstruction = !buenosAires ? instruction.replace("||", `· Tema: ${topic}. ||`) : instruction;
    screens.push(make(screens.length, type, layout, screenTitle, anchoredInstruction, options));
  };

  add("cover", "topic-menu", title, pair("Elegí una palabra. Después, construí una frase.", "Choose a word. Then build a sentence."), {
    body: pair(routine ? "MAÑANA · TARDE · NOCHE" : family ? "PERSONAS · RUTINAS · JUNTOS" : "LUGARES · PERSONAS · COSAS", routine ? "MORNING · AFTERNOON · EVENING" : family ? "PEOPLE · ROUTINES · TOGETHER" : "PLACES · PEOPLE · THINGS"),
    prompts: [pair("Palabras", "Words"), pair("Verbos", "Verbs"), pair("Frases", "Sentences"), pair("Preguntas", "Questions")],
    teacherNotes: ["Goal: activate concrete language before asking the learner to speak."], timing: 2,
  });
  add("context", "image-topic", routine ? "Un día, paso a paso" : family ? "Mi familia" : "Una ciudad para mirar", pair("Mirá la ilustración. Nombrá tres cosas.", "Look at the illustration. Name three things."), {
    body: routine ? "☀️  07:00  →  ☕  →  💻  →  🍽️  →  🌙" : family ? "👩  👨  👧  👦  🏠" : "☀️  🏛️  ☕  🚌  🌳  👥",
    prompts: routine ? [pair("¿Qué hace por la mañana?", "What does the person do in the morning?")] : family ? [pair("¿Quién está en la familia?", "Who is in the family?")] : [pair("¿Qué hay en la ciudad?", "What is there in the city?")],
    answers: routine ? [pair("Por la mañana, desayuna.", "In the morning, the person has breakfast.")] : family ? [pair("Hay una madre, un padre, una hermana y un hermano.", "There is a mother, a father, a sister and a brother.")] : [pair("Hay una plaza, un café y un colectivo.", "There is a square, a café and a bus.")],
    teacherNotes: ["Bundled illustrated diagram is available. No external or generated image is claimed."],
  });
  add("vocabulary", "vocabulary-cards", family ? "Lenguaje útil: la familia" : "Palabras esenciales", pair("Leé, elegí cuatro y usalas.", "Read, choose four and use them."), {
    vocabulary, answers: vocabulary.map((item) => item.example), teacherNotes: ["Keep translations visible and examples short."],
  });
  add("vocabulary", "verb-bank", "Verbos para hablar", pair("Repetí la forma útil. Después, agregá una idea.", "Repeat the useful form. Then add one idea."), {
    prompts: verbs, answers: verbs, teacherNotes: ["Show only the person needed for the speaking task; avoid a full conjugation table."],
  });
  if (request.skillsFocus.includes("pronunciation") || request.includePronunciation || request.level === "A0") {
    add("pronunciation", "pronunciation", "Escuchá y repetí", pair("Marcá la sílaba fuerte y repetí la frase.", "Mark the stressed syllable and repeat the phrase."), {
      prompts: [pair("fa-MI-lia", "family"), pair("BUE-nos AI-res", "Buenos Aires")],
      answers: [pair("Hablá despacio y con vocales claras.", "Speak slowly with clear vowels.")],
    });
  }
  add("sentence-frames", "sentence-builder", "Frases para empezar", pair("Elegí un inicio y completá la frase.", "Choose a starter and complete the sentence."), {
    prompts: routine
      ? [pair("Por la mañana…", "In the morning…"), pair("Normalmente…", "Normally…"), pair("Después…", "Afterwards…"), pair("Por la noche…", "At night…")]
      : family
        ? [pair("En mi familia…", "In my family…"), pair("Mi madre…", "My mother…"), pair("Mi hermano…", "My brother…"), pair("Juntos…", "Together…")]
      : [pair("Para mí, Buenos Aires es…", "For me, Buenos Aires is…"), pair("En mi barrio hay…", "In my neighbourhood there is…"), pair("Me gusta…", "I like…"), pair("Quiero ir a…", "I want to go to…")],
    answers: [routine ? pair("Normalmente desayuno temprano.", "Normally I have breakfast early.") : pair("Para mí, Buenos Aires es interesante.", "For me, Buenos Aires is interesting.")],
  });
  add("sentence-frames", "connector-bank", "Conectores pequeños, ideas grandes", pair("Uní dos ideas.", "Connect two ideas."), {
    prompts: [pair("y", "and"), pair("pero", "but"), pair("porque", "because"), pair("también", "also")],
    answers: [routine ? pair("Trabajo por la mañana y estudio por la noche.", "I work in the morning and study at night.") : pair("Me gusta la ciudad porque hay muchos cafés.", "I like the city because there are many cafés.")],
  });
  add("personal-questions", "guided-questions", routine ? "Tu rutina" : family ? "Tu experiencia" : "Tu ciudad y Buenos Aires", pair("Respondé con una frase completa.", "Answer with one complete sentence."), {
    prompts: routine
      ? [pair("¿A qué hora te levantás?", "What time do you get up?"), pair("¿Dónde desayunás?", "Where do you have breakfast?"), pair("¿Qué hacés por la noche?", "What do you do at night?")]
      : family
        ? [pair("¿Tu familia es grande o pequeña?", "Is your family big or small?"), pair("¿Tenés hermanos?", "Do you have siblings?"), pair("¿Qué hacen juntos?", "What do you do together?")]
      : [pair("¿Dónde vivís?", "Where do you live?"), pair("¿Qué hay en tu barrio?", "What is in your neighbourhood?"), pair("¿Qué lugar te gusta?", "What place do you like?"), pair("¿Por qué?", "Why?")],
    answers: routine ? [pair("Me levanto a las siete.", "I get up at seven.")] : [pair("Vivo en una ciudad tranquila.", "I live in a quiet city.")],
    teacherNotes: ["Maximum four concrete questions. Accept a short complete answer."],
  });
  add("controlled-practice", "feedback", "Una frase completa", pair("Usá la fórmula y creá tu mejor frase.", "Use the formula and create your best sentence."), {
    body: pair("INICIO + VERBO + PALABRA + CONECTOR + IDEA", "STARTER + VERB + WORD + CONNECTOR + IDEA"),
    prompts: [routine ? pair("Normalmente + desayuno + temprano + porque + trabajo.", "Normally + I have breakfast + early + because + I work.") : pair("Para mí + Buenos Aires es + interesante + porque + hay muchos cafés.", "For me + Buenos Aires is + interesting + because + there are many cafés.")],
    answers: [routine ? pair("Normalmente desayuno temprano porque trabajo por la mañana.", "Normally I have breakfast early because I work in the morning.") : pair("Para mí, Buenos Aires es interesante porque hay muchos cafés.", "For me, Buenos Aires is interesting because there are many cafés.")],
    teacherNotes: ["Optional correction: recast only one high-value error after the learner finishes."],
  });
  add("review", "recap", "Repaso rápido", pair("Decí dos palabras, un verbo y una frase.", "Say two words, one verb and one sentence."), {
    prompts: [pair("2 palabras", "2 words"), pair("1 verbo", "1 verb"), pair("1 conector", "1 connector"), pair("1 frase completa", "1 complete sentence")],
    answers: [pair("La respuesta es personal.", "The answer is personal.")],
  });
  if (request.includeHomework) {
    add("homework", "homework", "Un minuto en casa", pair("Grabá o escribí cuatro frases simples.", "Record or write four simple sentences."), {
      prompts: routine ? [pair("Mi mañana", "My morning"), pair("Mi tarde", "My afternoon"), pair("Mi noche", "My evening")] : [pair("Mi ciudad", "My city"), pair("Un lugar", "One place"), pair("Por qué me gusta", "Why I like it")],
      answers: [pair("Usá un verbo y un conector en cada respuesta.", "Use one verb and one connector in each answer.")],
    });
  }

  const beforeKey = targetScreenCount(request.duration) - 1;
  let round = 1;
  while (screens.length < beforeKey) {
    add("controlled-practice", round % 2 ? "sentence-builder" : "guided-questions", `Práctica visual ${round}`, pair("Elegí una opción y creá una frase nueva.", "Choose one option and make a new sentence."), {
      prompts: vocabulary.slice(0, 3).map((item) => `${item.term} · ${round}`),
      answers: [vocabulary[(round - 1) % vocabulary.length].example],
      teacherNotes: ["Keep this practice concrete and bilingual."],
    });
    round += 1;
  }
  while (screens.length > beforeKey) screens.splice(Math.max(2, screens.length - 2), 1);
  add("answer-key", "recap", "Modelos", "Material para el tutor o docente.", {
    answers: screens.flatMap((item) => item.answers).slice(0, 16),
    teacherNotes: ["Hidden from student mode. Reveal only when useful."], timing: 1,
  });
  return normalizeActivityTiming(screens, request.duration);
}
