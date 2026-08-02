import { normalizeActivityTiming } from "@/lib/lesson/duration";
import { effectiveLanguageMode } from "@/lib/lesson/language";
import type { LessonRequest, LessonScreen, ScreenLayout, ScreenType } from "@/types/lesson";

function make(
  index: number,
  type: ScreenType,
  layout: ScreenLayout,
  title: string,
  instruction: string,
  options: Partial<Omit<LessonScreen, "id" | "type" | "layout" | "title" | "instruction">> = {},
): LessonScreen {
  return {
    id: `ser-estar-${index + 1}-${type}`,
    type,
    layout,
    title,
    instruction,
    body: options.body,
    prompts: options.prompts ?? [],
    vocabulary: options.vocabulary ?? [],
    answers: options.answers ?? [],
    teacherNotes: options.teacherNotes ?? [],
    timing: options.timing ?? 4,
    sourceExcerpt: options.sourceExcerpt,
    videoId: options.videoId,
  };
}

export function buildSerEstarScreens(request: LessonRequest) {
  const bilingual = ["bilingual", "support-heavy"].includes(effectiveLanguageMode(request));
  const support = (spanish: string, english: string) => bilingual ? `${spanish} || ${english}` : spanish;
  const beginner = request.level === "A0" || request.level === "A1";
  const screens: LessonScreen[] = [];
  const add = (type: ScreenType, layout: ScreenLayout, title: string, instruction: string, options?: Parameters<typeof make>[5]) =>
    screens.push(make(screens.length, type, layout, title, instruction, options));

  add("cover", "cover", "SER y ESTAR", support("Dos verbos. Dos trabajos. Una elección clara.", "Two verbs. Two jobs. One clear choice."), {
    body: support("QUIÉN ES · DE DÓNDE ES  /  DÓNDE ESTÁ · CÓMO ESTÁ", "WHO SOMEONE IS · WHERE THEY ARE FROM  /  WHERE THEY ARE · HOW THEY FEEL"),
    teacherNotes: ["Open on the designed meaning-map cover. Do not preview lesson modules."],
    timing: 2,
  });
  add("objective", "objective", "Meta de hoy", support("Vas a elegir el verbo por su significado.", "You will choose the verb from its meaning."), {
    prompts: [support("SER: identidad y origen", "SER: identity and origin"), support("ESTAR: lugar y estado", "ESTAR: location and state")],
    answers: ["The learner identifies the meaning before choosing the verb."],
    teacherNotes: ["Keep the objective visible for under one minute."],
    timing: 3,
  });
  add("microgrammar", "comparison", "Dos verbos, dos funciones", support("Mirá el mapa. Después, decí una diferencia.", "Look at the map. Then say one difference."), {
    body: "SER → identidad, origen, profesión. ESTAR → ubicación, emoción, condición.",
    prompts: [support("SER responde: ¿quién es?", "SER answers: who is it?"), support("ESTAR responde: ¿dónde o cómo está?", "ESTAR answers: where or how is it?")],
    answers: ["SER: identity/origin/profession. ESTAR: location/emotion/condition."],
    teacherNotes: ["Avoid the inaccurate permanent-versus-temporary shortcut."],
    timing: 5,
  });
  add("microgrammar", "example-gallery", "Personas y lugares con SER", support("Conectá cada persona o lugar con identidad u origen.", "Connect each person or place with identity or origin."), {
    prompts: [
      support("Ana es médica.", "Ana is a doctor."),
      support("Mateo es de Chile.", "Mateo is from Chile."),
      support("Buenos Aires es una ciudad grande.", "Buenos Aires is a large city."),
      support("Ellos son estudiantes.", "They are students."),
    ],
    answers: ["profesión", "origen", "identidad", "identidad"],
    teacherNotes: ["Use the people-and-place composition to make meaning visible."],
    timing: 5,
  });
  add("microgrammar", "illustrated-context", "Personas y lugares con ESTAR", support("Relacioná cada escena con lugar, emoción o condición.", "Match each scene with location, emotion or condition."), {
    body: "📍 plaza · 🙂 tranquila · 🚪 abierta · 🏠 en casa",
    prompts: [
      support("Ana está en la plaza.", "Ana is in the square."),
      support("Mateo está contento.", "Mateo is happy."),
      support("La puerta está abierta.", "The door is open."),
      support("Ellos están en casa.", "They are at home."),
    ],
    answers: ["ubicación", "emoción", "condición", "ubicación"],
    teacherNotes: ["Treat the designed SVG scene as a meaning cue, not decoration."],
    timing: 5,
  });
  add("controlled-practice", "multiple-choice", "¿SER o ESTAR?", support("Elegí el verbo. Después, nombrá el significado.", "Choose the verb. Then name the meaning."), {
    prompts: ["Mi hermana ___ profesora.", "Nosotros ___ en clase.", "Yo ___ de México.", "La ventana ___ abierta."],
    answers: ["es — profesión", "estamos — ubicación", "soy — origen", "está — condición"],
    teacherNotes: ["Reveal only after the learner commits to all four."],
    timing: 5,
  });
  add("controlled-practice", "sorting", "Uní ejemplo y significado", support("Llevá cada ejemplo a la categoría correcta.", "Match each example to the correct meaning."), {
    prompts: ["Soy estudiante.", "Estoy en Seúl.", "Somos de Argentina.", "Está cansada."],
    answers: ["identidad", "ubicación", "origen", "estado"],
    teacherNotes: ["Ask for one new example after sorting."],
    timing: 5,
  });
  add("controlled-practice", "fill-gap", "Completá frases cortas", support("Escribí la forma correcta de ser o estar.", "Write the correct form of ser or estar."), {
    prompts: ["Yo ___ de Corea.", "Mi amiga ___ en Madrid.", "Nosotros ___ estudiantes.", "¿Cómo ___ vos hoy?"],
    answers: ["soy", "está", "somos", "estás"],
    teacherNotes: ["Check meaning first, then subject agreement."],
    timing: 5,
  });
  add("error-correction", "error-correction", "Corregí cuatro errores", support("Cambiá el verbo y explicá la razón.", "Change the verb and explain why."), {
    prompts: ["Soy cansado hoy.", "Madrid es en España.", "Mi madre está arquitecta.", "Las llaves son en la mesa."],
    answers: ["Estoy cansado hoy.", "Madrid está en España.", "Mi madre es arquitecta.", "Las llaves están en la mesa."],
    teacherNotes: ["Correct the concept before any smaller language issue."],
    timing: 5,
  });
  add("controlled-practice", "sentence-builder", "Construí frases personales", support("Elegí piezas y creá cuatro frases verdaderas.", "Choose the pieces and build four true sentences."), {
    body: "YO / MI FAMILIA / MI CIUDAD + SER / ESTAR + IDENTIDAD / ORIGEN / LUGAR / ESTADO",
    prompts: [
      support("Yo soy…", "I am…"),
      support("Yo estoy…", "I am / I feel…"),
      support("Mi familia es de…", "My family is from…"),
      support("Mi ciudad está…", "My city is located…"),
    ],
    answers: ["Answers vary; require one accurate meaning category per sentence."],
    teacherNotes: ["Model only the first sentence; let the learner build the rest."],
    timing: 6,
  });
  add("personal-questions", "guided-questions", "Ahora hablá de vos", support("Respondé con una frase completa y un detalle.", "Answer with a complete sentence and one detail."), {
    prompts: ["¿De dónde sos?", "¿Cuál es tu profesión?", "¿Dónde estás ahora?", "¿Cómo estás hoy?"],
    answers: ["Answers vary; each response must use the meaning-appropriate verb."],
    teacherNotes: ["Delay correction until the learner completes the idea."],
    timing: 6,
  });

  if (!beginner) {
    add("discussion", "dialogue", "Una conversación real", support("Completá y representá el diálogo.", "Complete and perform the dialogue."), {
      body: "A: ¿Quién ___ la nueva profesora? B: ___ Ana. ___ de Perú. A: ¿Dónde ___ ahora? B: ___ en el aula.",
      prompts: ["Completá los cinco espacios.", "Representá el diálogo.", "Cambiá la profesión y el lugar."],
      answers: ["es", "Es", "Es", "está", "Está"],
      teacherNotes: ["Repeat once with new personal details."],
      timing: 5,
    });
  }

  add("review", "recap", "Repaso en 30 segundos", support("Mirá la pista y decí SER o ESTAR.", "Look at the cue and say SER or ESTAR."), {
    prompts: ["identidad", "ubicación", "origen", "emoción"],
    answers: ["SER", "ESTAR", "SER", "ESTAR"],
    teacherNotes: ["Finish with fast retrieval and one learner-made example."],
    timing: 3,
  });
  if (request.includeHomework) {
    add("homework", "homework", "Tarea: mi mundo", support("Escribí seis frases y marcá el significado.", "Write six sentences and label the meaning."), {
      prompts: ["2 frases con SER", "2 frases con ESTAR", "2 frases sobre personas o lugares"],
      answers: ["Teacher check: verb choice, agreement and meaning label."],
      teacherNotes: ["Keep the task short enough to complete independently."],
      timing: 2,
    });
  }
  if (!beginner) {
    add("answer-key", "recap", "Respuestas y evidencia", "Material privado para el docente.", {
      body: "SER: identidad, origen, profesión. ESTAR: ubicación, estado, emoción y condición.",
      answers: screens.flatMap((screen) => screen.answers).slice(0, 18),
      teacherNotes: ["Never display this screen in student mode."],
      timing: 1,
    });
  }

  return normalizeActivityTiming(screens, request.duration);
}
