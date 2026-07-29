"use client";

import { useEffect, useMemo, useState } from "react";
import { groupLessonModules, initialActivityState, moduleForScreen, toggleActivityChoice, toggleFlashcard, type ActivityState } from "@/lib/lesson/activity";
import type { LessonDraft, LessonScreen } from "@/types/lesson";

type Props = { lesson: LessonDraft; initialIndex: number; onExit: () => void };

function Activity({ screen, state, setState }: { screen: LessonScreen; state: ActivityState; setState: (state: ActivityState) => void }) {
  if (screen.layout === "cover") {
    return <div className="cover-composition" aria-hidden="true"><i /><i /><i /><span>01</span><b>READY TO TEACH</b></div>;
  }
  if (screen.layout === "comparison") {
    const [ser = "", estar = ""] = (screen.body ?? "").split(/ESTAR\s*→/i);
    return <div className="grammar-comparison">
      <article className="ser-column"><small>IDENTITY · ORIGIN · PROFESSION</small><strong>SER</strong><p>{ser.replace(/SER\s*→/i, "").trim()}</p></article>
      <div className="comparison-vs">VS</div>
      <article className="estar-column"><small>LOCATION · STATE · EMOTION</small><strong>ESTAR</strong><p>{estar.trim()}</p></article>
    </div>;
  }
  if (screen.layout === "rule-cards" || screen.layout === "example-gallery") {
    return <div className="rule-gallery">{screen.prompts.map((prompt, index) => <article key={prompt} className={index % 2 ? "estar-rule" : "ser-rule"}><span>{String(index + 1).padStart(2, "0")}</span><p>{prompt}</p></article>)}</div>;
  }
  if (screen.layout === "sorting") {
    return <div className="sorting-board">
      <div className="sort-zone ser-zone"><small>DROP / CHOOSE</small><strong>SER</strong></div>
      <div className="sort-cards">{screen.prompts.map((prompt, index) => <button type="button" aria-pressed={state.selected.includes(index)} key={prompt} onClick={() => setState(toggleActivityChoice(state, index))}>{state.selected.includes(index) ? "✓ " : ""}{prompt}</button>)}</div>
      <div className="sort-zone estar-zone"><small>DROP / CHOOSE</small><strong>ESTAR</strong></div>
    </div>;
  }
  if (screen.layout === "dialogue") {
    const turns = (screen.body ?? "").split(/(?=[AB]:)/).filter(Boolean);
    return <div className="dialogue-stage">{turns.map((turn, index) => <div key={`${turn}-${index}`} className={index % 2 ? "bubble right" : "bubble left"}><span>{index % 2 ? "B" : "A"}</span><p>{turn.replace(/^[AB]:\s*/, "")}</p></div>)}</div>;
  }
  if (screen.layout === "fill-gap" || screen.layout === "sentence-builder") {
    return <div className="sentence-workbench">{screen.prompts.map((prompt, index) => <button type="button" className={state.selected.includes(index) ? "sentence-tile selected" : "sentence-tile"} key={prompt} onClick={() => setState(toggleActivityChoice(state, index))}><span>{index + 1}</span><p>{prompt}</p><i>___</i></button>)}</div>;
  }
  if (screen.type === "vocabulary") {
    return <div className="activity-flashcards">{screen.vocabulary.map((item, index) => {
      const flipped = state.flipped.includes(index);
      return <button type="button" className={flipped ? "flashcard flipped" : "flashcard"} key={item.term} onClick={() => setState(toggleFlashcard(state, index))}>
        <small>{flipped ? "MEANING + MODEL" : "WORD / PHRASE"}</small><strong>{flipped ? item.meaning : item.term}</strong>{flipped && <span>{item.example}</span>}
      </button>;
    })}</div>;
  }
  if (screen.type === "microgrammar" || screen.type === "error-correction" || screen.type === "comprehension") {
    return <div className="choice-activity">{screen.prompts.map((prompt, index) => (
      <button type="button" aria-pressed={state.selected.includes(index)} className={state.selected.includes(index) ? "choice selected" : "choice"} key={prompt} onClick={() => setState(toggleActivityChoice(state, index))}>
        <span>{String.fromCharCode(65 + index)}</span>{prompt}
      </button>
    ))}</div>;
  }
  if (screen.type === "pronunciation") {
    return <div className="pronunciation-drill"><div className="sound-wave">{[1,2,3,4,5,6,7,8,9,10,11,12].map((bar) => <i key={bar} style={{ height: `${18 + (bar % 5) * 12}px` }} />)}</div>{screen.prompts.map((prompt) => <button type="button" key={prompt}>▶ {prompt}</button>)}</div>;
  }
  if (screen.type === "discussion" || screen.type === "debate" || screen.type === "personal-questions" || screen.type === "warmup") {
    return <div className="conversation-cards">{screen.prompts.map((prompt, index) => <article className={state.selected.includes(index) ? "active" : ""} key={prompt}><small>PROMPT {index + 1}</small><p>{prompt}</p><button type="button" onClick={() => setState(toggleActivityChoice(state, index))}>{state.selected.includes(index) ? "Completed ✓" : "Start prompt"}</button></article>)}</div>;
  }
  return <div className="question-cards">{screen.prompts.length ? screen.prompts.map((prompt, index) => <article key={prompt}><span>{index + 1}</span><p>{prompt}</p></article>) : <article><span>→</span><p>{screen.body || screen.instruction}</p></article>}</div>;
}

export function ClassroomMode({ lesson, initialIndex, onExit }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [teacherMode, setTeacherMode] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
  const fullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };

  return (
    <div className={`lesson-player visual-${lesson.visualStyle} ${sidebarOpen ? "" : "sidebar-closed"} ${teacherMode && panelOpen ? "" : "panel-closed"}`} role="dialog" aria-modal="true" aria-label="Interactive Lesson Player">
      <header className="player-topbar">
        <div className="player-identity"><b>{lesson.title}</b><span>{lesson.level} · {lesson.language} · {lesson.dialect}</span></div>
        <div className="player-session"><span><small>ELAPSED</small>{elapsed}</span><span><small>PLANNED</small>{lesson.duration} min</span><span><small>MODULE</small>{moduleForScreen(screen)}</span></div>
        <div className="player-actions">
          <button type="button" aria-pressed={teacherMode} onClick={() => setTeacherMode((value) => !value)}>{teacherMode ? "Teacher" : "Student"} mode</button>
          <button type="button" onClick={() => void fullscreen()}>Fullscreen</button>
          <button type="button" onClick={onExit}>Exit</button>
        </div>
        <div className="player-progress"><i style={{ width: `${((index + 1) / lesson.screens.length) * 100}%` }} /></div>
      </header>

      <aside className="module-sidebar">
        <button className="collapse-control" type="button" onClick={() => setSidebarOpen(false)}>← Collapse</button>
        <strong>Lesson modules</strong>
        {modules.map((group) => {
          const active = group.indexes.includes(index);
          const completed = group.indexes.every((item) => item < index);
          return <button type="button" key={group.module} className={active ? "module active" : "module"} onClick={() => setIndex(group.indexes[0])}>
            <span>{completed ? "✓" : String(modules.indexOf(group) + 1).padStart(2, "0")}</span><b>{group.module}</b><small>{group.minutes}m · {group.indexes.length}</small>
          </button>;
        })}
      </aside>
      {!sidebarOpen && <button className="sidebar-reopen" type="button" onClick={() => setSidebarOpen(true)}>Modules →</button>}

      <main className="teaching-stage">
        <section className={`classroom-canvas layout-${screen.layout}`}>
        <div className="canvas-motif" aria-hidden="true"><i /><i /><i /></div>
        <div className="stage-label"><span>{moduleForScreen(screen)}</span><b>Activity {index + 1} of {lesson.screens.length}</b></div>
        <h1>{screen.title}</h1>
        <p className="stage-instruction">{screen.instruction}</p>
        {screen.sourceExcerpt && <blockquote>{screen.sourceExcerpt}</blockquote>}
        {screen.videoId && <iframe className="video-frame" src={`https://www.youtube-nocookie.com/embed/${screen.videoId}`} title="Lesson video" allowFullScreen />}
        <Activity screen={screen} state={state} setState={updateState} />
        <div className="activity-controls">
          <button type="button" onClick={() => updateState(initialActivityState)}>Reset activity</button>
          {teacherMode && screen.answers.length > 0 && <button type="button" aria-expanded={state.revealed} onClick={() => updateState({ ...state, revealed: !state.revealed })}>{state.revealed ? "Hide answer" : "Reveal answer"}</button>}
        </div>
        {teacherMode && state.revealed && <div className="model-answer"><small>TEACHER ANSWER / MODEL</small>{screen.answers.map((answer) => <p key={answer}>{answer}</p>)}</div>}
        </section>
      </main>

      {teacherMode && panelOpen && <aside className="private-teacher-panel">
        <button type="button" onClick={() => setPanelOpen(false)}>Hide panel →</button>
        <span>PRIVATE TEACHER PANEL</span><h2>Teaching guide</h2>
        <dl>
          <div><dt>Purpose</dt><dd>{screen.teacherNotes[0] || "Guide one focused communicative outcome."}</dd></div>
          <div><dt>Estimated time</dt><dd>{screen.timing} minutes</dd></div>
          <div><dt>Expected answer</dt><dd>{screen.answers[0] || "Answers vary; listen for a complete, relevant response."}</dd></div>
          <div><dt>Follow-up</dt><dd>{screen.prompts[1] || "Can you add a reason and a personal example?"}</dd></div>
          <div><dt>Likely problem</dt><dd>{lesson.level <= "A2" ? "Incomplete sentences or missing support." : "Ideas may be fluent but imprecise."}</dd></div>
          <div><dt>Suggested correction</dt><dd>{screen.teacherNotes[1] || "Let the learner finish, then reformulate one high-value sentence."}</dd></div>
          <div><dt>Transition</dt><dd>Connect the strongest answer to {lesson.screens[index + 1]?.title || "the class recap"}.</dd></div>
        </dl>
      </aside>}
      {teacherMode && !panelOpen && <button className="panel-reopen" type="button" onClick={() => setPanelOpen(true)}>← Teacher panel</button>}

      <footer className="player-footer">
        <button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>← Previous</button>
        <span>{index + 1} / {lesson.screens.length}</span>
        <button type="button" disabled={index === lesson.screens.length - 1} onClick={() => setIndex((value) => value + 1)}>Next →</button>
      </footer>
    </div>
  );
}
