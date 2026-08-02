"use client";

import { useEffect, useState } from "react";
import { LessonBuilder } from "@/components/LessonBuilder";
import { LessonWorkspace } from "@/components/LessonWorkspace";
import { track } from "@/lib/analytics";
import { applyDetectedInput, detectLessonInput } from "@/lib/lesson/input-detection";
import { createBrowserDraftStore } from "@/lib/storage/drafts";
import { emptyLessonRequest, type LessonDraft, type LessonRequest } from "@/types/lesson";

const PREFERENCES_KEY = "superclass:text-to-class-preferences:v1";

export function LessonApp() {
  const [request, setRequest] = useState<LessonRequest>(emptyLessonRequest);
  const [lesson, setLesson] = useState<LessonDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "{}") as Partial<LessonRequest>;
      setRequest((current) => ({
        ...current,
        supportLanguage: stored.supportLanguage ?? current.supportLanguage,
        languageMode: stored.languageMode ?? current.languageMode,
        dialect: stored.dialect ?? current.dialect,
      }));
    } catch {
      // Invalid local preferences are ignored without affecting lesson creation.
    }
    track("homepage_view");
  }, []);

  async function generate() {
    const detected = detectLessonInput(request.source);
    let prepared = applyDetectedInput(request, detected);
    setLoading(true);
    setError("");
    track("lesson_generation_started", { level: prepared.level, duration: prepared.duration, sourceMode: prepared.sourceMode });
    try {
      if (detected.kind === "youtube") {
        const transcriptResponse = await fetch("/api/transcripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: detected.videoUrl }),
        });
        const transcriptData = await transcriptResponse.json() as { transcript?: string; error?: string };
        if (!transcriptResponse.ok || !transcriptData.transcript) {
          throw new Error(transcriptData.error || "YouTube captions are unavailable. Configure the transcript provider or paste the transcript instead.");
        }
        prepared = { ...prepared, transcript: transcriptData.transcript };
      }

      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prepared),
      });
      const data = await response.json() as { lesson?: LessonDraft; error?: string };
      if (!response.ok || !data.lesson) throw new Error(data.error || "The class could not be generated.");
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ supportLanguage: prepared.supportLanguage, languageMode: prepared.languageMode, dialect: prepared.dialect }));
      setRequest(prepared);
      setLesson(data.lesson);
      track("lesson_generation_completed", { level: data.lesson.level, duration: data.lesson.duration, sourceMode: data.lesson.sourceMode, screenCount: data.lesson.screens.length });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The class could not be generated.");
      track("lesson_generation_failed", { level: prepared.level, duration: prepared.duration, sourceMode: prepared.sourceMode });
    } finally {
      setLoading(false);
    }
  }

  function startNew() {
    if (lesson && !window.confirm("Start a new class? Save the current class first if you want to keep it.")) return;
    setLesson(null);
    setRequest((current) => ({ ...emptyLessonRequest, supportLanguage: current.supportLanguage, languageMode: current.languageMode, dialect: current.dialect }));
    setError("");
  }

  function saveLesson(nextLesson = lesson) {
    if (!nextLesson) return;
    createBrowserDraftStore(window.localStorage).save(nextLesson);
  }

  if (lesson) return <main className="text-to-class-app lesson-open"><LessonWorkspace lesson={lesson} onChange={setLesson} onNew={startNew} onSave={() => saveLesson()} /></main>;

  return <main className="text-to-class-app">
    <nav className="text-class-nav" aria-label="Superclass"><a className="wordmark" href="#builder"><span>Super</span>class</a><small>TEXT TO CLASS</small></nav>
    <div className="text-class-home">
      <LessonBuilder request={request} setRequest={setRequest} loading={loading} error={error} advancedOpen={advancedOpen} onAdvancedChange={setAdvancedOpen} onSubmit={() => void generate()} />
    </div>
  </main>;
}
