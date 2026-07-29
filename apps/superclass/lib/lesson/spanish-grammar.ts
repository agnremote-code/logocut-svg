import { normalizeActivityTiming, targetScreenCount } from "@/lib/lesson/duration";
import { effectiveLanguageMode } from "@/lib/lesson/language";
import type { LessonPlan } from "@/lib/lesson/planning";
import type { LessonRequest, LessonScreen, ScreenLayout, ScreenType } from "@/types/lesson";

type GrammarContent = {
  title: string;
  contrast: [string, string];
  rules: string[];
  examples: string[];
  choices: string[];
  choiceAnswers: string[];
  gaps: string[];
  gapAnswers: string[];
  errors: string[];
  corrections: string[];
  personal: string[];
};

const grammarContent: Record<Exclude<NonNullable<LessonPlan["specializedTemplate"]>, "ser-estar">, GrammarContent> = {
  "present-tense": {
    title: "El presente de indicativo",
    contrast: ["Hábitos y rutinas", "Hechos y acciones actuales"],
    rules: ["-AR: hablo, hablas, habla, hablamos, hablan", "-ER: como, comes, come, comemos, comen", "-IR: vivo, vives, vive, vivimos, viven", "Irregulares frecuentes: soy, voy, tengo, hago"],
    examples: ["Trabajo de lunes a viernes.", "Ahora estudio español.", "Mi hermana vive en Lima.", "Los sábados hacemos deporte."],
    choices: ["Yo (hablo / habla) español.", "Ella (comes / come) temprano.", "Nosotros (vivimos / viven) aquí.", "Ellos (hace / hacen) ejercicio."],
    choiceAnswers: ["hablo", "come", "vivimos", "hacen"],
    gaps: ["Tú ___ (trabajar) desde casa.", "Nosotros ___ (comer) juntos.", "Yo ___ (tener) una reunión.", "Ana ___ (vivir) en Madrid."],
    gapAnswers: ["trabajas", "comemos", "tengo", "vive"],
    errors: ["Yo trabaja cada día.", "Nosotros come a las dos.", "Ella tener dos hermanos.", "Mis amigos vive cerca."],
    corrections: ["Yo trabajo cada día.", "Nosotros comemos a las dos.", "Ella tiene dos hermanos.", "Mis amigos viven cerca."],
    personal: ["¿Qué haces por la mañana?", "¿Dónde trabajas o estudias?", "¿Qué comes normalmente?", "¿Qué actividad haces los fines de semana?"],
  },
  "preterite-imperfect": {
    title: "Pretérito vs imperfecto",
    contrast: ["Pretérito: evento completo", "Imperfecto: contexto, hábito o acción en progreso"],
    rules: ["Pretérito: acción terminada — Ayer llamé.", "Imperfecto: hábito — Siempre llamaba.", "Imperfecto: descripción — Hacía frío.", "Combinación: Caminaba cuando empezó a llover."],
    examples: ["Ayer llegué a las ocho.", "De niño vivía en Córdoba.", "La calle estaba vacía.", "Leía cuando sonó el teléfono."],
    choices: ["Ayer (fui / iba) al médico.", "De niña (jugué / jugaba) cada tarde.", "Mientras cocinaba, él (llegó / llegaba).", "La casa (fue / era) muy antigua."],
    choiceAnswers: ["fui", "jugaba", "llegó", "era"],
    gaps: ["Cuando era niño, ___ (vivir) en Chile.", "Anoche ___ (ver) una película.", "Mientras yo ___ (estudiar), sonó el teléfono.", "El sábado ___ (comprar) un libro."],
    gapAnswers: ["vivía", "vi", "estudiaba", "compré"],
    errors: ["Cada verano fui al pueblo.", "Ayer iba al banco y volví.", "Hacía frío cuando salía el sol.", "De repente, llovía."],
    corrections: ["Cada verano iba al pueblo.", "Ayer fui al banco y volví.", "Hacía frío cuando salió el sol.", "De repente, llovió."],
    personal: ["¿Qué hiciste ayer?", "¿Cómo era tu barrio de infancia?", "¿Qué hacías cuando recibiste una noticia importante?", "¿Qué hábito tenías de niño?"],
  },
  "por-para": {
    title: "POR vs PARA",
    contrast: ["POR: causa, medio, intercambio, recorrido", "PARA: finalidad, destinatario, plazo, dirección"],
    rules: ["Causa: Lo hice por ti.", "Medio: Hablamos por teléfono.", "Finalidad: Estudio para aprender.", "Destinatario: Este regalo es para Ana."],
    examples: ["Gracias por tu ayuda.", "Salimos para Madrid.", "Trabajo para una empresa pequeña.", "Caminamos por el parque."],
    choices: ["Este café es (por / para) ti.", "Viajamos (por / para) tren.", "Lo necesito (por / para) mañana.", "Te llamo (por / para) confirmar."],
    choiceAnswers: ["para", "por", "para", "para"],
    gaps: ["Gracias ___ venir.", "Estudio ___ ser médica.", "Pasamos ___ el centro.", "Este mensaje es ___ Carlos."],
    gapAnswers: ["por", "para", "por", "para"],
    errors: ["Gracias para la invitación.", "Trabajo por ganar experiencia.", "Caminamos para el parque.", "Este libro es por Julia."],
    corrections: ["Gracias por la invitación.", "Trabajo para ganar experiencia.", "Caminamos por el parque.", "Este libro es para Julia."],
    personal: ["¿Para qué estudias español?", "¿Por qué elegiste tu profesión?", "¿Por qué medio hablas con tu familia?", "¿Para quién compras regalos normalmente?"],
  },
  subjunctive: {
    title: "Introducción al subjuntivo",
    contrast: ["Indicativo: información o certeza", "Subjuntivo: deseo, valoración, duda o influencia"],
    rules: ["Quiero que + subjuntivo: Quiero que vengas.", "Es importante que + subjuntivo.", "Dudo que + subjuntivo.", "No creo que + subjuntivo."],
    examples: ["Espero que tengas tiempo.", "Es mejor que descanses.", "Dudo que sea fácil.", "Creo que es posible."],
    choices: ["Quiero que (vienes / vengas).", "Creo que (es / sea) útil.", "No creo que (tiene / tenga) razón.", "Es importante que (practicas / practiques)."],
    choiceAnswers: ["vengas", "es", "tenga", "practiques"],
    gaps: ["Espero que tú ___ (poder) venir.", "Es necesario que nosotros ___ (hablar).", "Dudo que ella ___ (saber) la respuesta.", "Creo que ellos ___ (estar) listos."],
    gapAnswers: ["puedas", "hablemos", "sepa", "están"],
    errors: ["Quiero que vienes temprano.", "Creo que sea verdad.", "Es importante que estudias.", "No creo que es tarde."],
    corrections: ["Quiero que vengas temprano.", "Creo que es verdad.", "Es importante que estudies.", "No creo que sea tarde."],
    personal: ["¿Qué quieres que cambie este año?", "¿Qué es importante que haga un buen profesor?", "¿Qué dudas que ocurra pronto?", "¿Qué crees que es necesario aprender?"],
  },
  articles: {
    title: "Los artículos en español",
    contrast: ["Definidos: el, la, los, las", "Indefinidos: un, una, unos, unas"],
    rules: ["Usa el/la para algo identificado: la profesora.", "Usa un/una para presentar algo: una profesora.", "El artículo concuerda en género y número.", "Profesión tras ser normalmente va sin artículo: Soy médica."],
    examples: ["Busco un libro.", "El libro está aquí.", "Las ventanas están abiertas.", "Ana es ingeniera."],
    choices: ["Necesito (un / el) bolígrafo cualquiera.", "(Una / La) luna se ve esta noche.", "Son (los / unos) estudiantes de mi clase.", "Luis es (un / —) arquitecto."],
    choiceAnswers: ["un", "La", "los", "—"],
    gaps: ["___ casa de Ana es grande.", "Quiero comprar ___ mesa.", "___ estudiantes llegaron temprano.", "Marta es ___ profesora."],
    gapAnswers: ["La", "una", "Los", "—"],
    errors: ["La problema es difícil.", "Necesito el taxi cualquiera.", "Mi hermano es un médico.", "Un sol sale por el este."],
    corrections: ["El problema es difícil.", "Necesito un taxi.", "Mi hermano es médico.", "El sol sale por el este."],
    personal: ["¿Qué objeto necesitas comprar?", "¿Cuál es el lugar más útil de tu barrio?", "¿Qué profesión tienes o te interesa?", "Describe dos objetos de la habitación."],
  },
  "gender-number": {
    title: "Género y número",
    contrast: ["Género: masculino y femenino", "Número: singular y plural"],
    rules: ["-o suele cambiar a -a: alto/alta.", "Plural con vocal: casa/casas.", "Plural con consonante: ciudad/ciudades.", "Artículo, sustantivo y adjetivo concuerdan."],
    examples: ["el libro rojo", "la mesa roja", "los libros rojos", "las mesas rojas"],
    choices: ["la casa (blanco / blanca)", "los coches (rápido / rápidos)", "una ciudad (grande / grandes)", "las profesoras (española / españolas)"],
    choiceAnswers: ["blanca", "rápidos", "grande", "españolas"],
    gaps: ["el perro ___ (pequeño)", "las calles ___ (tranquilo)", "una canción ___ (popular)", "los exámenes ___ (difícil)"],
    gapAnswers: ["pequeño", "tranquilas", "popular", "difíciles"],
    errors: ["la libro nuevo", "los mesa blancas", "una ciudades grande", "las problema difíciles"],
    corrections: ["el libro nuevo", "las mesas blancas", "una ciudad grande", "los problemas difíciles"],
    personal: ["Describe dos objetos cercanos.", "¿Cómo son las calles de tu ciudad?", "Describe a dos personas importantes.", "¿Qué cosas son difíciles para ti?"],
  },
  questions: {
    title: "Formar preguntas en español",
    contrast: ["Sí/no: ¿Trabajas aquí?", "Información: ¿Dónde trabajas?"],
    rules: ["Usa ¿ ? al principio y al final.", "La entonación distingue una pregunta de una afirmación.", "Qué, cómo, cuándo, dónde y por qué llevan tilde.", "Con preposición: ¿De dónde eres? ¿Con quién vienes?"],
    examples: ["¿Hablas español?", "¿Qué estudias?", "¿Dónde vive Ana?", "¿Por qué aprendes español?"],
    choices: ["(Qué / Que) haces?", "¿(Dónde / Donde) vives?", "¿(Por qué / Porque) estudias?", "¿(Quién / Quien) llama?"],
    choiceAnswers: ["Qué", "Dónde", "Por qué", "Quién"],
    gaps: ["¿___ te llamas?", "¿___ años tienes?", "¿___ trabajas?", "¿___ aprendes español?"],
    gapAnswers: ["Cómo", "Cuántos", "Dónde", "Por qué"],
    errors: ["Que haces?", "¿Dónde tú vives.", "Porque estudias español?", "¿Con quien hablas?"],
    corrections: ["¿Qué haces?", "¿Dónde vives?", "¿Por qué estudias español?", "¿Con quién hablas?"],
    personal: ["Haz una pregunta sobre el trabajo.", "Pregunta por un lugar.", "Pregunta por una razón.", "Haz una pregunta de seguimiento."],
  },
};

function make(index: number, type: ScreenType, layout: ScreenLayout, title: string, instruction: string, options: Partial<LessonScreen> = {}): LessonScreen {
  return {
    id: `grammar-${index + 1}-${type}`,
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
  };
}

export function buildSpanishGrammarScreens(request: LessonRequest, plan: LessonPlan) {
  const template = plan.specializedTemplate;
  if (!template || template === "ser-estar") return [];
  const content = grammarContent[template];
  const bilingual = ["bilingual", "support-heavy"].includes(effectiveLanguageMode(request));
  const support = (spanish: string, english: string) => bilingual ? `${spanish} · ${english}` : spanish;
  const screens: LessonScreen[] = [];
  const add = (type: ScreenType, layout: ScreenLayout, title: string, instruction: string, options?: Partial<LessonScreen>) =>
    screens.push(make(screens.length, type, layout, title, instruction, options));

  add("cover", "cover", content.title, support("Una forma, un significado y una decisión clara", "One form, one meaning, one clear choice"), { body: `${request.level} · ${request.duration} minutos`, teacherNotes: ["Keep examples in Spanish and support concise."], timing: 2 });
  add("objective", "objective", "Meta de hoy", support(`Al final puedes usar ${content.title.toLocaleLowerCase()} en situaciones comunes.`, "By the end, you can choose and use the target form in context."), { prompts: [`Puedo reconocer ${content.title.toLocaleLowerCase()}.`, "Puedo explicar mi elección con un ejemplo."], answers: ["Check recognition, accurate form and contextual meaning."], teacherNotes: ["Ask for one personal success criterion."], timing: 3 });
  add("microgrammar", "comparison", "Contraste esencial", support("Compara las dos funciones antes de elegir.", "Compare the functions before choosing."), { prompts: content.contrast, answers: content.contrast, teacherNotes: ["Elicit one learner example for each column."], timing: 5 });
  add("microgrammar", "rule-cards", "Reglas que sí ayudan", support("Relaciona cada regla con un ejemplo.", "Match each rule to an example."), { prompts: content.rules, answers: content.examples, teacherNotes: ["Keep explanation under three minutes."], timing: 5 });
  add("controlled-practice", "example-gallery", "Ejemplos en contexto", support("Observa la forma y explica el significado.", "Notice the form and explain the meaning."), { prompts: content.examples, answers: content.rules, teacherNotes: ["Ask what would change with the contrasting form."], timing: 5 });
  add("controlled-practice", "sorting", "Clasifica la intención", support("Agrupa cada ejemplo según la función que expresa.", "Sort each example by function."), { prompts: content.examples, answers: content.examples.map((_, index) => content.contrast[index % 2]), teacherNotes: ["Require a short justification."], timing: 4 });
  add("controlled-practice", "multiple-choice", "Elige la forma precisa", support("Selecciona una opción y explica por qué.", "Choose and justify."), { prompts: content.choices, answers: content.choiceAnswers, teacherNotes: ["Reveal only after the learner commits."], timing: 5 });
  add("controlled-practice", "fill-gap", "Completa y conjuga", support("Escribe la forma correcta dentro de la frase.", "Complete each sentence accurately."), { prompts: content.gaps, answers: content.gapAnswers, teacherNotes: ["Check both form and meaning."], timing: 5 });
  add("error-correction", "error-correction", "Detective gramatical", support("Corrige el error y nombra la regla.", "Correct and name the rule."), { prompts: content.errors, answers: content.corrections, teacherNotes: ["Prioritize the target contrast over unrelated corrections."], timing: 5 });
  add("context", "illustrated-context", "Situaciones reales", support("Elige una situación y crea una frase completa.", "Build a complete contextual sentence."), { body: `🏠 vida diaria · 💼 trabajo · 📍 lugar · 💬 conversación — ${content.title}`, prompts: content.personal.slice(0, 3), answers: ["Answers vary; the target form and context must agree."], teacherNotes: ["Treat the icons as situation cues."], timing: 4 });
  add("personal-questions", "personal-prompts", "Ahora habla de ti", support("Responde con la estructura meta y un detalle.", "Answer with the target structure and one detail."), { prompts: content.personal, answers: ["Answers vary; require one accurate target structure."], teacherNotes: ["Delay correction until the learner completes the idea."], timing: 5 });
  add("discussion", "dialogue", "Diálogo con propósito", support("Completa el diálogo y cambia los detalles.", "Complete and personalize the dialogue."), { body: `A: Tengo una pregunta sobre ${content.title.toLocaleLowerCase()}.  B: Dame un ejemplo.  A: ____.  B: Elegimos esa forma porque ____.`, prompts: ["Completa dos turnos.", "Añade otro ejemplo.", "Representa el diálogo sin leer."], answers: ["Use one accurate example and a clear rule-based explanation."], teacherNotes: ["Repeat with one contrasting example."], timing: 5 });
  add("review", "recap", "Reto rápido", support("Decide, explica y crea un ejemplo.", "Choose, explain and create."), { prompts: [...content.choiceAnswers.slice(0, 2), ...content.gapAnswers.slice(0, 2)], answers: content.choiceAnswers, teacherNotes: ["Aim for accurate automatic recall."], timing: 3 });
  add("exit-task", "recap", "Mapa final", support("Resume la regla y demuestra que puedes usarla.", "Summarize and demonstrate."), { prompts: [`Uso ${content.title.toLocaleLowerCase()} para…`, "Un contraste importante es…", "Mi ejemplo personal es…"], answers: content.contrast, teacherNotes: ["Compare with the opening objective."], timing: 3 });
  if (request.includeHomework) add("homework", "homework", `Tarea: ${content.title}`, support("Escribe ocho frases y revisa cada elección.", "Write eight sentences and check every choice."), { prompts: ["4 ejemplos de la primera función", "4 ejemplos de la segunda función", "Subraya la forma meta", "Corrige una frase después de revisarla"], answers: ["Check form, meaning, agreement and topic relevance."], teacherNotes: ["Keep homework independent of paid tools."], timing: 2 });

  const targetBeforeKey = targetScreenCount(request.duration) - 1;
  let round = 1;
  while (screens.length < targetBeforeKey) {
    add("controlled-practice", round % 2 ? "sentence-builder" : "multiple-choice", `Práctica enfocada ${round}`, `Usa ${content.title.toLocaleLowerCase()} en una situación nueva.`, { prompts: [content.personal[(round - 1) % content.personal.length], content.gaps[(round - 1) % content.gaps.length]], answers: [content.gapAnswers[(round - 1) % content.gapAnswers.length]], teacherNotes: ["Keep the added round on the exact grammar target."], timing: 4 });
    round += 1;
  }
  while (screens.length > targetBeforeKey) screens.splice(screens.length - (request.includeHomework ? 1 : 0) - 1, 1);
  add("answer-key", "recap", "Respuestas y evidencia", "Material privado para el docente.", { body: content.contrast.join(" / "), answers: [...content.choiceAnswers, ...content.gapAnswers, ...content.corrections], teacherNotes: ["Never display this screen in student mode."], timing: 1 });
  return normalizeActivityTiming(screens, request.duration);
}
