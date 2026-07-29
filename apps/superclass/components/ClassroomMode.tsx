"use client";

import { useEffect, useState } from "react";
import type { LessonDraft } from "@/types/lesson";

type Props = {
  lesson: LessonDraft;
  initialIndex: number;
  onExit: () => void;
};

export function ClassroomMode({ lesson, initialIndex, onExit }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [teacherMode, setTeacherMode] = useState(false);
  const [answersVisible, setAnswersVisible] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const screen = lesson.screens[index];

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") setIndex((value) => Math.min(value + 1, lesson.screens.length - 1));
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

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className={`classroom visual-${lesson.visualStyle}`} role="dialog" aria-modal="true" aria-label="Classroom presentation">
      <header className="classroom-topbar">
        <div><b>Superclass</b><span>{lesson.level} · {lesson.language}</span></div>
        <div className="classroom-actions">
          <span className="timer" aria-label={`Timer ${clock}`}>{clock}</span>
          <button type="button" aria-pressed={teacherMode} onClick={() => { setTeacherMode((value) => !value); setAnswersVisible(false); }}>
            {teacherMode ? "Teacher mode" : "Student mode"}
          </button>
          <button type="button" onClick={onExit}>Exit</button>
        </div>
      </header>

      <main className={`classroom-screen type-${screen.type}`}>
        <div className="classroom-content">
          <span className="screen-type">{screen.type.replaceAll("-", " ")}</span>
          <h1>{screen.title}</h1>
          <p className="classroom-instruction">{screen.instruction}</p>
          {screen.body && <p className="classroom-body">{screen.body}</p>}
          {screen.sourceExcerpt && <blockquote>{screen.sourceExcerpt}</blockquote>}
          {screen.videoId && (
            <iframe
              className="video-frame"
              src={`https://www.youtube-nocookie.com/embed/${screen.videoId}`}
              title="Lesson video"
              allow="accelerometer; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          )}
          {screen.prompts.length > 0 && <div className="prompt-grid">{screen.prompts.map((prompt) => <div key={prompt}>{prompt}</div>)}</div>}
          {screen.vocabulary.length > 0 && (
            <div className="vocab-grid">{screen.vocabulary.map((item) => <div key={item.term}><b>{item.term}</b><span>{item.meaning}</span></div>)}</div>
          )}
        </div>
        {teacherMode && (
          <aside className="teacher-drawer">
            <div className="teacher-drawer-head"><span>Private teacher view</span><b>{screen.timing} min</b></div>
            {screen.teacherNotes.map((note) => <p key={note}>{note}</p>)}
            {screen.answers.length > 0 && (
              <>
                <button type="button" className="reveal-button" aria-expanded={answersVisible} onClick={() => setAnswersVisible((value) => !value)}>
                  {answersVisible ? "Hide answers" : "Reveal answers"}
                </button>
                {answersVisible && <div className="answer-panel">{screen.answers.map((answer) => <p key={answer}>{answer}</p>)}</div>}
              </>
            )}
          </aside>
        )}
      </main>

      <footer className="classroom-footer">
        <button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)} aria-label="Previous screen">←</button>
        <span>{index + 1} / {lesson.screens.length}</span>
        <button type="button" disabled={index === lesson.screens.length - 1} onClick={() => setIndex((value) => value + 1)} aria-label="Next screen">→</button>
      </footer>
    </div>
  );
}
