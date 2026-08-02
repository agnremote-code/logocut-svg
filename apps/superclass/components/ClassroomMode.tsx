"use client";

import { useEffect, useMemo, useState } from "react";
import { groupLessonModules, initialActivityState, moduleForScreen, toggleActivityChoice, toggleFlashcard, type ActivityState } from "@/lib/lesson/activity";
import {
  BeginnerFeedback, BilingualText, ConnectorBank, ExampleReveal, GuidedQuestionList,
  ImageTopicCard, SentenceStarterBank, TopicMenu, TopicNavigation, VerbBank, VocabularyBank,
} from "@/components/classroom/BeginnerLayouts";
import { VisualComposition } from "@/components/classroom/VisualComposition";
import type { LessonDraft, LessonScreen } from "@/types/lesson";

type Props = { lesson: LessonDraft; initialIndex: number; onExit: () => void };

function Activity({ screen, state, setState }: { screen: LessonScreen; state: ActivityState; setState: (state: ActivityState) => void }) {
  if (screen.layout === "topic-menu") return <TopicMenu screen={screen} />;
  if (screen.layout === "image-topic") return <ImageTopicCard screen={screen} />;
  if (screen.layout === "vocabulary-cards" && screen.vocabulary.length) return <VocabularyBank screen={screen} />;
  if (screen.layout === "verb-bank") return <VerbBank screen={screen} />;
  if (screen.layout === "connector-bank") return <ConnectorBank screen={screen} />;
  if (screen.layout === "guided-questions") return <GuidedQuestionList screen={screen} />;
  if (screen.layout === "feedback") return <BeginnerFeedback screen={screen} />;
  if (screen.layout === "cover") return <VisualComposition screen={screen} purpose="cover-atmosphere" />;
  if (screen.layout === "illustrated-context") return <div className="designed-context">
    <VisualComposition screen={screen} purpose={screen.type === "video" || screen.type === "source" ? "source-context" : "practice-context"} />
    {screen.prompts.length > 0 && <div className="context-prompts">{screen.prompts.map((prompt, index) => <article key={prompt}><span>{String(index + 1).padStart(2, "0")}</span><BilingualText value={prompt} /></article>)}</div>}
  </div>;
  if (screen.layout === "comparison") {
    const [ser = "", estar = ""] = (screen.body ?? "").split(/ESTAR\s*→/i);
    return <div className="grammar-comparison">
      <article className="ser-column"><small>QUIÉN O QUÉ ES</small><strong>SER</strong><p>{ser.replace(/SER\s*→/i, "").trim()}</p></article>
      <div className="comparison-vs">/</div>
      <article className="estar-column"><small>DÓNDE O CÓMO ESTÁ</small><strong>ESTAR</strong><p>{estar.trim()}</p></article>
    </div>;
  }
  if (screen.layout === "rule-cards" || screen.layout === "example-gallery" || screen.layout === "debate-cards") {
    return <div className={`rule-gallery ${screen.layout}`}>{screen.prompts.map((prompt, index) => <article key={prompt} className={index % 2 ? "estar-rule" : "ser-rule"}><span>{String(index + 1).padStart(2, "0")}</span><p><BilingualText value={prompt} /></p></article>)}</div>;
  }
  if (screen.layout === "sorting") {
    return <div className="sorting-board"><div className="sort-zone ser-zone"><strong>A</strong></div><div className="sort-cards">{screen.prompts.map((prompt, index) => <button type="button" aria-pressed={state.selected.includes(index)} key={prompt} onClick={() => setState(toggleActivityChoice(state, index))}>{state.selected.includes(index) ? "✓ " : ""}{prompt}</button>)}</div><div className="sort-zone estar-zone"><strong>B</strong></div></div>;
  }
  if (screen.layout === "dialogue") {
    const turns = (screen.body ?? "").split(/(?=[AB]:)/).filter(Boolean);
    return <div className="dialogue-stage">{turns.map((turn, index) => <div key={`${turn}-${index}`} className={index % 2 ? "bubble right" : "bubble left"}><span>{index % 2 ? "B" : "A"}</span><p>{turn.replace(/^[AB]:\s*/, "")}</p></div>)}</div>;
  }
  if (screen.layout === "fill-gap" || screen.layout === "sentence-builder") {
    if (screen.type === "sentence-frames") return <SentenceStarterBank screen={screen} />;
    return <div className="sentence-workbench">{screen.prompts.map((prompt, index) => <button type="button" className={state.selected.includes(index) ? "sentence-tile selected" : "sentence-tile"} key={prompt} onClick={() => setState(toggleActivityChoice(state, index))}><span>{index + 1}</span><p>{prompt}</p><i>___</i></button>)}</div>;
  }
  if (screen.type === "vocabulary") {
    return <div className="activity-flashcards">{screen.vocabulary.map((item, index) => {
      const flipped = state.flipped.includes(index);
      return <button type="button" className={flipped ? "flashcard flipped" : "flashcard"} key={item.term} onClick={() => setState(toggleFlashcard(state, index))}><small>{flipped ? "MEANING + MODEL" : "WORD / PHRASE"}</small><strong>{flipped ? item.meaning : item.term}</strong>{flipped && <span>{item.example}</span>}</button>;
    })}</div>;
  }
  if (["microgrammar", "error-correction", "comprehension", "controlled-practice"].includes(screen.type)) {
    return <div className="choice-activity">{screen.prompts.map((prompt, index) => <button type="button" aria-pressed={state.selected.includes(index)} className={state.selected.includes(index) ? "choice selected" : "choice"} key={prompt} onClick={() => setState(toggleActivityChoice(state, index))}><span>{String.fromCharCode(65 + index)}</span>{prompt}</button>)}</div>;
  }
  if (["discussion", "debate", "personal-questions", "warmup"].includes(screen.type)) {
    return <div className="conversation-cards">{screen.prompts.map((prompt, index) => <article className={state.selected.includes(index) ? "active" : ""} key={prompt} onClick={() => setState(toggleActivityChoice(state, index))}><small>QUESTION {index + 1}</small><p><BilingualText value={prompt} /></p></article>)}</div>;
  }
  return <div className="question-cards">{screen.prompts.length ? screen.prompts.map((prompt, index) => <article key={prompt}><span>{index + 1}</span><p><BilingualText value={prompt} /></p></article>) : <article><span>→</span><p>{screen.body || screen.instruction}</p></article>}</div>;
}

export function ClassroomMode({ lesson, initialIndex, onExit }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [teacherMode, setTeacherMode] = useState(true);
  const [teacherToolsOpen, setTeacherToolsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [states, setStates] = useState<Record<string, ActivityState>>({});
  const screen = lesson.screens[index];
  const state = states[screen.id] ?? initialActivityState;
  const modules = useMemo(() => groupLessonModules(lesson.screens), [lesson.screens]);
  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setIndex((value) => Math.min(value + 1, lesson.screens.length - 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(value - 1, 0));
      if (event.key === "Escape") onExit();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [lesson.screens.length, onExit]);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const updateState = (next: ActivityState) => setStates((current) => ({ ...current, [screen.id]: next }));
  const move = (next: number) => { setIndex(next); setTeacherToolsOpen(false); setMenuOpen(false); };
  const fullscreen = async () => document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
  const revealLabel = ["personal-questions", "discussion", "debate"].includes(screen.type) ? "Show example" : "Show answer";

  return <div className={`lesson-player visual-${lesson.visualStyle} archetype-${lesson.archetype ?? "intermediate-conversation"}`} role="dialog" aria-modal="true" aria-label="Interactive Lesson Player">
    <header className="player-topbar">
      <div className="player-identity"><b>{lesson.title}</b><span>{lesson.level} · {lesson.language}</span></div>
      <div className="player-session"><span><small>TIME</small>{elapsed}</span><span><small>PLAN</small>{lesson.duration} min</span></div>
      <div className="player-actions">
        <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen}>Menu</button>
        <button type="button" onClick={() => setTeacherToolsOpen((value) => !value)} aria-expanded={teacherToolsOpen}>Teacher tools</button>
        <button type="button" onClick={() => void fullscreen()}>Fullscreen</button>
        <button type="button" onClick={onExit}>Exit</button>
      </div>
      <div className="player-progress"><i style={{ width: `${((index + 1) / lesson.screens.length) * 100}%` }} /></div>
    </header>

    {menuOpen && <aside className="lesson-menu" aria-label="Lesson menu"><h2>Lesson menu</h2>{modules.map((group) => <button type="button" key={group.module} onClick={() => move(group.indexes[0])}><span>{String(modules.indexOf(group) + 1).padStart(2, "0")}</span><b>{group.module}</b><small>{group.minutes} min</small></button>)}</aside>}
    {teacherToolsOpen && <aside className="teacher-tools-drawer" aria-label="Teacher tools">
      <div><h2>Teacher tools</h2><button type="button" onClick={() => setTeacherToolsOpen(false)}>Close</button></div>
      <section className="student-view-control"><small>CLASSROOM PRIVACY</small><button type="button" aria-pressed={!teacherMode} onClick={() => setTeacherMode((value) => !value)}>{teacherMode ? "Switch to student view" : "Return to teacher view"}</button></section>
      {screen.teacherNotes[0] && <section><small>GOAL</small><p>{screen.teacherNotes[0]}</p></section>}
      <section><small>SUGGESTED TIME</small><p>{screen.timing} minutes</p></section>
      {screen.answers[0] && <section><small>ANSWER OR MODEL</small><p><BilingualText value={screen.answers[0]} /></p></section>}
      {screen.teacherNotes[1] && <section><small>OPTIONAL CORRECTION</small><p>{screen.teacherNotes[1]}</p></section>}
    </aside>}

    <main className="teaching-stage">
      <section className={`classroom-canvas layout-${screen.layout}`}>
        <div className="stage-label"><span>{moduleForScreen(screen)}</span><TopicNavigation current={index + 1} total={lesson.screens.length} /></div>
        <h1>{screen.title}</h1>
        <p className="stage-instruction"><BilingualText value={screen.instruction} /></p>
        {screen.sourceExcerpt && <blockquote>{screen.sourceExcerpt}</blockquote>}
        {screen.videoId && <iframe className="video-frame" src={`https://www.youtube-nocookie.com/embed/${screen.videoId}`} title="Lesson video" allowFullScreen />}
        <Activity screen={screen} state={state} setState={updateState} />
        <div className="activity-controls">
          <button type="button" onClick={() => updateState(initialActivityState)}>Reset</button>
          {teacherMode && screen.answers.length > 0 && <button type="button" aria-expanded={state.revealed} onClick={() => updateState({ ...state, revealed: !state.revealed })}>{state.revealed ? "Hide" : revealLabel}</button>}
        </div>
        {teacherMode && state.revealed && <ExampleReveal answers={screen.answers} />}
      </section>
    </main>

    <footer className="player-footer">
      <button type="button" disabled={index === 0} onClick={() => move(index - 1)}>← Previous</button>
      <TopicNavigation current={index + 1} total={lesson.screens.length} />
      <button type="button" disabled={index === lesson.screens.length - 1} onClick={() => move(index + 1)}>Next →</button>
    </footer>
  </div>;
}
