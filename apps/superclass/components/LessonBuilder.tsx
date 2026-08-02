"use client";

import { useEffect, useState } from "react";
import { demoPresets } from "@/lib/presets";
import { languageOptions } from "@/lib/lesson/language";
import { switchSourceMode } from "@/lib/lesson/request-state";
import {
  lessonDurations,
  lessonLevels,
  skills,
  visualStyles,
  type LanguageId,
  type LessonRequest,
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

const creationModes: Array<{ value: SourceMode; label: string }> = [
  { value: "idea", label: "Idea or material" },
  { value: "video", label: "YouTube video" },
];

const labelize = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function LanguageSelect({ id, label, value, customValue, onChange, onCustomChange }: {
  id: string;
  label: string;
  value: LanguageId;
  customValue: string;
  onChange: (value: LanguageId) => void;
  onCustomChange: (value: string) => void;
}) {
  return <>
    <label className="field">
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as LanguageId)}>
        {languageOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
    {value === "other" && (
      <label className="field">
        <span>Custom {label.toLocaleLowerCase()}</span>
        <input value={customValue} onChange={(event) => onCustomChange(event.target.value)} />
      </label>
    )}
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
      const progress = window.setTimeout(() => {
        setTranscriptStatus("captions");
        setTranscriptMessage("Looking for captions");
      }, 350);
      try {
        const response = await fetch("/api/transcripts", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: request.videoUrl }),
        });
        const data = await response.json() as { transcript?: string; provider?: string; mocked?: boolean };
        window.clearTimeout(progress);
        if (!response.ok || !data.transcript) {
          setTranscriptStatus("unavailable");
          setTranscriptMessage("Captions are unavailable. Choose one fallback below.");
          return;
        }
        setTranscriptStatus("preparing");
        setTranscriptMessage("Preparing the transcript");
        setRequest({ ...request, transcript: data.transcript });
        setTranscriptMeta(data.mocked ? "Local mock captions imported" : `Captions imported with ${data.provider ?? "configured provider"}`);
        window.setTimeout(() => {
          setTranscriptStatus("ready");
          setTranscriptMessage("Ready to build");
        }, 180);
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setTranscriptStatus("error");
        setTranscriptMessage("Caption import failed. Choose one fallback below.");
      }
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  // Transcript updates must not restart caption import.
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
    setTranscriptMeta(payload.mocked ? "Local mock transcription created" : "Media transcribed by the configured provider");
    setTranscriptStatus("ready");
    setTranscriptMessage("Ready to build");
  };

  return (
    <section className="builder-card simple-builder" id="builder" aria-labelledby="builder-title">
      <div className="builder-heading">
        <div>
          <span className="section-kicker">CREATE A CLASS</span>
          <h2 id="builder-title">Describe it. Generate it. Teach it.</h2>
          <p>Superclass interprets your request and builds the creative lesson brief for you.</p>
        </div>
        {process.env.NODE_ENV === "development" && <span className="local-badge">Local test provider</span>}
      </div>

      <fieldset className="creation-mode-control">
        <legend>Create from</legend>
        <div className="mode-tabs">
          {creationModes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              className={request.sourceMode === mode.value ? "mode-tab active" : "mode-tab"}
              aria-pressed={request.sourceMode === mode.value}
              onClick={() => {
                setTranscriptStatus("idle");
                setTranscriptMessage("");
                setRequest(switchSourceMode(request, mode.value));
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </fieldset>

      {request.sourceMode === "video" ? (
        <div className="source-stack">
          <p className="mode-help">Paste a YouTube link. Superclass will use available captions to build the class.</p>
          <label className="field">
            <span>YouTube URL</span>
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
          {transcriptStatus !== "idle" && (
            <div className={`transcript-status status-${transcriptStatus}`} role="status">
              <i /><div><b>{transcriptMessage}</b>{transcriptMeta && <small>{transcriptMeta}</small>}</div>
            </div>
          )}
          {(transcriptStatus === "unavailable" || transcriptStatus === "error") && (
            <div className="video-fallbacks">
              <label className="media-upload">
                <span>Upload audio or video</span>
                <small>Up to 100 MB</small>
                <input type="file" accept="audio/*,video/*" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadMedia(file);
                }} />
              </label>
              <details className="manual-transcript">
                <summary>Paste transcript manually</summary>
                <label className="field"><span>Transcript</span><textarea value={request.transcript} onChange={(event) => update("transcript", event.target.value)} /></label>
              </details>
            </div>
          )}
          {request.transcript && transcriptStatus === "ready" && (
            <details className="transcript-preview">
              <summary>Imported transcript · editable</summary>
              <textarea aria-label="Imported transcript" value={request.transcript} onChange={(event) => update("transcript", event.target.value)} />
            </details>
          )}
        </div>
      ) : (
        <label className="field source-field">
          <span>Idea or material</span>
          <textarea
            value={request.source}
            onChange={(event) => update("source", event.target.value)}
            placeholder="Example: Create an A1 bilingual class about ser and estar with clear examples, short practice and personal speaking questions."
          />
        </label>
      )}

      <div className="essential-grid simple-essential-grid">
        <LanguageSelect id="target-language" label="Target language" value={request.language} customValue={request.customLanguage} onChange={(value) => update("language", value)} onCustomChange={(value) => update("customLanguage", value)} />
        <LanguageSelect id="support-language" label="Support language" value={request.supportLanguage} customValue={request.customSupportLanguage} onChange={(value) => update("supportLanguage", value)} onCustomChange={(value) => update("customSupportLanguage", value)} />
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
        {!lessonDurations.includes(request.duration as (typeof lessonDurations)[number]) && (
          <label className="field"><span>Custom minutes</span><input type="number" min={20} max={120} value={request.duration} onChange={(event) => update("duration", Math.min(120, Math.max(20, Number(event.target.value))))} /></label>
        )}
      </div>

      <details className="advanced-panel more-control" open={advancedOpen} onToggle={(event) => onAdvancedChange(event.currentTarget.open)}>
        <summary aria-expanded={advancedOpen}>
          <span>More control</span>
          <small>Optional teaching, learner and visual preferences</small>
        </summary>
        <div className="advanced-content">
          {selectedProfile && (
            <div className="selected-profile-banner">
              <span>{selectedProfile.nickname.slice(0, 2).toUpperCase()}</span>
              <div><small>BUILDING FOR</small><b>{selectedProfile.nickname}</b><p>{selectedProfile.targetLanguage} · {selectedProfile.level} · {selectedProfile.goals || "Personalized lesson"}</p></div>
            </div>
          )}
          <div className="builder-subheading"><span>CLASS DIRECTION</span><p>These settings refine the internal creative brief.</p></div>
          <div className="essential-grid">
            <label className="field">
              <span>Dialect</span>
              <select value={request.dialect} onChange={(event) => update("dialect", event.target.value as LessonRequest["dialect"])}>
                <option value="neutral">Neutral</option>
                <option value="rioplatense">Rioplatense</option>
                <option value="spain">Spain</option>
                <option value="mexican">Mexican</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {request.dialect === "custom" && <label className="field"><span>Custom dialect</span><input value={request.customDialect} onChange={(event) => update("customDialect", event.target.value)} /></label>}
            <label className="field">
              <span>Class type</span>
              <select value={request.studentType} onChange={(event) => update("studentType", event.target.value as LessonRequest["studentType"])}>
                <option value="individual">Individual</option>
                <option value="group">Group</option>
              </select>
            </label>
            <label className="field">
              <span>Teaching focus</span>
              <select value={request.lessonFocus} onChange={(event) => update("lessonFocus", event.target.value as LessonRequest["lessonFocus"])}>
                <option value="balanced">Balanced</option>
                <option value="conversation">Conversation</option>
                <option value="grammar-focused">Grammar</option>
                <option value="pronunciation-focused">Pronunciation</option>
                <option value="source-comprehension">Source comprehension</option>
              </select>
            </label>
            <label className="field">
              <span>Language balance</span>
              <select value={request.languageMode} onChange={(event) => update("languageMode", event.target.value as LessonRequest["languageMode"])}>
                <option value="smart">Smart by level</option>
                <option value="bilingual">Bilingual</option>
                <option value="target-only">Target language only</option>
                <option value="support-heavy">More support language</option>
              </select>
            </label>
            <label className="field">
              <span>Visual direction</span>
              <select value={request.visualStyle} onChange={(event) => update("visualStyle", event.target.value as LessonRequest["visualStyle"])}>
                {visualStyles.map((style) => <option key={style} value={style}>{labelize(style)}</option>)}
              </select>
            </label>
          </div>
          <label className="field custom-class-field">
            <span>Specific instructions</span>
            <textarea value={request.customClassInstructions} onChange={(event) => update("customClassInstructions", event.target.value)} placeholder="Optional activity, tone or visual preferences." />
          </label>

          <div className="builder-subheading"><span>LEARNER CONTEXT</span><p>Use only details that improve this class.</p></div>
          <div className="essential-grid">
            <label className="field"><span>Approximate age</span><input value={request.age} onChange={(event) => update("age", event.target.value)} /></label>
            <label className="field"><span>Learning goal</span><input value={request.learningGoal} onChange={(event) => update("learningGoal", event.target.value)} /></label>
            <label className="field"><span>Interests</span><input value={request.interests} onChange={(event) => update("interests", event.target.value)} /></label>
            <label className="field"><span>Recurring difficulties</span><input value={request.difficulties} onChange={(event) => update("difficulties", event.target.value)} /></label>
          </div>
          <fieldset className="skill-fieldset">
            <legend>Skills</legend>
            <div className="check-grid">
              {skills.map((skill) => {
                const selected = request.skillsFocus.includes(skill);
                return <label key={skill} className={selected ? "check-pill selected" : "check-pill"}>
                  <input type="checkbox" checked={selected} onChange={() => update("skillsFocus", selected ? request.skillsFocus.filter((item) => item !== skill) : [...request.skillsFocus, skill])} />
                  {skill}
                </label>;
              })}
            </div>
          </fieldset>
          <div className="toggle-row">
            <label className="toggle"><input type="checkbox" checked={request.includeHomework} onChange={(event) => update("includeHomework", event.target.checked)} /><span>Include homework</span></label>
            <label className="toggle"><input type="checkbox" checked={request.includeCorrection} onChange={(event) => update("includeCorrection", event.target.checked)} /><span>Include correction</span></label>
            <label className="toggle"><input type="checkbox" checked={request.includePronunciation} onChange={(event) => update("includePronunciation", event.target.checked)} /><span>Include pronunciation</span></label>
            <label className="toggle"><input type="checkbox" checked={request.includeRoleplay} onChange={(event) => update("includeRoleplay", event.target.checked)} /><span>Include roleplay</span></label>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="local-examples">
              <small>LOCAL ACCEPTANCE EXAMPLES</small>
              <div className="preset-row">
                {demoPresets.map((preset) => <button key={preset.id} type="button" className="preset-chip" onClick={() => onPreset(preset.id)}>{preset.label}</button>)}
              </div>
            </div>
          )}
        </div>
      </details>

      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="primary-button generate-button" type="button" disabled={loading} onClick={onSubmit}>
        {loading ? "Creating your class…" : "Generate class"}
      </button>
      <p className="privacy-note">Your lesson stays in this browser. No student data is sent to analytics.</p>
    </section>
  );
}
