"use client";

import { useState } from "react";
import type { LessonDraft, LessonLevel, LessonStyle, VisualStyle } from "@/lib/lesson";

const levels: LessonLevel[] = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];

export default function HomePage() {
  const [source, setSource] = useState("A conversation lesson about living abroad and adapting to a new culture");
  const [language, setLanguage] = useState("Spanish");
  const [level, setLevel] = useState<LessonLevel>("B1");
  const [duration, setDuration] = useState<30 | 45 | 60 | 90>(60);
  const [studentType, setStudentType] = useState<"individual" | "group">("individual");
  const [lessonStyle, setLessonStyle] = useState<LessonStyle>("balanced");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("retro");
  const [lesson, setLesson] = useState<LessonDraft | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateLesson() {
    setLoading(true);
    setStatus("Building the lesson structure…");

    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, language, level, duration, studentType, lessonStyle, visualStyle }),
      });
      const data = (await response.json()) as { lesson?: LessonDraft; error?: string };
      if (!response.ok || !data.lesson) throw new Error(data.error || "Lesson generation failed.");
      setLesson(data.lesson);
      setStatus(`${data.lesson.slides.length} screens generated. Ready to edit and present.`);
      requestAnimationFrame(() => document.getElementById("preview")?.scrollIntoView({ behavior: "smooth" }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Lesson generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand"><span>Super</span>class</div>
        <div className="nav-note">AI lesson builder for language teachers</div>
      </nav>

      <section className="hero">
        <div>
          <span className="eyebrow">FROM IDEA TO READY-TO-TEACH</span>
          <h1>Build the whole class, not just the slides.</h1>
          <p className="hero-copy">
            Turn an idea, transcript, article, or video concept into a complete language lesson with warm-up, vocabulary, comprehension, discussion, practice, review, homework, and teacher notes.
          </p>
          <div className="proof-row">
            <span className="proof-pill">A0–C2</span>
            <span className="proof-pill">30–90 minutes</span>
            <span className="proof-pill">Classroom mode</span>
            <span className="proof-pill">No blank canvas</span>
          </div>
        </div>

        <div className="builder">
          <h2>Create the first lesson</h2>
          <p className="builder-sub">The current MVP generates a structured draft locally. The AI provider plugs into the same endpoint next.</p>

          <div className="field">
            <label htmlFor="source">What do you want to teach?</label>
            <textarea id="source" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Paste an idea, article, transcript, or video notes…" />
          </div>

          <div className="grid">
            <div className="field">
              <label htmlFor="language">Language</label>
              <input id="language" value={language} onChange={(event) => setLanguage(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="level">Level</label>
              <select id="level" value={level} onChange={(event) => setLevel(event.target.value as LessonLevel)}>
                {levels.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="duration">Duration</label>
              <select id="duration" value={duration} onChange={(event) => setDuration(Number(event.target.value) as 30 | 45 | 60 | 90)}>
                {[30, 45, 60, 90].map((item) => <option key={item} value={item}>{item} minutes</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="studentType">Class type</label>
              <select id="studentType" value={studentType} onChange={(event) => setStudentType(event.target.value as "individual" | "group")}>
                <option value="individual">Individual</option>
                <option value="group">Group</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Lesson focus</label>
            <div className="choice-row">
              {(["conversation", "balanced", "grammar"] as LessonStyle[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`choice ${lessonStyle === item ? "active" : ""}`}
                  aria-pressed={lessonStyle === item}
                  onClick={() => setLessonStyle(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Visual style</label>
            <div className="choice-row">
              {(["retro", "clean", "editorial"] as VisualStyle[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`choice ${visualStyle === item ? "active" : ""}`}
                  aria-pressed={visualStyle === item}
                  onClick={() => setVisualStyle(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <button className="generate" type="button" disabled={loading} onClick={generateLesson}>
            {loading ? "Generating…" : "Generate My Lesson"}
          </button>
          <div className="status" aria-live="polite">{status}</div>
        </div>
      </section>

      {lesson && (
        <section className="preview" id="preview">
          <div className="preview-head">
            <div>
              <h2>{lesson.title}</h2>
              <div className="preview-meta">{lesson.language} · {lesson.level} · {lesson.duration} minutes · {lesson.slides.length} screens</div>
            </div>
            <div className="preview-meta">{lesson.objective}</div>
          </div>
          <div className="slides">
            {lesson.slides.slice(0, 3).map((slide, index) => (
              <article className="slide" key={slide.id}>
                <small>Screen {index + 1} · {slide.type}</small>
                <h3>{slide.title}</h3>
                <p>{slide.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
