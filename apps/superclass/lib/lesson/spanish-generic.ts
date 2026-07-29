import { normalizeActivityTiming, targetScreenCount } from "@/lib/lesson/duration";
import { effectiveLanguageMode } from "@/lib/lesson/language";
import type { LessonRequest, LessonScreen, ScreenLayout, ScreenType } from "@/types/lesson";

function item(index: number, type: ScreenType, layout: ScreenLayout, title: string, instruction: string, options: Partial<LessonScreen> = {}): LessonScreen {
  return {
    id: `spanish-${index + 1}-${type}`,
    type, layout, title, instruction,
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

export function buildSpanishTopicScreens(request: LessonRequest, topic: string, videoId?: string) {
  const result: LessonScreen[] = [];
  const add = (type: ScreenType, layout: ScreenLayout, title: string, instruction: string, options?: Partial<LessonScreen>) =>
    result.push(item(result.length, type, layout, title, instruction, options));
  const source = request.sourceMode === "video" ? request.transcript : request.source;
  const excerpt = request.sourceMode === "idea" ? undefined : source.slice(0, 320);
  const bilingual = ["bilingual", "support-heavy"].includes(effectiveLanguageMode(request));
  const vocabularyPool = [
    { term: "una idea clave", meaning: bilingual ? "a key idea" : "el concepto principal", example: `Una idea clave sobre ${topic} es…` },
    { term: "desde mi experiencia", meaning: bilingual ? "from my experience" : "a partir de lo que he vivido", example: `Desde mi experiencia, ${topic}…` },
    { term: "por ejemplo", meaning: bilingual ? "for example" : "para introducir un caso concreto", example: `Por ejemplo, podemos hablar de ${topic}.` },
    { term: "sin embargo", meaning: bilingual ? "however" : "para presentar un contraste", example: "Sin embargo, hay otra perspectiva." },
    { term: "tener en cuenta", meaning: bilingual ? "to take into account" : "considerar algo importante", example: "Hay que tener en cuenta el contexto." },
    { term: "en la práctica", meaning: bilingual ? "in practice" : "en una situación real", example: "En la práctica, la situación cambia." },
    { term: "un punto de vista", meaning: bilingual ? "a point of view" : "una perspectiva u opinión", example: "Mi punto de vista parte de la experiencia." },
    { term: "llegar a una conclusión", meaning: bilingual ? "to reach a conclusion" : "decidir después de analizar", example: "Podemos llegar a una conclusión clara." },
  ];
  const recent = new Set(request.recentVocabulary.map((value) => value.toLocaleLowerCase()));
  const vocabulary = [...vocabularyPool.filter((entry) => !recent.has(entry.term.toLocaleLowerCase())), ...vocabularyPool.filter((entry) => recent.has(entry.term.toLocaleLowerCase()))].slice(0, 6);

  add("cover", "cover", topic, "Una clase diseñada para hablar, comprender y usar el español con precisión.", { body: `${request.level} · ${request.duration} minutos`, timing: 2, teacherNotes: ["Present the exact topic and one concrete outcome."] });
  add("objective", "objective", "Objetivos de la clase", "Lee las metas y elige la más importante para ti.", { prompts: [`Puedo hablar sobre ${topic}.`, "Puedo usar el vocabulario clave en frases completas.", "Puedo responder con una razón y un ejemplo."], answers: ["Success means relevant, level-appropriate Spanish production."], teacherNotes: ["Keep support concise and let the learner state a personal goal."], timing: 3 });
  if (request.sourceMode !== "idea") {
    add(request.sourceMode === "video" ? "video" : "source", "illustrated-context", request.sourceMode === "video" ? "Mira con un propósito" : "Lee con un propósito", "Busca la idea principal y dos detalles importantes.", { sourceExcerpt: excerpt, videoId, prompts: ["¿Cuál es la idea principal?", "¿Qué detalle la apoya?"], answers: ["Answers must be supported by the displayed excerpt."], teacherNotes: ["Use only the imported or teacher-edited transcript."], timing: 6 });
    add("comprehension", "multiple-choice", "Comprueba la comprensión", "Responde con evidencia exacta de la fuente.", { sourceExcerpt: excerpt, prompts: ["¿Qué afirma primero la fuente?", "¿Qué ejemplo aparece?", "¿Qué podemos inferir sin inventar información?"], answers: excerpt ? [`Evidencia obligatoria: ${excerpt.slice(0, 150)}`] : ["Use the source."], teacherNotes: ["Separate comprehension from opinion."], timing: 5 });
  }
  add("warmup", "illustrated-context", "Activa el tema", "Observa las situaciones y conecta una con tu experiencia.", { body: `Tres perspectivas sobre ${topic}: experiencia · necesidad · opinión`, prompts: [`¿Qué experiencia real tienes con ${topic}?`, "¿Qué palabra ya conoces?", "¿Qué quieres poder decir al final?"], teacherNotes: ["Adapt the concrete follow-up to the exact topic."], timing: 5 });
  add("vocabulary", "vocabulary-cards", "Lenguaje útil", "Elige cuatro expresiones y crea un ejemplo personal.", {
    vocabulary,
    answers: ["Accept accurate, topic-relevant examples."], teacherNotes: ["English meanings are secondary support; Spanish stays dominant."], timing: 6,
  });
  if (request.level === "A0" || request.level === "A1") {
    add("sentence-frames", "sentence-builder", "Frases para empezar", "Completa el modelo y repite la frase completa.", { prompts: [`Para mí, ${topic} es __.`, `Me gusta __ porque __.`, "Quiero hablar de __."], answers: ["Accept a complete modelled sentence."], teacherNotes: ["Model, repeat twice, then remove one support."], timing: 5 });
    add("pronunciation", "pronunciation", "Escucha el ritmo", "Marca la palabra fuerte y repite de lento a natural.", { prompts: [topic, `Una idea sobre ${topic}.`], answers: ["Prioritize intelligibility and one clear stress group."], teacherNotes: ["Use backchaining only when needed."], timing: 4 });
  }
  add("controlled-practice", "example-gallery", "Ejemplos en contexto", "Relaciona cada ejemplo con una intención comunicativa.", { prompts: [`Describir ${topic}`, `Explicar una causa relacionada con ${topic}`, `Dar una opinión sobre ${topic}`, `Proponer una solución para ${topic}`], answers: ["description", "cause", "opinion", "solution"], teacherNotes: ["Model only one example, then elicit the rest."], timing: 4 });
  add("controlled-practice", "sentence-builder", "Construye una respuesta", "Ordena las piezas y añade información propia.", { body: "En mi opinión + idea + porque + razón + por ejemplo + detalle", prompts: [`Construye una respuesta sobre ${topic}.`, "Cambia la razón.", "Añade un contraste."], answers: ["A complete response includes an idea, reason and example."], teacherNotes: ["Require complete sentences appropriate to the selected CEFR."], timing: 5 });
  add("controlled-practice", "multiple-choice", "Elige la respuesta más precisa", "Selecciona la opción que responde de forma clara y completa.", { prompts: [`A) Sí.  B) Sí, porque ${topic} influye en la vida diaria.`, "A) Es bueno.  B) Es útil por una razón concreta.", "A) No sé.  B) Necesito comparar dos opciones."], answers: ["B", "B", "B"], teacherNotes: ["Ask why the stronger response communicates more."], timing: 4 });
  add("error-correction", "error-correction", "Mejora el mensaje", "Corrige claridad, conexión y precisión.", { prompts: [`“${topic} es bueno.”`, "“Yo pienso porque es importante.”", "“Por ejemplo, pero no tengo un ejemplo.”"], answers: ["Add a precise adjective and reason.", "State the idea before porque.", "Provide a concrete example or remove the connector."], teacherNotes: ["Do not attribute invented errors to a real learner."], timing: 4 });
  add("personal-questions", "personal-prompts", "Tu experiencia", "Responde en español con una razón y un ejemplo.", { prompts: [`¿Cómo se relaciona ${topic} con tu vida?`, "¿Qué ha cambiado tu opinión?", "¿Qué recomendarías a otra persona?", "¿Qué quieres explorar después?"], answers: ["Answers vary; check relevance and target language."], teacherNotes: ["Let the learner finish before correction."], timing: 6 });
  if (request.includeRoleplay) add("controlled-practice", "dialogue", "Roleplay específico", `Representa una situación real relacionada con ${topic}.`, { prompts: ["Define tu objetivo.", "Usa dos expresiones clave.", "Llega a un resultado claro."], answers: ["The roleplay is successful when the exchange stays on-topic and reaches an outcome."], teacherNotes: ["Roleplay was deliberately enabled."], timing: 6 });
  add("discussion", "dialogue", "Diálogo en contexto", "Completa el diálogo y cámbialo para que sea personal.", { body: `A: ¿Qué opinas de ${topic}?  B: En mi opinión…  A: ¿Por qué?  B: Porque…`, prompts: ["Completa dos turnos.", "Añade un desacuerdo respetuoso.", "Representa el diálogo sin leer."], answers: ["Use a complete opinion, reason and follow-up."], teacherNotes: ["Focus on natural interaction, not memorization."], timing: 6 });
  if (request.level === "C1" || request.level === "C2") add("debate", "debate-cards", "Tensión y matiz", "Defiende una posición, reconoce un límite y responde al mejor contraargumento.", { prompts: [`¿Qué afirmación sobre ${topic} simplifica demasiado el problema?`, "¿Qué evidencia cambiaría tu posición?", "¿Dónde está el límite?", "¿Cuál es el mejor argumento contrario?"], answers: ["Strong answers qualify claims and address a counterargument."], teacherNotes: ["Focus on register, implication and precision."], timing: 7 });
  add("review", "sorting", "Clasifica lo aprendido", "Organiza las tarjetas: vocabulario, idea, ejemplo o pregunta.", { prompts: ["desde mi experiencia", `la idea central de ${topic}`, "por ejemplo…", `¿Qué opinas de ${topic}?`], answers: ["vocabulary", "idea", "example", "question"], teacherNotes: ["Use the categories to retrieve language quickly."], timing: 4 });
  add("exit-task", "recap", "Reto final", "Habla durante un minuto sin leer.", { prompts: [`Presenta una idea clara sobre ${topic}.`, "Incluye una razón.", "Usa dos expresiones clave.", "Termina con un ejemplo."], answers: ["Complete idea · reason · two target expressions · example"], teacherNotes: ["Record one success and one next step."], timing: 4 });
  if (request.includeHomework) add("homework", "homework", "Tarea útil", "Crea una respuesta que puedas usar fuera de clase.", { prompts: [`Escribe o graba una respuesta sobre ${topic}.`, "Usa cuatro expresiones de la clase.", "Mejora una frase después de revisarla."], answers: ["Check completion, relevance and one self-correction."], teacherNotes: ["Keep homework independent of paid platforms."], timing: 2 });

  const target = targetScreenCount(request.duration) - 1;
  let round = 1;
  while (result.length < target) {
    add("controlled-practice", round % 2 ? "fill-gap" : "example-gallery", `Práctica específica ${round}`, `Aplica el español directamente al tema: ${topic}.`, { prompts: [`Completa la idea ${round} sobre ${topic}.`, `Añade un ejemplo específico ${round}.`], answers: ["Check accurate, topic-specific Spanish."], teacherNotes: ["Keep this round connected to the exact requested topic."], timing: 4 });
    round += 1;
  }
  while (result.length > target) result.splice(result.length - (request.includeHomework ? 1 : 0) - 1, 1);
  add("answer-key", "recap", "Respuestas para el docente", "Material privado.", { answers: result.flatMap((screen) => screen.answers).slice(0, 18), teacherNotes: ["Hidden from student mode."], timing: 1 });
  return normalizeActivityTiming(result, request.duration);
}
