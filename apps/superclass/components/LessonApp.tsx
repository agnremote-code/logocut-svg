"use client";

import { useEffect, useRef, useState } from "react";
import { LessonBuilder } from "@/components/LessonBuilder";
import { LessonWorkspace } from "@/components/LessonWorkspace";
import { MarketingSections } from "@/components/MarketingSections";
import { track } from "@/lib/analytics";
import { demoPresets } from "@/lib/presets";
import { createBrowserDraftStore } from "@/lib/storage/drafts";
import { defaultLessonRequest, type LessonDraft, type LessonRequest } from "@/types/lesson";

export function LessonApp() {
  const [request, setRequest] = useState<LessonRequest>(defaultLessonRequest);
  const [lesson, setLesson] = useState<LessonDraft | null>(null);
  const [recent, setRecent] = useState<LessonDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    const store = createBrowserDraftStore(window.localStorage);
    const latest = store.loadLatest();
    if (latest) setLesson(latest);
    setRecent(store.list());
    track("homepage_view");
  }, []);

  useEffect(() => {
    if (!lesson) return;
    const store = createBrowserDraftStore(window.localStorage);
    store.save(lesson);
    setRecent(store.list());
    if (!viewed.current) {
      viewed.current = true;
      track("lesson_preview_viewed", { level: lesson.level, duration: lesson.duration, visualStyle: lesson.visualStyle, screenCount: lesson.screens.length });
    }
  }, [lesson]);

  const scrollToBuilder = () => document.getElementById("builder")?.scrollIntoView({ behavior: "smooth", block: "start" });

  async function generate(nextRequest = request) {
    setLoading(true);
    setError("");
    track("lesson_generation_started", {
      level: nextRequest.level,
      duration: nextRequest.duration,
      sourceMode: nextRequest.sourceMode,
      visualStyle: nextRequest.visualStyle,
      studentType: nextRequest.studentType,
    });
    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextRequest),
      });
      const data = (await response.json()) as { lesson?: LessonDraft; error?: string };
      if (!response.ok || !data.lesson) throw new Error(data.error || "The lesson could not be generated.");
      setLesson(data.lesson);
      viewed.current = false;
      track("lesson_generation_completed", {
        level: data.lesson.level,
        duration: data.lesson.duration,
        sourceMode: data.lesson.sourceMode,
        visualStyle: data.lesson.visualStyle,
        screenCount: data.lesson.screens.length,
      });
      window.requestAnimationFrame(() => document.getElementById("lesson-workspace")?.scrollIntoView({ behavior: "smooth" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The lesson could not be generated.");
      track("lesson_generation_failed", { reason: "unknown", level: nextRequest.level, duration: nextRequest.duration, sourceMode: nextRequest.sourceMode });
    } finally {
      setLoading(false);
    }
  }

  function selectPreset(id: string, createImmediately = false) {
    const preset = demoPresets.find((item) => item.id === id);
    if (!preset) return;
    setRequest(preset.request);
    setAdvancedOpen(true);
    track("demo_selected", { level: preset.request.level, duration: preset.request.duration, sourceMode: preset.request.sourceMode, visualStyle: preset.request.visualStyle });
    if (createImmediately) void generate(preset.request);
  }

  function startNew() {
    if (lesson && !window.confirm("Start a new lesson? Your current draft is saved in this browser.")) return;
    setLesson(null);
    setRequest(defaultLessonRequest);
    setError("");
    viewed.current = false;
    window.requestAnimationFrame(scrollToBuilder);
  }

  function duplicateDraft(id: string) {
    const store = createBrowserDraftStore(window.localStorage);
    const duplicate = store.duplicate(id);
    if (duplicate) setLesson(duplicate);
    setRecent(store.list());
  }

  function deleteDraft(id: string) {
    if (!window.confirm("Delete this local draft?")) return;
    const store = createBrowserDraftStore(window.localStorage);
    store.remove(id);
    setRecent(store.list());
    if (lesson?.id === id) setLesson(null);
  }

  return (
    <main>
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top"><span>Super</span>class</a>
        <div className="nav-links"><a href="#how-it-works">How it works</a><a href="#pricing">Pricing preview</a></div>
        <button type="button" className="nav-cta" onClick={scrollToBuilder}>Create My Lesson</button>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="hero-kicker">THE LESSON BUILDER THAT THINKS LIKE A TEACHER</span>
          <h1>Turn Any Idea Into a Class Students Remember</h1>
          <p>Create a complete language lesson with conversation, vocabulary, grammar, practice, homework and answer keys. No blank slides. No hours in Canva.</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={scrollToBuilder}>Create My Lesson</button>
            <button className="text-button" type="button" onClick={() => selectPreset("b1-abroad", true)}>See a Demo Lesson <span>→</span></button>
          </div>
          <div className="trust-grid">
            {["A0 to C2", "Ready to present", "Teacher notes included", "Homework and answer key", "Individual or group classes", "No design work required"].map((item) => (
              <span key={item}>✓ {item}</span>
            ))}
          </div>
        </div>
        <div className="hero-visual" aria-label="Example lesson flow">
          <div className="visual-window">
            <div className="visual-top"><span>LESSON 04</span><b>B1 · 60 MIN</b></div>
            <div className="visual-card card-one"><small>WARM-UP</small><h3>When did a new place start to feel like home?</h3></div>
            <div className="visual-card card-two"><small>LANGUAGE TOOLKIT</small><div><b>fit in</b><b>culture shock</b><b>common ground</b></div></div>
            <div className="visual-strip"><span className="active">01</span><span>02</span><span>03</span><span>04</span><span>18</span></div>
          </div>
          <div className="floating-note"><b>Teacher note</b><span>Give 20 seconds to plan. Save correction until the end.</span></div>
        </div>
      </section>

      <LessonBuilder
        request={request}
        setRequest={(next) => { setRequest(next); track("lesson_form_started", { level: next.level, duration: next.duration, sourceMode: next.sourceMode }); }}
        loading={loading}
        error={error}
        advancedOpen={advancedOpen}
        onAdvancedChange={(open) => { setAdvancedOpen(open); if (open) track("advanced_options_opened"); }}
        onPreset={selectPreset}
        onSubmit={() => void generate()}
      />

      {lesson && <LessonWorkspace lesson={lesson} onChange={setLesson} onNew={startNew} />}

      {recent.length > 0 && (
        <section className="draft-library">
          <div><span className="section-kicker">LOCAL DRAFTS</span><h2>Recent lessons in this browser</h2></div>
          <div className="draft-grid">
            {recent.map((draft) => (
              <article key={draft.id}>
                <button type="button" className="draft-open" onClick={() => setLesson(draft)}><b>{draft.title}</b><span>{draft.level} · {draft.duration} min · {draft.screens.length} screens</span></button>
                <div><button type="button" onClick={() => duplicateDraft(draft.id)}>Duplicate</button><button type="button" onClick={() => deleteDraft(draft.id)}>Delete</button></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <MarketingSections onCreate={scrollToBuilder} />
      <footer className="site-footer"><a className="wordmark" href="#top"><span>Super</span>class</a><p>Temporary product demo · deterministic local generation · no external tracking or payments</p></footer>
    </main>
  );
}
