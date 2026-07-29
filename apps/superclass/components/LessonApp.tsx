"use client";

import { useEffect, useRef, useState } from "react";
import { LessonBuilder } from "@/components/LessonBuilder";
import { LessonWorkspace } from "@/components/LessonWorkspace";
import { MarketingSections } from "@/components/MarketingSections";
import { PlatformCompatibility, platformDisclaimer } from "@/components/PlatformCompatibility";
import { StudentProfiles } from "@/components/StudentProfiles";
import { track } from "@/lib/analytics";
import { normalizeLanguageId } from "@/lib/lesson/language";
import { demoPresets } from "@/lib/presets";
import { createBrowserDraftStore, LATEST_DRAFT_KEY } from "@/lib/storage/drafts";
import { associateLessonWithProfile, createProfileStore, deleteAllLocalTeachingData } from "@/lib/storage/profiles";
import { defaultLessonRequest, type LessonDraft, type LessonRequest, type StudentProfile } from "@/types/lesson";

export function LessonApp() {
  const [request, setRequest] = useState<LessonRequest>(defaultLessonRequest);
  const [lesson, setLesson] = useState<LessonDraft | null>(null);
  const [recent, setRecent] = useState<LessonDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const viewed = useRef(false);

  useEffect(() => {
    const store = createBrowserDraftStore(window.localStorage);
    const storedValue = window.localStorage.getItem(LATEST_DRAFT_KEY);
    const latest = store.loadLatest();
    if (latest) setLesson(latest);
    else if (storedValue) setError("A saved draft uses an older format and could not be restored. Start a new lesson to replace it.");
    setRecent(store.list());
    setProfiles(createProfileStore(window.localStorage).list());
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
    const selectedProfile = profiles.find((profile) => profile.id === nextRequest.profileId);
    const preparedRequest = selectedProfile ? { ...nextRequest, recentTopics: selectedProfile.topicsUsed, recentVocabulary: selectedProfile.vocabularyStudied } : nextRequest;
    setLoading(true);
    setError("");
    track("lesson_generation_started", {
      level: preparedRequest.level,
      duration: preparedRequest.duration,
      sourceMode: preparedRequest.sourceMode,
      visualStyle: preparedRequest.visualStyle,
      studentType: preparedRequest.studentType,
    });
    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preparedRequest),
      });
      const data = (await response.json()) as { lesson?: LessonDraft; error?: string };
      if (!response.ok || !data.lesson) throw new Error(data.error || "The lesson could not be generated.");
      setLesson(data.lesson);
      if (selectedProfile) {
        const store = createProfileStore(window.localStorage);
        store.save(associateLessonWithProfile(selectedProfile, data.lesson));
        setProfiles(store.list());
      }
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
      track("lesson_generation_failed", { reason: "unknown", level: preparedRequest.level, duration: preparedRequest.duration, sourceMode: preparedRequest.sourceMode });
    } finally {
      setLoading(false);
    }
  }

  function selectPreset(id: string, createImmediately = false) {
    const preset = demoPresets.find((item) => item.id === id);
    if (!preset) return;
    setRequest(preset.request);
    setError("");
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

  const selectedProfile = profiles.find((profile) => profile.id === request.profileId);
  const selectProfile = (profile: StudentProfile) => {
    setRequest({
      ...request,
      profileId: profile.id,
      language: normalizeLanguageId(profile.targetLanguage) ?? "es",
      dialect: profile.dialect,
      customDialect: profile.customDialect,
      level: profile.level,
      age: profile.ageGroup,
      interests: profile.interests,
      learningGoal: profile.goals,
      strengths: profile.strengths,
      difficulties: [profile.difficulties, profile.grammarTargets, profile.pronunciationTargets].filter(Boolean).join("; "),
      visualStyle: profile.preferredVisualStyle,
      practiceDensity: profile.preferredPracticeDensity,
      recentTopics: profile.topicsUsed,
      recentVocabulary: profile.vocabularyStudied,
    });
    setAdvancedOpen(true);
    window.requestAnimationFrame(scrollToBuilder);
  };
  const saveProfile = (profile: StudentProfile) => {
    const store = createProfileStore(window.localStorage);
    const saved = store.save(profile);
    setProfiles(store.list());
    selectProfile(saved);
  };
  const deleteProfile = (id: string) => {
    if (!window.confirm("Delete this local student profile? This cannot be undone.")) return;
    const store = createProfileStore(window.localStorage);
    store.remove(id);
    setProfiles(store.list());
    if (request.profileId === id) setRequest({ ...request, profileId: "" });
  };
  const deleteAll = () => {
    if (!window.confirm("Delete every local student profile and lesson draft? This cannot be undone.")) return;
    deleteAllLocalTeachingData(window.localStorage);
    setProfiles([]);
    setRecent([]);
    setLesson(null);
    setRequest(defaultLessonRequest);
  };

  return (
    <main>
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top"><span>Super</span>class</a>
        <div className="nav-links"><a href="#how-it-works">How it works</a><a href="#pricing">Pricing preview</a></div>
        <button type="button" className="nav-cta" onClick={scrollToBuilder}>Create My Next Class</button>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="hero-kicker">DESIGNED LESSON SOFTWARE FOR LANGUAGE TEACHERS</span>
          <h1>Create Classes Students Remember</h1>
          <p>Turn any topic, text or video into a designed interactive lesson, student workbook and teacher pack.</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={scrollToBuilder}>Create My Next Class</button>
            <button className="text-button" type="button" onClick={() => selectPreset("b1-abroad", true)}>Open a Demo <span>→</span></button>
          </div>
          <p className="platform-line">For independent tutors and online language teachers.</p>
        </div>
        <div className="hero-visual" aria-label="Example lesson flow">
          <div className="visual-window">
            <div className="visual-top"><span>LESSON 04</span><b>B1 · 60 MIN</b></div>
            <div className="visual-card card-one"><small>VISUAL GRAMMAR</small><h3>SER vs ESTAR</h3></div>
            <div className="visual-card card-two"><small>MEANING MAP</small><div><b>identity</b><b>location</b><b>state</b></div></div>
            <div className="visual-strip"><span className="active">01</span><span>02</span><span>03</span><span>04</span><span>18</span></div>
          </div>
          <div className="floating-note"><b>Teacher note</b><span>Give 20 seconds to plan. Save correction until the end.</span></div>
        </div>
      </section>

      <PlatformCompatibility />

      <StudentProfiles
        profiles={profiles}
        selectedId={request.profileId}
        onSelect={selectProfile}
        onSave={saveProfile}
        onDuplicate={(id) => { const store = createProfileStore(window.localStorage); store.duplicate(id); setProfiles(store.list()); }}
        onDelete={deleteProfile}
      />

      <LessonBuilder
        request={request}
        setRequest={(next) => { setRequest(next); setError(""); track("lesson_form_started", { level: next.level, duration: next.duration, sourceMode: next.sourceMode }); }}
        loading={loading}
        error={error}
        advancedOpen={advancedOpen}
        onAdvancedChange={(open) => { setAdvancedOpen(open); if (open) track("advanced_options_opened"); }}
        onPreset={selectPreset}
        onSubmit={() => void generate()}
        selectedProfile={selectedProfile}
      />

      {lesson && <LessonWorkspace lesson={lesson} onChange={setLesson} onNew={startNew} onSaveToProfile={selectedProfile ? () => saveProfile(associateLessonWithProfile(selectedProfile, lesson)) : undefined} />}

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
      <section className="privacy-control"><div><b>Your teaching data stays local.</b><p>Profiles and drafts are stored only in this browser. Superclass does not send student profile details to analytics.</p></div><button type="button" className="danger-button" onClick={deleteAll}>Delete all local teaching data</button></section>
      <footer className="site-footer"><a className="wordmark" href="#top"><span>Super</span>class</a><div><p>Provider-backed lesson generation · no external tracking or payments</p><p>{platformDisclaimer}</p></div></footer>
    </main>
  );
}
