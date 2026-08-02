"use client";

import { languageOptions } from "@/lib/lesson/language";
import type { LanguageId, LessonRequest } from "@/types/lesson";

type Props = {
  request: LessonRequest;
  setRequest: (request: LessonRequest) => void;
  loading: boolean;
  error: string;
  advancedOpen: boolean;
  onAdvancedChange: (open: boolean) => void;
  onSubmit: () => void;
};

function LanguageSelect({ id, label, value, onChange }: { id: string; label: string; value: LanguageId; onChange: (value: LanguageId) => void }) {
  return <label className="text-class-field">
    <span>{label}</span>
    <select id={id} value={value} onChange={(event) => onChange(event.target.value as LanguageId)}>
      {languageOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
  </label>;
}

export function LessonBuilder({ request, setRequest, loading, error, advancedOpen, onAdvancedChange, onSubmit }: Props) {
  const update = <K extends keyof LessonRequest>(key: K, value: LessonRequest[K]) => setRequest({ ...request, [key]: value });
  const valid = request.source.trim().length >= 12;

  return <section className="text-to-class-builder" id="builder" aria-label="Text to Class builder">
    <label className="text-class-prompt">
      <span>What do you want to teach?</span>
      <textarea
        autoFocus
        value={request.source}
        onChange={(event) => update("source", event.target.value)}
        placeholder="Describe the class, paste material, or add a YouTube link..."
      />
    </label>

    <div className="text-class-essentials">
      <LanguageSelect id="target-language" label="Target language" value={request.language} onChange={(value) => update("language", value)} />
      <label className="text-class-field">
        <span>Student level</span>
        <select value={request.level} onChange={(event) => update("level", event.target.value as LessonRequest["level"])}>
          {(["A0", "A1", "A2", "B1", "B2", "C1", "C2"] as const).map((level) => <option key={level}>{level}</option>)}
        </select>
      </label>
      <label className="text-class-field">
        <span>Duration</span>
        <select value={request.duration} onChange={(event) => update("duration", Number(event.target.value))}>
          {[30, 45, 60, 90].map((duration) => <option key={duration} value={duration}>{duration} minutes</option>)}
        </select>
      </label>
      <button className="create-class-button" type="button" disabled={loading || !valid} onClick={onSubmit}>
        {loading ? <><i /> Creating your class…</> : <>Create class <span>→</span></>}
      </button>
    </div>

    <details className="text-class-more" open={advancedOpen} onToggle={(event) => onAdvancedChange(event.currentTarget.open)}>
      <summary>More options <span>{advancedOpen ? "−" : "+"}</span></summary>
      <div>
        <LanguageSelect id="support-language" label="Support language" value={request.supportLanguage} onChange={(value) => update("supportLanguage", value)} />
        <label className="text-class-field"><span>Dialect</span><select value={request.dialect} onChange={(event) => update("dialect", event.target.value as LessonRequest["dialect"])}><option value="neutral">Neutral</option><option value="rioplatense">Argentinian / Rioplatense</option><option value="spain">Spain</option><option value="mexican">Mexican</option></select></label>
        <label className="text-class-field"><span>Teaching focus</span><select value={request.lessonFocus} onChange={(event) => update("lessonFocus", event.target.value as LessonRequest["lessonFocus"])}><option value="balanced">Automatic</option><option value="conversation">Speaking</option><option value="grammar-focused">Grammar</option><option value="pronunciation-focused">Pronunciation</option><option value="source-comprehension">Source comprehension</option></select></label>
        <label className="text-class-field"><span>Class type</span><select value={request.studentType} onChange={(event) => update("studentType", event.target.value as LessonRequest["studentType"])}><option value="individual">Individual</option><option value="group">Group</option></select></label>
        <label className="text-class-field"><span>Language balance</span><select value={request.languageMode} onChange={(event) => update("languageMode", event.target.value as LessonRequest["languageMode"])}><option value="smart">Smart by level</option><option value="bilingual">Bilingual</option><option value="target-only">Target language only</option><option value="support-heavy">Extra support</option></select></label>
        <label className="text-class-field text-class-wide"><span>Specific instructions</span><textarea value={request.customClassInstructions} onChange={(event) => update("customClassInstructions", event.target.value)} placeholder="Optional: activity, tone, learner needs, or visual direction" /></label>
      </div>
    </details>
    {error && <p className="text-class-error" role="alert">{error}</p>}
  </section>;
}
