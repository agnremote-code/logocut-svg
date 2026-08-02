"use client";

import { useEffect, useState } from "react";
import { CanvaCanvas } from "@/components/canva/CanvaLayouts";
import { ClassroomMode } from "@/components/ClassroomMode";
import { visualSystemForLesson } from "@/lib/lesson/canva-storyboard";
import { track } from "@/lib/analytics";
import type { LessonDraft } from "@/types/lesson";

type Props = {
  lesson: LessonDraft;
  onChange: (lesson: LessonDraft) => void;
  onNew: () => void;
  onSave: () => void;
};

export function LessonWorkspace({ lesson, onChange, onNew, onSave }: Props) {
  const [selected, setSelected] = useState(0);
  const [classroom, setClassroom] = useState(false);
  const [changePrompt, setChangePrompt] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const screen = lesson.screens[Math.min(selected, lesson.screens.length - 1)];
  const visualSystem = visualSystemForLesson(lesson);

  useEffect(() => setSelected((index) => Math.min(index, lesson.screens.length - 1)), [lesson.screens.length]);

  async function regenerate() {
    setRegenerating(true);
    setError("");
    try {
      const response = await fetch("/api/lessons/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson, screenId: screen.id, change: changePrompt.trim() }),
      });
      const data = await response.json() as { lesson?: LessonDraft; error?: string };
      if (!response.ok || !data.lesson) throw new Error(data.error || "This screen could not be regenerated.");
      onChange(data.lesson);
      setChangePrompt("");
      track("screen_edited", { level: lesson.level, duration: lesson.duration });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This screen could not be regenerated.");
    } finally {
      setRegenerating(false);
    }
  }

  function save() {
    onSave();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1_800);
  }

  return <section className="canva-studio" id="lesson-workspace" aria-label={`Editing ${lesson.title}`}>
    <header className="studio-topbar">
      <button type="button" className="studio-brand" onClick={onNew}><span>Super</span>class</button>
      <div><h1>{lesson.title}</h1><p>{lesson.language} · {lesson.level} · {lesson.duration} min · {lesson.screens.length} screens</p></div>
      <div className="studio-actions"><button type="button" onClick={() => setClassroom(true)}>Present</button><button type="button" className="studio-save" onClick={save}>{saved ? "Saved ✓" : "Save"}</button></div>
    </header>

    <div className="studio-grid">
      <aside className="studio-thumbnails" aria-label="Class screens">
        {lesson.screens.map((item, index) => <button type="button" key={item.id} className={selected === index ? "active" : ""} aria-pressed={selected === index} onClick={() => setSelected(index)}>
          <span>{String(index + 1).padStart(2, "0")}</span><div><b>{item.title}</b><small>{item.layout.replaceAll("-", " ")}</small></div>
        </button>)}
      </aside>

      <main className="studio-stage">
        <div className="studio-canvas-wrap">
          <CanvaCanvas key={screen.id} screen={screen} visualSystem={visualSystem} onNext={() => setSelected((index) => Math.min(index + 1, lesson.screens.length - 1))} onNavigate={(index) => setSelected(Math.min(index, lesson.screens.length - 1))} />
        </div>
        <div className="studio-prompt">
          <input value={changePrompt} onChange={(event) => setChangePrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !regenerating) void regenerate(); }} placeholder="Describe a change..." aria-label="Describe a change" />
          <button type="button" disabled={regenerating} onClick={() => void regenerate()}>{regenerating ? "Regenerating…" : "Regenerate this screen"}</button>
        </div>
        {error && <p className="studio-error" role="alert">{error}</p>}
      </main>
    </div>
    {classroom && <ClassroomMode lesson={lesson} initialIndex={selected} onExit={() => setClassroom(false)} />}
  </section>;
}
