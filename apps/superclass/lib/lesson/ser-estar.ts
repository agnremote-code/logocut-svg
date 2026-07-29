import { normalizeActivityTiming, targetScreenCount } from "@/lib/lesson/duration";
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
  const support = (spanish: string, english: string) => bilingual ? `${spanish} · ${english}` : spanish;
  const screens: LessonScreen[] = [];
  const add = (type: ScreenType, layout: ScreenLayout, title: string, instruction: string, options?: Parameters<typeof make>[5]) =>
    screens.push(make(screens.length, type, layout, title, instruction, options));

  add("cover", "cover", "SER vs ESTAR", support("Dos verbos, trabajos diferentes", "Two verbs, different jobs"), {
    body: "Identidad · origen · profesión · características  /  ubicación · estado · emoción · condición",
    teacherNotes: ["Keep Spanish visually dominant. Use English only to confirm the concept."],
    timing: 2,
  });
  add("objective", "objective", "Meta de hoy", support("Al final puedes elegir ser o estar en situaciones comunes.", "By the end, you can choose ser or estar in common situations."), {
    prompts: ["Puedo explicar quién es una persona.", "Puedo decir dónde está y cómo está."],
    answers: ["The learner chooses the verb and explains the meaning contrast."],
    teacherNotes: ["Ask the learner to read the two Spanish outcomes aloud."],
    timing: 3,
  });
  add("microgrammar", "comparison", "Dos verbos, dos funciones", support("Compara las categorías. No memorices una regla de «permanente vs temporal».", "Compare the jobs; avoid an oversimplified permanent/temporary rule."), {
    body: "SER → identidad, origen, profesión, características generales. ESTAR → ubicación, estado, emociones, condición actual.",
    prompts: ["SER: ¿quién o qué es?", "ESTAR: ¿dónde o cómo está?"],
    answers: ["SER describes identity/classification; ESTAR locates or presents a state/condition."],
    teacherNotes: ["Use the stable violet SER accent and coral ESTAR accent."],
    timing: 5,
  });
  add("microgrammar", "rule-cards", "Los trabajos de SER", support("Observa los cuatro usos centrales.", "Notice the four core uses."), {
    prompts: ["Identidad: Soy Elena.", "Origen: Somos de México.", "Profesión: Él es médico.", "Característica: La casa es luminosa."],
    answers: ["Identity, origin, profession and general characteristic use SER."],
    teacherNotes: ["Contrast profession without an article: Es médico."],
    timing: 5,
  });
  add("microgrammar", "rule-cards", "Los trabajos de ESTAR", support("Relaciona cada ejemplo con ubicación, emoción o condición.", "Match each example to location, emotion or condition."), {
    prompts: ["Ubicación: El libro está aquí.", "Emoción: Estoy contenta.", "Condición: La puerta está abierta.", "Estado: Estamos cansados."],
    answers: ["Location, emotion, current condition and state use ESTAR."],
    teacherNotes: ["Point out that location normally uses ESTAR, even when it is not temporary."],
    timing: 5,
  });
  add("controlled-practice", "example-gallery", "Mira el significado", support("El verbo cambia la perspectiva.", "The verb changes the perspective."), {
    prompts: ["Ana es lista. / Ana está lista.", "La manzana es verde. / La manzana está verde.", "Él es aburrido. / Él está aburrido."],
    answers: ["clever/ready", "green/unripe", "boring/bored"],
    teacherNotes: ["Elicit the meaning before giving the English support."],
    timing: 5,
  });
  add("controlled-practice", "sorting", "Clasifica: SER o ESTAR", support("Selecciona una categoría para cada situación.", "Sort each situation into a category."), {
    prompts: ["Mi profesión", "La ubicación del café", "Mi emoción hoy", "El país de origen"],
    answers: ["SER", "ESTAR", "ESTAR", "SER"],
    teacherNotes: ["Ask for a full example after each choice."],
    timing: 5,
  });
  add("controlled-practice", "multiple-choice", "Elige el verbo", support("Decide y explica qué pregunta responde: quién, de dónde, dónde o cómo.", "Choose and explain the meaning."), {
    prompts: ["Mi hermana ___ arquitecta.", "Nosotros ___ en la oficina.", "Yo ___ nervioso hoy.", "Ellas ___ de Colombia."],
    answers: ["es", "estamos", "estoy", "son"],
    teacherNotes: ["Reveal answers only after the learner commits."],
    timing: 5,
  });
  add("controlled-practice", "fill-gap", "Completa la frase", support("Conjuga ser o estar en presente.", "Complete with the present-tense form."), {
    prompts: ["La reunión ___ en la sala dos.", "Mis amigos ___ muy creativos.", "¿Cómo ___ tú hoy?", "Yo ___ profesora de español."],
    answers: ["está", "son", "estás", "soy"],
    teacherNotes: ["Check both verb selection and subject agreement."],
    timing: 5,
  });
  add("error-correction", "error-correction", "Detective de errores", support("Corrige y explica el cambio.", "Correct each sentence and explain why."), {
    prompts: ["Soy cansado después del trabajo.", "Madrid es en España.", "Mi madre está ingeniera.", "Las llaves son en la mesa."],
    answers: ["Estoy cansado.", "Madrid está en España.", "Mi madre es ingeniera.", "Las llaves están en la mesa."],
    teacherNotes: ["Prioritize the concept, then check the conjugation."],
    timing: 5,
  });
  add("context", "illustrated-context", "¿Quién, dónde o cómo?", support("Lee la situación y formula una frase completa.", "Read the situation and make a complete sentence."), {
    body: "👩‍⚕️ identidad/profesión  ·  📍 ubicación  ·  🙂 emoción  ·  🚪 condición",
    prompts: ["Lucía / médica", "Lucía / hospital", "Lucía / tranquila", "Puerta / cerrada"],
    answers: ["Lucía es médica.", "Lucía está en el hospital.", "Lucía está tranquila.", "La puerta está cerrada."],
    teacherNotes: ["Treat icons as situation cues, not decoration."],
    timing: 4,
  });
  add("personal-questions", "personal-prompts", "Ahora habla de ti", support("Responde con una frase y un detalle.", "Answer with a sentence and one detail."), {
    prompts: ["¿De dónde eres?", "¿Cuál es tu profesión?", "¿Dónde estás ahora?", "¿Cómo estás hoy?"],
    answers: ["Answers vary; require the correct verb and a complete sentence."],
    teacherNotes: ["Follow up naturally; delay correction until the learner finishes."],
    timing: 5,
  });
  add("discussion", "dialogue", "Una conversación real", support("Completa y representa el diálogo.", "Complete and perform the dialogue."), {
    body: "A: Hola, ¿quién ___ la nueva profesora?  B: ___ Ana. ___ de Perú.  A: ¿Dónde ___ ahora?  B: ___ en el aula.",
    prompts: ["Completa los cinco espacios.", "Representa el diálogo.", "Cambia la profesión y el lugar."],
    answers: ["es", "Es", "Es", "está", "Está"],
    teacherNotes: ["Repeat once with new personal details."],
    timing: 5,
  });
  add("review", "recap", "Reto rápido", support("Di SER o ESTAR antes de que termine el tiempo.", "Choose quickly, then justify one answer."), {
    prompts: ["identidad", "ubicación", "profesión", "emoción"],
    answers: ["SER", "ESTAR", "SER", "ESTAR"],
    teacherNotes: ["Aim for automatic recall, then one concise explanation."],
    timing: 3,
  });
  add("exit-task", "recap", "Mapa final", support("Completa la regla con tus propias palabras.", "Complete the rule in your own words."), {
    prompts: ["Uso SER para…", "Uso ESTAR para…", "Un ejemplo importante para mí es…"],
    answers: ["SER: identity/origin/profession/general characteristics. ESTAR: location/state/emotion/current condition."],
    teacherNotes: ["Compare with the objective and record one next step."],
    timing: 3,
  });
  if (request.includeHomework) {
    add("homework", "homework", "Tarea: mi mundo con SER y ESTAR", support("Escribe ocho frases y revisa el verbo.", "Write eight sentences and check the verb."), {
      prompts: ["2 frases de identidad u origen", "2 de profesión o características", "2 de ubicación", "2 de emociones o condiciones"],
      answers: ["Teacher check: correct verb, conjugation and meaning category."],
      teacherNotes: ["Ask the learner to label each category."],
      timing: 2,
    });
  }

  const targetBeforeKey = targetScreenCount(request.duration) - 1;
  let round = 1;
  while (screens.length < targetBeforeKey) {
    add("controlled-practice", round % 2 ? "sentence-builder" : "multiple-choice", `Práctica enfocada ${round}`, support("Construye una frase precisa con el contexto.", "Build one accurate contextual sentence."), {
      prompts: [`persona + profesión + ${round}`, `lugar + condición + ${round}`],
      answers: ["Use SER for profession; use ESTAR for location/condition."],
      teacherNotes: ["Keep every added practice round directly on the ser/estar contrast."],
      timing: 4,
    });
    round += 1;
  }
  while (screens.length > targetBeforeKey) screens.splice(screens.length - (request.includeHomework ? 1 : 0) - 1, 1);
  add("answer-key", "recap", "Respuestas y evidencia", "Material privado para el docente.", {
    body: "SER: identidad, origen, profesión y características. ESTAR: ubicación, estado, emoción y condición.",
    answers: screens.flatMap((screen) => screen.answers).slice(0, 18),
    teacherNotes: ["Never display this screen in student mode."],
    timing: 1,
  });
  return normalizeActivityTiming(screens, request.duration);
}
