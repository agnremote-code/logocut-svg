"use client";

import { useEffect, useState } from "react";
import { demoPresets } from "@/lib/presets";
import { effectiveLanguageMode, languageLabel, languageOptions } from "@/lib/lesson/language";
import { switchSourceMode } from "@/lib/lesson/request-state";
import { classPlanPreview, lessonFormatOptions } from "@/lib/lesson/archetypes";
import {
  lessonDurations,
  lessonLevels,
  skills,
  visualStyles,
  type LessonRequest,
  type LanguageId,
  type SourceMode,
  type StudentProfile,
} from "@/types/lesson";

type Props = {
  request: LessonRequest;
  setRequest: (request: LessonRequest) => void;
  loading: boolean;
  error: string;
  advancedOpen: boolean;
  onAdvancedChange: (open: boolean) => void;
  onPreset: (id: string) => void;
  onSubmit: () => void;
  selectedProfile?: StudentProfile;
};

const modeCopy: Record<SourceMode, string> = {
  idea: "Describe the class you want to teach.",
  text: "Paste an article, transcript, notes or existing material.",
  video: "Add a supported video URL. Superclass will look for public captions automatically.",
};

const labelize = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function LanguageCombobox({ id, label, value, customValue, onChange, onCustomChange }: {
  id: string;
  label: string;
  value: LanguageId;
  customValue: string;
  onChange: (value: LanguageId) => void;
  onCustomChange: (value: string) => void;
}) {
  const [query, setQuery] = useState(languageLabel(value, customValue));
  useEffect(() => setQuery(languageLabel(value, customValue)), [value, customValue]);
  return <>
    <label className="field">
      <span>{label}</span>
      <input
        role="combobox"
        aria-autocomplete="list"
        aria-controls={`${id}-options`}
        aria-expanded="false"
        list={`${id}-options`}
        value={query}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          const match = languageOptions.find((option) => option.label.toLocaleLowerCase() === next.trim().toLocaleLowerCase());
          if (match) onChange(match.id);
        }}
        onBlur={() => setQuery(languageLabel(value, customValue))}
        placeholder="Search languages…"
      />
      <datalist id={`${id}-options`}>
        {languageOptions.map((option) => <option key={option.id} value={option.label} />)}
      </datalist>
    </label>
    {value === "other" && <label className="field"><span>Custom {label.toLocaleLowerCase()}</span><input value={customValue} onChange={(event) => onCustomChange(event.target.value)} /></label>}
  </>;
}

export function LessonBuilder({
  request,
  setRequest,
  loading,
  error,
  advancedOpen,
  onAdvancedChange,
  onPreset,
  onSubmit,
  selectedProfile,
}: Props) {
  const update = <K extends keyof LessonRequest>(key: K, value: LessonRequest[K]) => setRequest({ ...request, [key]: value });
  const [transcriptStatus, setTranscriptStatus] = useState<"idle" | "reading" | "captions" | "preparing" | "ready" | "unavailable" | "error">("idle");
  const [transcriptMessage, setTranscriptMessage] = useState("");
  const [transcriptMeta, setTranscriptMeta] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const classPlan = classPlanPreview(request);
  const selectedFormat = lessonFormatOptions.find((item) => item.value === request.lessonFormat) ?? lessonFormatOptions[0];
  const chatGptHelperPrompt = "I am creating an online language class. Help me write clear instructions for a lesson generator. Ask me about the student’s level, target language, support language, topic, goals, activities, visual style, lesson duration and homework. Then return one structured prompt that I can paste into the lesson generator.";

  useEffect(() => {
    if (request.sourceMode !== "video" || !/^https?:\/\/.+/i.test(request.videoUrl)) {
      setTranscriptStatus("idle");
      setTranscriptMessage("");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setTranscriptStatus("reading");
      setTranscriptMessage("Reading video");
      const progress = window.setTimeout(() => { setTranscriptStatus("captions"); setTranscriptMessage("Looking for captions"); }, 350);
      try {
        const response = await fetch("/api/transcripts", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: request.videoUrl }),
        });
        const data = await response.json() as { transcript?: string; provider?: string; mocked?: boolean; error?: string; code?: string };
        window.clearTimeout(progress);
        if (!response.ok || !data.transcript) {
          setTranscriptStatus("unavailable");
          setTranscriptMessage("We could not import captions from this video. Upload the audio/video file and Superclass will transcribe it.");
          return;
        }
        setTranscriptStatus("preparing");
        setTranscriptMessage("Preparing the transcript");
        setRequest({ ...request, transcript: data.transcript });
        setTranscriptMeta(data.mocked ? "Mock captions imported for local development" : `Captions imported with ${data.provider ?? "configured provider"}`);
        window.setTimeout(() => { setTranscriptStatus("ready"); setTranscriptMessage("Ready to build"); }, 180);
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setTranscriptStatus("error");
        setTranscriptMessage("Caption import failed. Upload the audio/video file or use the advanced manual fallback.");
      }
    }, 450);
    return () => { controller.abort(); window.clearTimeout(timer); };
  // request is intentionally excluded: transcript updates must not restart caption import.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.sourceMode, request.videoUrl]);

  const uploadMedia = async (file: File) => {
    setTranscriptStatus("preparing");
    setTranscriptMessage("Preparing the transcript");
    const data = new FormData();
    data.append("file", file);
    const response = await fetch("/api/transcripts/upload", { method: "POST", body: data });
    const payload = await response.json() as { transcript?: string; mocked?: boolean; error?: string };
    if (!response.ok || !payload.transcript) {
      setTranscriptStatus("error");
      setTranscriptMessage(payload.error || "The media could not be transcribed.");
      return;
    }
    setRequest({ ...request, transcript: payload.transcript });
    setTranscriptMeta(payload.mocked ? "Mock transcription created for local development" : "Media transcribed by the configured provider");
    setTranscriptStatus("ready");
    setTranscriptMessage("Ready to build");
  };

  return (
    <section className="builder-card" id="builder" aria-labelledby="builder-title">
      <div className="builder-heading">
        <div>
          <span className="section-kicker">BUILD YOUR FIRST CLASS</span>
          <h2 id="builder-title">What should your student be able to do?</h2>
        </div>
        {process.env.NODE_ENV === "development" && <span className="local-badge">Local test provider</span>}
      </div>

      <div className="preset-row" aria-label="Anonymized lesson presets">
        {demoPresets.map((preset) => (
          <button key={preset.id} type="button" className="preset-chip" onClick={() => onPreset(preset.id)} title={preset.detail}>
            {preset.label}
          </button>
        ))}
      </div>
      {selectedProfile && <div className="selected-profile-banner"><span>{selectedProfile.nickname.slice(0, 2).toUpperCase()}</span><div><small>BUILDING FOR</small><b>{selectedProfile.nickname}</b><p>{selectedProfile.targetLanguage} · {selectedProfile.dialect} · {selectedProfile.level} · {selectedProfile.goals || "Personalized lesson"}</p></div></div>}

      <div className="mode-tabs" role="group" aria-label="Lesson source type">
        {(["idea", "text", "video"] as SourceMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={request.sourceMode === mode ? "mode-tab active" : "mode-tab"}
            aria-pressed={request.sourceMode === mode}
            onClick={() => {
              setTranscriptStatus("idle");
              setTranscriptMessage("");
              setRequest(switchSourceMode(request, mode));
            }}
          >
            {mode === "text" ? "Text or transcript" : mode}
          </button>
        ))}
      </div>
      <p className="mode-help">{modeCopy[request.sourceMode]}</p>

      {request.sourceMode === "video" ? (
        <div className="source-stack">
          <label className="field">
            <span>Video URL</span>
            <input
              value={request.videoUrl}
              onChange={(event) => {
                setTranscriptStatus("idle");
                setRequest({ ...request, videoUrl: event.target.value, transcript: "" });
              }}
              placeholder="https://www.youtube.com/watch?v=…"
              inputMode="url"
            />
          </label>
          {transcriptStatus !== "idle" && <div className={`transcript-status status-${transcriptStatus}`} role="status"><i /><div><b>{transcriptMessage}</b>{transcriptMeta && <small>{transcriptMeta}</small>}</div></div>}
          {(transcriptStatus === "unavailable" || transcriptStatus === "error") && <label className="media-upload"><span>Upload the video or audio file</span><small>Primary fallback · up to 100 MB</small><input type="file" accept="audio/*,video/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadMedia(file); }} /></label>}
          {request.transcript && <details className="transcript-preview"><summary>Imported transcript · editable</summary><textarea aria-label="Imported transcript" value={request.transcript} onChange={(event) => update("transcript", event.target.value)} /></details>}
          {(transcriptStatus === "unavailable" || transcriptStatus === "error") && <details className="manual-transcript"><summary>Advanced: paste transcript manually</summary><label className="field"><span>Manual transcript</span><textarea value={request.transcript} onChange={(event) => update("transcript", event.target.value)} /></label></details>}
        </div>
      ) : (
        <label className="field source-field">
          <span>{request.sourceMode === "idea" ? "Lesson idea" : "Source material"}</span>
          <textarea
            value={request.source}
            onChange={(event) => update("source", event.target.value)}
            placeholder={
              request.sourceMode === "idea"
                ? "A B1 conversation class about living abroad and adapting to a new culture."
                : "Paste an article, transcript, notes, vocabulary or student corrections…"
            }
          />
        </label>
      )}

      <div className="lesson-format-block">
        <label className="field">
          <span>LESSON FORMAT</span>
          <select value={request.lessonFormat} onChange={(event) => update("lessonFormat", event.target.value as LessonRequest["lessonFormat"])}>
            {lessonFormatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <small>{selectedFormat.description}</small>
        </label>
        <label className="field custom-class-field">
          <span>How should this class work?</span>
          <small>Describe the structure, activities, tone or visual style you want.</small>
          <textarea
            value={request.customClassInstructions}
            onChange={(event) => update("customClassInstructions", event.target.value)}
            placeholder="Start with vocabulary, explain ser and estar in English, include six short exercises, finish with personal speaking questions, and keep every example bilingual."
          />
        </label>
        <aside className="prompt-helper">
          <div><b>Need help describing your class?</b><p>Ask ChatGPT to organize your idea into a lesson-generation prompt, then paste it here.</p></div>
          <button type="button" onClick={async () => {
            await navigator.clipboard.writeText(chatGptHelperPrompt);
            setCopiedPrompt(true);
            window.setTimeout(() => setCopiedPrompt(false), 1_800);
          }}>{copiedPrompt ? "Prompt copied" : "Copy prompt for ChatGPT"}</button>
          <small>Copy only. No direct integration and no data is sent automatically.</small>
        </aside>
      </div>

      <div className="essential-grid">
        <LanguageCombobox id="target-language" label="Target language" value={request.language} customValue={request.customLanguage} onChange={(value) => update("language", value)} onCustomChange={(value) => update("customLanguage", value)} />
        <LanguageCombobox id="support-language" label="Support language" value={request.supportLanguage} customValue={request.customSupportLanguage} onChange={(value) => update("supportLanguage", value)} onCustomChange={(value) => update("customSupportLanguage", value)} />
        <label className="field">
          <span>Lesson language mode</span>
          <select value={request.languageMode} onChange={(event) => update("languageMode", event.target.value as LessonRequest["languageMode"])}>
            <option value="smart">Smart by level</option>
            <option value="target-only">Target language only</option>
            <option value="bilingual">Bilingual</option>
            <option value="support-heavy">Support-heavy beginner lesson</option>
          </select>
          <small>Current behavior: {labelize(effectiveLanguageMode(request))}. Student content prioritizes {languageLabel(request.language, request.customLanguage)}; teacher notes use support language.</small>
        </label>
        <label className="field">
          <span>CEFR level</span>
          <select value={request.level} onChange={(event) => update("level", event.target.value as LessonRequest["level"])}>
            {lessonLevels.map((level) => <option key={level}>{level}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Duration</span>
          <select value={lessonDurations.includes(request.duration as (typeof lessonDurations)[number]) ? request.duration : "custom"} onChange={(event) => update("duration", event.target.value === "custom" ? 55 : Number(event.target.value))}>
            {lessonDurations.map((duration) => <option key={duration} value={duration}>{duration} minutes</option>)}
            <option value="custom">Custom duration</option>
          </select>
        </label>
        {!lessonDurations.includes(request.duration as (typeof lessonDurations)[number]) && <label className="field"><span>Custom minutes (20-120)</span><input type="number" min={20} max={120} value={request.duration} onChange={(event) => update("duration", Math.min(120, Math.max(20, Number(event.target.value))))} /></label>}
        <label className="field">
          <span>Class type</span>
          <select value={request.studentType} onChange={(event) => update("studentType", event.target.value as LessonRequest["studentType"])}>
            <option value="individual">Individual</option>
            <option value="group">Group</option>
          </select>
        </label>
      </div>

      <aside className="class-plan-preview" aria-label="Class plan">
        <div><small>CLASS PLAN</small><strong>{classPlan.label}</strong></div>
        <p>{request.level} · {languageLabel(request.language, request.customLanguage)} with {languageLabel(request.supportLanguage, request.customSupportLanguage)} support</p>
        <b>Approximately {classPlan.screens} screens</b>
        <span>{classPlan.structure}</span>
      </aside>

      <details className="advanced-panel" open={advancedOpen} onToggle={(event) => onAdvancedChange(event.currentTarget.open)}>
        <summary aria-expanded={advancedOpen}>
          <span>Personalize the lesson</span>
          <small>Dialect, student profile, skills, practice and style</small>
        </summary>
        <div className="advanced-content">
          <div className="builder-subheading"><span>PERSONALIZATION</span><p>Student context and lesson continuity. Use only information you need.</p></div>
          <div className="essential-grid">
            <label className="field">
              <span>Dialect or variety</span>
              <select value={request.dialect} onChange={(event) => update("dialect", event.target.value as LessonRequest["dialect"])}>
                <option value="neutral">Neutral</option>
                <option value="rioplatense">Rioplatense</option>
                <option value="spain">Spain</option>
                <option value="mexican">Mexican</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {request.dialect === "custom" && (
              <label className="field">
                <span>Custom variety</span>
                <input value={request.customDialect} onChange={(event) => update("customDialect", event.target.value)} />
              </label>
            )}
            <label className="field">
              <span>Approximate age</span>
              <input value={request.age} onChange={(event) => update("age", event.target.value)} placeholder="Adult" />
            </label>
            <label className="field">
              <span>Learning goal</span>
              <input value={request.learningGoal} onChange={(event) => update("learningGoal", event.target.value)} />
            </label>
            <label className="field">
              <span>Interests</span>
              <input value={request.interests} onChange={(event) => update("interests", event.target.value)} />
            </label>
            <label className="field">
              <span>Strengths</span>
              <input value={request.strengths} onChange={(event) => update("strengths", event.target.value)} />
            </label>
            <label className="field">
              <span>Recurring difficulties</span>
              <input value={request.difficulties} onChange={(event) => update("difficulties", event.target.value)} />
            </label>
            <label className="field">
              <span>What did you cover in the last class?</span>
              <input value={request.lastClassCovered} onChange={(event) => update("lastClassCovered", event.target.value)} />
            </label>
            <label className="field">
              <span>What should this class continue or correct?</span>
              <input value={request.continueOrCorrect} onChange={(event) => update("continueOrCorrect", event.target.value)} />
            </label>
          </div>
          <div className="builder-subheading"><span>TEACHING STYLE</span><p>Control the pedagogical emphasis, practice and visual direction.</p></div>
          <div className="essential-grid">
            <label className="field">
              <span>Lesson focus</span>
              <select value={request.lessonFocus} onChange={(event) => update("lessonFocus", event.target.value as LessonRequest["lessonFocus"])}>
                <option value="conversation">Conversation</option>
                <option value="balanced">Balanced</option>
                <option value="grammar-focused">Grammar-focused</option>
                <option value="pronunciation-focused">Pronunciation-focused</option>
                <option value="source-comprehension">Source comprehension</option>
              </select>
            </label>
            <label className="field">
              <span>Practice density</span>
              <select value={request.practiceDensity} onChange={(event) => update("practiceDensity", event.target.value as LessonRequest["practiceDensity"])}>
                <option value="compact">Compact</option>
                <option value="standard">Standard</option>
                <option value="repetition-heavy">Repetition-heavy</option>
              </select>
            </label>
            <label className="field">
              <span>Visual style</span>
              <select value={request.visualStyle} onChange={(event) => update("visualStyle", event.target.value as LessonRequest["visualStyle"])}>
                {visualStyles.map((style) => <option key={style} value={style}>{labelize(style)}</option>)}
              </select>
            </label>
          </div>
          <fieldset className="skill-fieldset">
            <legend>Skills focus</legend>
            <div className="check-grid">
              {skills.map((skill) => {
                const selected = request.skillsFocus.includes(skill);
                return (
                  <label key={skill} className={selected ? "check-pill selected" : "check-pill"}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => update("skillsFocus", selected ? request.skillsFocus.filter((item) => item !== skill) : [...request.skillsFocus, skill])}
                    />
                    {skill}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="toggle-row">
            <label className="toggle">
              <input type="checkbox" checked={request.includeHomework} onChange={(event) => update("includeHomework", event.target.checked)} />
              <span>Include homework</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={request.includeSmallTalk} onChange={(event) => update("includeSmallTalk", event.target.checked)} />
              <span>10-15 minute small-talk opening</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={request.includeCorrection} onChange={(event) => update("includeCorrection", event.target.checked)} />
              <span>Include correction segment</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={request.includePronunciation} onChange={(event) => update("includePronunciation", event.target.checked)} />
              <span>Include pronunciation segment</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={request.includeRoleplay} onChange={(event) => update("includeRoleplay", event.target.checked)} />
              <span>Enable roleplay</span>
            </label>
          </div>
        </div>
      </details>

      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="primary-button generate-button" type="button" disabled={loading} onClick={onSubmit}>
        {loading ? "Building your class…" : "Create My Next Class"}
      </button>
      <p className="privacy-note">Your lesson stays in this browser. No student data is sent to analytics.</p>
    </section>
  );
}
