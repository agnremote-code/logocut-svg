"use client";

import { useState } from "react";
import { ClassroomMode } from "@/components/ClassroomMode";
import { track } from "@/lib/analytics";
import { productConfig } from "@/lib/config";
import { toStudentLesson } from "@/lib/lesson/modes";
import type { LessonDraft, LessonScreen } from "@/types/lesson";

type Props = {
  lesson: LessonDraft;
  onChange: (lesson: LessonDraft) => void;
  onNew: () => void;
};

function editableValue(screen: LessonScreen, key: "title" | "instruction" | "body") {
  return screen[key] ?? "";
}

export function LessonWorkspace({ lesson, onChange, onNew }: Props) {
  const [selected, setSelected] = useState(0);
  const [editing, setEditing] = useState(false);
  const [classroom, setClassroom] = useState(false);
  const [printMode, setPrintMode] = useState<"teacher" | "student">("teacher");
  const [regenerating, setRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState("");
  const screen = lesson.screens[Math.min(selected, lesson.screens.length - 1)];
  const previewLimit = productConfig.lockMarketingPreview ? 3 : lesson.screens.length;
  const lockedCount = Math.max(lesson.screens.length - previewLimit, 0);

  const updateScreen = (next: LessonScreen) => {
    onChange({ ...lesson, screens: lesson.screens.map((item) => item.id === screen.id ? next : item) });
    track("screen_edited", { level: lesson.level, duration: lesson.duration });
  };
  const move = (direction: -1 | 1) => {
    const nextIndex = selected + direction;
    if (nextIndex < 0 || nextIndex >= lesson.screens.length) return;
    const screens = [...lesson.screens];
    [screens[selected], screens[nextIndex]] = [screens[nextIndex], screens[selected]];
    onChange({ ...lesson, screens });
    setSelected(nextIndex);
  };
  const duplicate = () => {
    const copy = { ...screen, id: `${screen.id}-copy-${Date.now()}`, title: `${screen.title} — copy` };
    const screens = [...lesson.screens];
    screens.splice(selected + 1, 0, copy);
    onChange({ ...lesson, screens });
    setSelected(selected + 1);
  };
  const remove = () => {
    if (lesson.screens.length <= 1) return;
    onChange({ ...lesson, screens: lesson.screens.filter((item) => item.id !== screen.id) });
    setSelected(Math.max(selected - 1, 0));
  };
  const add = () => {
    const next: LessonScreen = {
      id: `screen-custom-${Date.now()}`,
      type: "controlled-practice",
      title: "New practice screen",
      instruction: "Add one clear instruction.",
      body: "",
      prompts: ["Add a student prompt."],
      vocabulary: [],
      answers: [],
      teacherNotes: ["Add a private teaching note."],
      timing: 4,
    };
    onChange({ ...lesson, screens: [...lesson.screens, next] });
    setSelected(lesson.screens.length);
    setEditing(true);
  };
  const regenerate = async () => {
    setRegenerating(true);
    setRegenerationError("");
    try {
      const response = await fetch("/api/lessons/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson, screenId: screen.id }),
      });
      const data = (await response.json()) as { lesson?: LessonDraft; error?: string };
      if (!response.ok || !data.lesson) throw new Error(data.error || "This screen could not be refreshed.");
      onChange(data.lesson);
    } catch (error) {
      setRegenerationError(error instanceof Error ? error.message : "This screen could not be refreshed.");
    } finally {
      setRegenerating(false);
    }
  };
  const print = () => {
    setPrintMode(printMode);
    track("print_started", { level: lesson.level, duration: lesson.duration });
    window.requestAnimationFrame(() => window.print());
  };

  return (
    <section className={`workspace visual-${lesson.visualStyle} print-${printMode}`} id="lesson-workspace" aria-labelledby="workspace-title">
      <header className="workspace-header">
        <div>
          <span className="section-kicker">YOUR LESSON IS READY</span>
          <h2 id="workspace-title">{lesson.title}</h2>
          <p>{lesson.language} · {lesson.dialect} · {lesson.level} · {lesson.duration} minutes</p>
        </div>
        <div className="workspace-actions">
          <button type="button" className="secondary-button" onClick={onNew}>New lesson</button>
          <button type="button" className="primary-button small" onClick={() => { setClassroom(true); track("classroom_mode_started", { level: lesson.level, duration: lesson.duration }); }}>
            Present class
          </button>
        </div>
      </header>

      <div className="overview-grid">
        <article><small>STUDENT PROFILE</small><p>{lesson.studentProfile}</p></article>
        <article><small>OBJECTIVES</small><ul>{lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></article>
        <article className="screen-count"><strong>{lesson.screens.length}</strong><span>purpose-built screens</span><small>{lesson.levelSignals.join(" · ")}</small></article>
      </div>

      <div className="workspace-toolbar">
        <div className="mode-switch">
          <button type="button" aria-pressed={!editing} onClick={() => setEditing(false)}>Preview</button>
          <button type="button" aria-pressed={editing} onClick={() => setEditing(true)}>Edit mode</button>
        </div>
        <div className="print-controls">
          <label>
            Print version
            <select value={printMode} onChange={(event) => setPrintMode(event.target.value as "teacher" | "student")}>
              <option value="teacher">Teacher — notes and answers</option>
              <option value="student">Student — clean handout</option>
            </select>
          </label>
          <button type="button" className="secondary-button" onClick={print}>Print / Save PDF</button>
        </div>
      </div>

      <div className="workspace-body">
        <aside className="slide-strip" aria-label="Lesson screens">
          {lesson.screens.map((item, index) => {
            const locked = index >= previewLimit;
            return (
              <button
                type="button"
                key={item.id}
                className={`${selected === index ? "thumbnail selected" : "thumbnail"} ${locked ? "locked" : ""}`}
                aria-pressed={selected === index}
                disabled={locked}
                onClick={() => setSelected(index)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{item.title}</b>
                <small>{locked ? "Locked preview" : item.type.replaceAll("-", " ")}</small>
              </button>
            );
          })}
        </aside>

        <div className="editor-stage">
          {editing ? (
            <div className="edit-panel">
              <div className="edit-topline"><span>Edit screen {selected + 1}</span><b>{screen.type.replaceAll("-", " ")}</b></div>
              {(["title", "instruction", "body"] as const).map((key) => (
                <label className="field" key={key}>
                  <span>{key}</span>
                  {key === "title" ? (
                    <input value={editableValue(screen, key)} onChange={(event) => updateScreen({ ...screen, [key]: event.target.value })} />
                  ) : (
                    <textarea value={editableValue(screen, key)} onChange={(event) => updateScreen({ ...screen, [key]: event.target.value })} />
                  )}
                </label>
              ))}
              <label className="field">
                <span>Prompts — one per line</span>
                <textarea value={screen.prompts.join("\n")} onChange={(event) => updateScreen({ ...screen, prompts: event.target.value.split("\n").filter(Boolean) })} />
              </label>
              <label className="field teacher-field">
                <span>Private teacher notes — one per line</span>
                <textarea value={screen.teacherNotes.join("\n")} onChange={(event) => updateScreen({ ...screen, teacherNotes: event.target.value.split("\n").filter(Boolean) })} />
              </label>
              <div className="screen-actions">
                <button type="button" onClick={() => void regenerate()} disabled={regenerating}>{regenerating ? "Refreshing…" : "Refresh this screen"}</button>
                <button type="button" onClick={() => move(-1)} disabled={selected === 0}>Move up</button>
                <button type="button" onClick={() => move(1)} disabled={selected === lesson.screens.length - 1}>Move down</button>
                <button type="button" onClick={duplicate}>Duplicate</button>
                <button type="button" onClick={add}>Add screen</button>
                <button type="button" className="danger-button" onClick={remove}>Delete</button>
              </div>
              {regenerationError && <p className="inline-error" role="alert">{regenerationError}</p>}
            </div>
          ) : (
            <article className={`lesson-canvas type-${screen.type}`}>
              <span className="screen-type">{screen.type.replaceAll("-", " ")}</span>
              <h3>{screen.title}</h3>
              <p className="canvas-instruction">{screen.instruction}</p>
              {screen.body && <p>{screen.body}</p>}
              {screen.sourceExcerpt && <blockquote>{screen.sourceExcerpt}</blockquote>}
              {screen.prompts.length > 0 && <div className="canvas-prompts">{screen.prompts.map((prompt) => <div key={prompt}>{prompt}</div>)}</div>}
              {screen.vocabulary.length > 0 && <div className="canvas-vocab">{screen.vocabulary.map((item) => <div key={item.term}><b>{item.term}</b><span>{item.meaning}</span></div>)}</div>}
            </article>
          )}
        </div>

        <aside className="teacher-panel">
          <div><span>TEACHER MODE</span><b>{screen.timing} min</b></div>
          <h3>Private guidance</h3>
          {screen.teacherNotes.length ? screen.teacherNotes.map((note) => <p key={note}>{note}</p>) : <p>Add private notes in edit mode.</p>}
          {screen.answers.length > 0 && <details><summary>Expected answers</summary>{screen.answers.map((answer) => <p key={answer}>{answer}</p>)}</details>}
        </aside>
      </div>

      {lockedCount > 0 && (
        <div className="unlock-banner">
          <div><span>{lockedCount} more screens are ready</span><p>Complete practice, review, homework, teacher notes and answer key.</p></div>
          <button type="button" className="primary-button" onClick={() => track("unlock_cta_clicked", { level: lesson.level, duration: lesson.duration })}>
            Unlock the Full Lesson
          </button>
          <small>Demo only — checkout is not connected.</small>
        </div>
      )}

      <div className="print-layout" aria-hidden="true">
        {(printMode === "student" ? toStudentLesson(lesson).screens : lesson.screens).map((item, index) => (
          <article key={item.id}>
            <small>{index + 1} · {item.type}</small><h2>{item.title}</h2><p>{item.instruction}</p>
            {item.body && <p>{item.body}</p>}
            {item.prompts.map((prompt) => <p key={prompt}>• {prompt}</p>)}
            {printMode === "teacher" && item.answers.map((answer) => <p key={answer}><b>Answer:</b> {answer}</p>)}
            {printMode === "teacher" && item.teacherNotes.map((note) => <p key={note}><b>Teacher:</b> {note}</p>)}
          </article>
        ))}
      </div>

      {classroom && <ClassroomMode lesson={lesson} initialIndex={selected} onExit={() => setClassroom(false)} />}
    </section>
  );
}
