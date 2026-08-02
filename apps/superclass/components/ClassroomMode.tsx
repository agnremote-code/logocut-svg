"use client";

import { useEffect, useState } from "react";
import { CanvaCanvas } from "@/components/canva/CanvaLayouts";
import { visualSystemForLesson } from "@/lib/lesson/canva-storyboard";
import type { LessonDraft } from "@/types/lesson";

type Props = { lesson: LessonDraft; initialIndex: number; onExit: () => void };

export function ClassroomMode({ lesson, initialIndex, onExit }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [menuOpen, setMenuOpen] = useState(false);
  const screen = lesson.screens[index];
  const visualSystem = visualSystemForLesson(lesson);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown") setIndex((value) => Math.min(value + 1, lesson.screens.length - 1));
      if (event.key === "ArrowLeft" || event.key === "PageUp") setIndex((value) => Math.max(value - 1, 0));
      if (event.key === "Escape") onExit();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [lesson.screens.length, onExit]);

  async function fullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen?.();
    else await document.documentElement.requestFullscreen?.();
  }

  return <div className="canva-presenter" role="dialog" aria-modal="true" aria-label="Class presentation">
    <header><button type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen}>All screens</button><div><b>{lesson.title}</b><span>{index + 1} / {lesson.screens.length}</span></div><div><button type="button" onClick={() => void fullscreen()}>Fullscreen</button><button type="button" onClick={onExit}>Exit</button></div><i style={{ width: `${((index + 1) / lesson.screens.length) * 100}%` }} /></header>
    {menuOpen && <nav className="presenter-menu" aria-label="Presentation screens">{lesson.screens.map((item, itemIndex) => <button type="button" className={itemIndex === index ? "active" : ""} key={item.id} onClick={() => { setIndex(itemIndex); setMenuOpen(false); }}><span>{String(itemIndex + 1).padStart(2, "0")}</span>{item.title}</button>)}</nav>}
    <main><CanvaCanvas key={screen.id} screen={screen} visualSystem={visualSystem} onNext={() => setIndex((value) => Math.min(value + 1, lesson.screens.length - 1))} onNavigate={(next) => setIndex(Math.min(next, lesson.screens.length - 1))} /></main>
    <footer><button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>← Previous</button><span>{screen.layout.replaceAll("-", " ")}</span><button type="button" disabled={index === lesson.screens.length - 1} onClick={() => setIndex((value) => value + 1)}>Next →</button></footer>
  </div>;
}
