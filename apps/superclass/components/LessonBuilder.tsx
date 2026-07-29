"use client";

import { demoPresets } from "@/lib/presets";
import {
  lessonDurations,
  lessonLevels,
  skills,
  visualStyles,
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

const modeCopy: Record<SourceMode, string> = {
  idea: "Describe the class you want to teach.",
  text: "Paste an article, transcript, notes or existing material.",
  video: "Add a video URL and the transcript or notes you want to teach from.",
};

const labelize = (value: string) => value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

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

  return (
    <section className="builder-card" id="builder" aria-labelledby="builder-title">
      <div className="builder-heading">
        <div>
          <span className="section-kicker">BUILD YOUR FIRST CLASS</span>
          <h2 id="builder-title">What should your student be able to do?</h2>
        </div>
        <span className="local-badge">Schema-validated generation</span>
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
            onClick={() => update("sourceMode", mode)}
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
              onChange={(event) => update("videoUrl", event.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              inputMode="url"
            />
          </label>
          <label className="field">
            <span>Transcript or teaching notes</span>
            <textarea
              value={request.transcript}
              onChange={(event) => update("transcript", event.target.value)}
              placeholder="Paste the transcript or notes here. Superclass will not pretend it fetched one."
            />
          </label>
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

      <div className="essential-grid">
        <label className="field">
          <span>Language</span>
          <input value={request.language} onChange={(event) => update("language", event.target.value)} />
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

      <details className="advanced-panel" open={advancedOpen} onToggle={(event) => onAdvancedChange(event.currentTarget.open)}>
        <summary aria-expanded={advancedOpen}>
          <span>Personalize the lesson</span>
          <small>Dialect, student profile, skills, practice and style</small>
        </summary>
        <div className="advanced-content">
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
