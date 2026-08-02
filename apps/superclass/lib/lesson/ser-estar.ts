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

  add("cover", "hero-cover", "SER y ESTAR", support("Dos verbos. Dos mundos. Elegí por el significado.", "Two verbs. Two worlds. Choose by meaning."), {
    body: "IDENTIDAD + ORIGEN  /  LUGAR + ESTADO",
    teacherNotes: ["Start the class without revealing the answer bank."],
    timing: 2,
  });
  if (!beginner) add("objective", "how-it-works-cards", "El recorrido", support("Cuatro movimientos para hablar con más precisión.", "Four moves toward more accurate speaking."), {
    prompts: ["1 · Mirá el significado", "2 · Elegí el verbo", "3 · Corregí el mensaje", "4 · Hablá de vos"],
    answers: ["Meaning before memorized rules."],
    teacherNotes: ["Keep this overview under one minute."],
    timing: 2,
  });
  add("microgrammar", "grammar-contrast", "Dos verbos, dos funciones", support("Compará las dos preguntas clave.", "Compare the two key questions."), {
    body: "SER → quién es, de dónde es, qué es. ESTAR → dónde está, cómo está, en qué condición está.",
    prompts: ["Ana es arquitecta.", "Ana está en Bogotá.", "El café es colombiano.", "El café está frío."],
    answers: ["SER: identity/origin/type. ESTAR: location/state/condition."],
    teacherNotes: ["Do not teach the inaccurate permanent-versus-temporary shortcut."],
    timing: 5,
  });
  add("vocabulary", "vocabulary-expression-bank", "Frases que abren la conversación", support("Elegí una expresión y completala con información real.", "Choose a phrase and make it true."), {
    vocabulary: [
      { term: "Soy de…", meaning: "origen", example: "Soy de Inglaterra." },
      { term: "Soy…", meaning: "identidad o profesión", example: "Soy diseñador." },
      { term: "Estoy en…", meaning: "ubicación", example: "Estoy en casa." },
      { term: "Estoy…", meaning: "estado", example: "Estoy concentrada." },
    ],
    answers: ["Accept accurate personal completions."],
    teacherNotes: ["Use the expression cards as a speaking bank, not a reading list."],
    timing: 5,
  });
  add("controlled-practice", "photo-choice", "¿Qué verbo ves?", support("Elegí una escena y decí la frase completa.", "Choose a scene and say the full sentence."), {
    prompts: ["una médica · profesión", "una plaza · ubicación", "una persona nerviosa · estado", "una bandera · origen"],
    answers: ["es médica", "está en la plaza", "está nerviosa", "es de…"],
    teacherNotes: ["Ask for the reason after the learner chooses."],
    timing: 5,
  });
  add("controlled-practice", "visual-menu-grid", "Clasificá por significado", support("Marcá SER o ESTAR para cada idea.", "Sort each idea under SER or ESTAR."), {
    prompts: ["profesión", "ubicación", "origen", "emoción"],
    answers: ["SER", "ESTAR", "SER", "ESTAR"],
    teacherNotes: ["The category buttons are interactive; require one example per category."],
    timing: 5,
  });
  if (!beginner) add("context", "dynamic-panel", "Una diferencia que cambia todo", support("Abrí cada caso y explicá el cambio de significado.", "Open each case and explain the meaning shift."), {
    body: "Es aburrido = that is his characteristic. Está aburrido = that is his current state.",
    prompts: ["Es listo / Está listo", "Es rico / Está rico", "Es seguro / Está seguro", "Es verde / Está verde"],
    answers: ["clever / ready", "wealthy / tasty", "safe / certain", "green / unripe"],
    teacherNotes: ["Only expand examples the learner can use at B1."],
    timing: 5,
  });
  add("controlled-practice", "canva-sentence-builder", "Construí la idea", support("Tocá las piezas y armá una frase verdadera.", "Tap the tiles and build a true sentence."), {
    body: "YO · MI FAMILIA · MI CIUDAD  /  SOY · ESTOY · ES · ESTÁ  /  DE… · EN… · FELIZ · GRANDE",
    prompts: ["Yo", "estoy", "en", "Seúl"],
    answers: ["Yo estoy en Seúl."],
    teacherNotes: ["Reset the tiles between attempts and invite a personal variation."],
    timing: 5,
  });
  add("error-correction", "opinion-switch", "Cambiá el verbo, cambiá el mensaje", support("Decidí si la frase funciona. Después, corregila.", "Decide if it works, then repair it."), {
    prompts: ["Soy cansado hoy.", "Madrid es en España.", "Mi madre está arquitecta.", "Las llaves son en la mesa."],
    answers: ["Estoy cansado hoy.", "Madrid está en España.", "Mi madre es arquitecta.", "Las llaves están en la mesa."],
    teacherNotes: ["Answers stay hidden until all four cards have a decision."],
    timing: 6,
  });
  add("discussion", "role-play-scenario", "Una conversación real", support("Elegí un rol, conseguí la información y reaccioná.", "Choose a role, get the information and react."), {
    body: "Conocés a una persona nueva en un evento. Descubrí quién es, de dónde es, dónde está y cómo está.",
    prompts: ["persona nueva", "anfitrión/a", "colega curioso/a", "amigo/a que llega tarde"],
    answers: ["¿Quién sos? ¿De dónde sos? ¿Dónde estás? ¿Cómo estás?"],
    teacherNotes: ["Run the scene twice and switch roles."],
    timing: 6,
  });
  add("personal-questions", "split-image-questions", "Tu mundo en ocho frases", support("Respondé y agregá un detalle en cada respuesta.", "Answer and add one detail each time."), {
    prompts: ["¿De dónde sos?", "¿Cuál es tu profesión?", "¿Dónde estás ahora?", "¿Cómo estás hoy?"],
    answers: ["Answers vary; check verb choice before conjugation detail."],
    teacherNotes: ["Use follow-up questions so this becomes a genuine speaking turn."],
    timing: 6,
  });
  add("review", "rapid-fire", "Ronda rápida", support("Tenés cinco segundos por pista.", "You have five seconds per cue."), {
    prompts: ["¿Qué verbo presenta quién sos?", "¿Qué verbo ubica las llaves?", "¿Qué verbo nombra tu trabajo?", "¿Qué verbo cuenta cómo te sentís?"],
    answers: ["SER", "ESTAR", "SER", "ESTAR"],
    teacherNotes: ["Use the randomizer, then ask for one complete example."],
    timing: 3,
  });
  add("exit-task", "final-manifesto", "Tu desafío final", support("Hablá durante un minuto sin leer.", "Speak for one minute without reading."), {
    body: "Presentate, decí de dónde sos, contá dónde estás y explicá cómo estás hoy.",
    prompts: ["2 usos de SER", "2 usos de ESTAR", "1 autocorrección", "1 detalle personal"],
    answers: ["Complete speaking model: identity, origin, location and current state."],
    teacherNotes: ["Let the learner finish before giving feedback."],
    timing: 5,
  });
  add("review", "feedback-screen", "Lo que ya podés hacer", support("Guardá un logro, una corrección y el próximo paso.", "Save one win, one correction and the next step."), {
    prompts: ["Funcionó bien…", "Voy a corregir…", "La próxima vez…"],
    answers: ["Teacher feedback remains private until explicitly revealed."],
    teacherNotes: ["Write a copy-ready student message after class."],
    timing: 2,
  });

  return normalizeActivityTiming(screens, request.duration);
}
