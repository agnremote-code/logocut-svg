"use client";

import { useEffect, useMemo, useState } from "react";
import type { LessonScreen, VisualSystem } from "@/types/lesson";
import { visualSystemClass } from "@/lib/lesson/canva-storyboard";

type LayoutProps = {
  screen: LessonScreen;
  onNext?: () => void;
  onNavigate?: (index: number) => void;
};

function Copy({ value }: { value: string }) {
  const [primary, support] = value.split("||").map((part) => part.trim());
  return <>{primary}{support && <small className="canva-support">{support}</small>}</>;
}

function Heading({ screen, eyebrow }: { screen: LessonScreen; eyebrow?: string }) {
  return <header className="canva-heading">
    <span>{eyebrow ?? screen.type.replaceAll("-", " ")}</span>
    <h2><Copy value={screen.title} /></h2>
    <p><Copy value={screen.instruction} /></p>
  </header>;
}

function promptList(screen: LessonScreen) {
  return screen.prompts.length ? screen.prompts : [screen.body || screen.instruction];
}

export function HeroCover({ screen, onNext }: LayoutProps) {
  return <div className="layout-composition hero-cover">
    <div className="hero-wordmark">SUPERCLASS · {screen.timing} MIN</div>
    <div className="hero-copy-block">
      <h2><Copy value={screen.title} /></h2>
      <p><Copy value={screen.instruction} /></p>
      <button type="button" onClick={onNext}>Empezar <span>→</span></button>
    </div>
    <div className="hero-topic-art" aria-label={screen.body || "Lesson topic composition"}>
      <strong>SER</strong><i>y</i><strong>ESTAR</strong><span>{screen.body}</span>
    </div>
  </div>;
}

export function VisualMenuGrid({ screen }: LayoutProps) {
  const [choices, setChoices] = useState<Record<number, "SER" | "ESTAR">>({});
  return <div className="layout-composition visual-menu-grid">
    <Heading screen={screen} eyebrow="CLASIFICAR" />
    <div className="visual-menu-cards">{promptList(screen).map((prompt, index) => (
      <article key={`${prompt}-${index}`} className={choices[index] ? `chosen ${choices[index].toLowerCase()}` : ""}>
        <small>0{index + 1}</small><strong><Copy value={prompt} /></strong>
        <div><button type="button" onClick={() => setChoices((current) => ({ ...current, [index]: "SER" }))}>SER</button><button type="button" onClick={() => setChoices((current) => ({ ...current, [index]: "ESTAR" }))}>ESTAR</button></div>
      </article>
    ))}</div>
  </div>;
}

export function SplitImageQuestions({ screen }: LayoutProps) {
  const [active, setActive] = useState(0);
  return <div className="layout-composition split-image-questions">
    <div className="split-topic-panel"><span>PERSONA · LUGAR · MOMENTO</span><strong>{screen.title.split(" ").slice(0, 2).join(" ")}</strong><p>{screen.body || "Observá la escena y hacé conexiones personales."}</p></div>
    <div className="split-question-panel"><Heading screen={screen} eyebrow="HABLAR" /><div>{promptList(screen).map((prompt, index) => <button type="button" className={active === index ? "active" : ""} key={`${prompt}-${index}`} onClick={() => setActive(index)}><span>{index + 1}</span><Copy value={prompt} /></button>)}</div></div>
  </div>;
}

export function HowItWorksCards({ screen }: LayoutProps) {
  return <div className="layout-composition how-it-works-cards">
    <Heading screen={screen} eyebrow="ASÍ FUNCIONA" />
    <div>{promptList(screen).map((prompt, index) => <article key={`${prompt}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong><Copy value={prompt.replace(/^\d+\s*·\s*/, "")} /></strong></article>)}</div>
  </div>;
}

export function MapHub({ screen, onNavigate }: LayoutProps) {
  return <div className="layout-composition map-hub">
    <Heading screen={screen} eyebrow="MAPA DE LA CLASE" />
    <div className="map-route"><i /><div className="map-center">{screen.title}</div>{promptList(screen).map((prompt, index) => <button type="button" style={{ "--stop": index } as React.CSSProperties} key={`${prompt}-${index}`} onClick={() => onNavigate?.(index + 1)}><span>{index + 1}</span><Copy value={prompt} /></button>)}</div>
  </div>;
}

export function VocabularyExpressionBank({ screen }: LayoutProps) {
  const items = screen.vocabulary.length ? screen.vocabulary : promptList(screen).map((term) => ({ term, meaning: "Useful expression", example: screen.instruction }));
  const [flipped, setFlipped] = useState<number[]>([]);
  return <div className="layout-composition vocabulary-expression-bank">
    <Heading screen={screen} eyebrow="BANCO DE EXPRESIONES" />
    <div>{items.slice(0, 6).map((item, index) => { const open = flipped.includes(index); return <button type="button" className={open ? "open" : ""} key={`${item.term}-${index}`} onClick={() => setFlipped((current) => current.includes(index) ? current.filter((itemIndex) => itemIndex !== index) : [...current, index])}><small>{open ? item.meaning : `EXPRESIÓN ${index + 1}`}</small><strong>{item.term}</strong>{open && <span>{item.example}</span>}</button>; })}</div>
  </div>;
}

export function RolePlayScenario({ screen }: LayoutProps) {
  const [role, setRole] = useState(0);
  return <div className="layout-composition role-play-scenario">
    <Heading screen={screen} eyebrow="ROLE PLAY" />
    <div className="role-grid">{promptList(screen).map((prompt, index) => <button type="button" className={role === index ? "active" : ""} key={`${prompt}-${index}`} onClick={() => setRole(index)}><span>ROL {index + 1}</span><strong><Copy value={prompt} /></strong></button>)}</div>
    <aside><small>LA SITUACIÓN</small><p>{screen.body}</p><b>Usá:</b><span>{screen.answers[0] || "una pregunta, una reacción y un detalle"}</span></aside>
  </div>;
}

export function PhotoChoice({ screen }: LayoutProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const tones = ["sun", "city", "portrait", "studio", "coast", "night"];
  return <div className="layout-composition photo-choice">
    <Heading screen={screen} eyebrow="ELEGÍ UNA ESCENA" />
    <div>{promptList(screen).map((prompt, index) => <button type="button" className={`${tones[index % tones.length]} ${selected.includes(index) ? "selected" : ""}`} key={`${prompt}-${index}`} onClick={() => setSelected((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])}><span aria-hidden="true">{["PROFESIÓN", "LUGAR", "ESTADO", "ORIGEN"][index % 4]}</span><strong><Copy value={prompt} /></strong><i>{selected.includes(index) ? "✓" : "+"}</i></button>)}</div>
  </div>;
}

export function OpinionSwitch({ screen }: LayoutProps) {
  const [decisions, setDecisions] = useState<Record<number, boolean>>({});
  return <div className="layout-composition opinion-switch">
    <Heading screen={screen} eyebrow="DETECTIVE DE ERRORES" />
    <div>{promptList(screen).map((prompt, index) => <article key={`${prompt}-${index}`} className={index in decisions ? decisions[index] ? "works" : "repair" : ""}><p><Copy value={prompt} /></p><div><button type="button" onClick={() => setDecisions((current) => ({ ...current, [index]: true }))}>Funciona</button><button type="button" onClick={() => setDecisions((current) => ({ ...current, [index]: false }))}>Hay que cambiarla</button></div></article>)}</div>
  </div>;
}

export function RapidFire({ screen }: LayoutProps) {
  const prompts = promptList(screen);
  const [active, setActive] = useState(0);
  const randomize = () => setActive((current) => prompts.length < 2 ? 0 : (current + 1 + Math.floor(Math.random() * (prompts.length - 1))) % prompts.length);
  return <div className="layout-composition rapid-fire">
    <Heading screen={screen} eyebrow="5 SEGUNDOS" />
    <div className="rapid-card"><small>PREGUNTA {active + 1} / {prompts.length}</small><strong><Copy value={prompts[active]} /></strong><button type="button" onClick={randomize}>Otra pista ↻</button></div>
    <div className="rapid-dots">{prompts.map((_, index) => <button type="button" aria-label={`Open prompt ${index + 1}`} className={index === active ? "active" : ""} key={index} onClick={() => setActive(index)} />)}</div>
  </div>;
}

export function FinalManifesto({ screen }: LayoutProps) {
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1_000);
    return () => window.clearTimeout(timer);
  }, [running, seconds]);
  return <div className="layout-composition final-manifesto">
    <div><span>DESAFÍO FINAL</span><h2><Copy value={screen.title} /></h2><p>{screen.body || screen.instruction}</p><button type="button" onClick={() => { if (seconds === 0) setSeconds(60); setRunning((value) => !value); }}>{running ? "Pausar" : seconds === 60 ? "Empezar 60s" : "Continuar"}</button></div>
    <aside><strong>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</strong><small>{running ? "EN CURSO" : "LISTO"}</small></aside>
    <ul>{promptList(screen).map((prompt, index) => <li key={`${prompt}-${index}`}><i>✓</i><Copy value={prompt} /></li>)}</ul>
  </div>;
}

export function DynamicPanel({ screen }: LayoutProps) {
  const [active, setActive] = useState(0);
  const prompts = promptList(screen);
  return <div className="layout-composition dynamic-panel">
    <div className="dynamic-list"><Heading screen={screen} eyebrow="ABRÍ UN CASO" />{prompts.map((prompt, index) => <button type="button" className={active === index ? "active" : ""} key={`${prompt}-${index}`} onClick={() => setActive(index)}><span>{index + 1}</span><Copy value={prompt} /></button>)}</div>
    <article><button type="button" className="back" onClick={() => setActive((value) => Math.max(0, value - 1))}>← Volver</button><small>CASO {active + 1}</small><h3><Copy value={prompts[active]} /></h3><p>{screen.body}</p><strong>{screen.answers[active] || screen.answers[0] || "Explicá el cambio con tus palabras."}</strong></article>
  </div>;
}

export function GrammarContrast({ screen }: LayoutProps) {
  const [selected, setSelected] = useState<Record<number, "SER" | "ESTAR">>({});
  const [ser = "", estar = ""] = (screen.body || "").split(/ESTAR\s*→/i);
  return <div className="layout-composition grammar-contrast">
    <Heading screen={screen} eyebrow="CONTRASTE" />
    <div className="contrast-columns"><article><small>QUIÉN · ORIGEN · IDENTIDAD</small><strong>SER</strong><p>{ser.replace(/SER\s*→/i, "").trim()}</p></article><i>VS</i><article><small>DÓNDE · ESTADO · CONDICIÓN</small><strong>ESTAR</strong><p>{estar.trim()}</p></article></div>
    <div className="contrast-choices">{promptList(screen).map((prompt, index) => <div key={`${prompt}-${index}`}><span><Copy value={prompt} /></span><button type="button" className={selected[index] === "SER" ? "active" : ""} onClick={() => setSelected((current) => ({ ...current, [index]: "SER" }))}>SER</button><button type="button" className={selected[index] === "ESTAR" ? "active" : ""} onClick={() => setSelected((current) => ({ ...current, [index]: "ESTAR" }))}>ESTAR</button></div>)}</div>
  </div>;
}

export function SentenceBuilder({ screen }: LayoutProps) {
  const tiles = useMemo(() => screen.prompts.length >= 4 ? screen.prompts : (screen.body || "").split(/\s*[·/+]+\s*/).filter(Boolean).slice(0, 12), [screen.body, screen.prompts]);
  const [sentence, setSentence] = useState<string[]>([]);
  return <div className="layout-composition sentence-builder-canva">
    <Heading screen={screen} eyebrow="CONSTRUÍ" />
    <div className="sentence-output">{sentence.length ? sentence.join(" ") : "Tocá las piezas para construir tu frase"}</div>
    <div className="sentence-tiles">{tiles.map((tile, index) => <button type="button" key={`${tile}-${index}`} onClick={() => setSentence((current) => [...current, tile])}><Copy value={tile} /></button>)}</div>
    <div className="sentence-actions"><button type="button" onClick={() => setSentence([])}>Reiniciar</button><button type="button" onClick={() => setSentence([screen.answers[0] || tiles.join(" ")])}>Ver modelo</button></div>
  </div>;
}

export function FeedbackScreen({ screen }: LayoutProps) {
  const [message, setMessage] = useState("");
  return <div className="layout-composition feedback-screen">
    <Heading screen={screen} eyebrow="FEEDBACK" />
    <div className="feedback-categories">{promptList(screen).map((prompt, index) => <label key={`${prompt}-${index}`}><span>{prompt}</span><input aria-label={prompt} placeholder={index === 0 ? "Anotá un logro" : index === 1 ? "Una corrección útil" : "El próximo paso"} /></label>)}</div>
    <label className="student-message"><span>MENSAJE PARA EL ESTUDIANTE</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Hoy lograste… En la próxima clase vamos a…" /></label>
    <button type="button" onClick={() => void navigator.clipboard?.writeText(message)}>Copiar mensaje</button>
  </div>;
}

function TeacherReveal({ screen }: { screen: LessonScreen }) {
  const [open, setOpen] = useState(false);
  if (!screen.answers.length && !screen.teacherNotes.length) return null;
  return <div className="teacher-reveal"><button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "Ocultar respuesta" : "Respuesta docente"}</button>{open && <aside><strong>Respuesta o modelo</strong>{screen.answers.map((answer, index) => <p key={`${answer}-${index}`}>{answer}</p>)}{screen.teacherNotes[0] && <small>{screen.teacherNotes[0]}</small>}</aside>}</div>;
}

const registry: Record<string, (props: LayoutProps) => React.ReactNode> = {
  "hero-cover": HeroCover,
  "visual-menu-grid": VisualMenuGrid,
  "split-image-questions": SplitImageQuestions,
  "how-it-works-cards": HowItWorksCards,
  "map-hub": MapHub,
  "vocabulary-expression-bank": VocabularyExpressionBank,
  "role-play-scenario": RolePlayScenario,
  "photo-choice": PhotoChoice,
  "opinion-switch": OpinionSwitch,
  "rapid-fire": RapidFire,
  "final-manifesto": FinalManifesto,
  "dynamic-panel": DynamicPanel,
  "grammar-contrast": GrammarContrast,
  "canva-sentence-builder": SentenceBuilder,
  "feedback-screen": FeedbackScreen,
};

export function CanvaCanvas({ screen, visualSystem, onNext, onNavigate }: LayoutProps & { visualSystem: VisualSystem }) {
  const Layout = registry[screen.layout] ?? DynamicPanel;
  return <section className={`canva-canvas ${visualSystemClass(visualSystem)} canva-layout-${screen.layout}`} data-layout={screen.layout}>
    <Layout screen={screen} onNext={onNext} onNavigate={onNavigate} />
    <TeacherReveal screen={screen} />
  </section>;
}
