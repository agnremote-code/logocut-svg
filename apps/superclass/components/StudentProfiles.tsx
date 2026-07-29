"use client";

import { useState } from "react";
import { createEmptyProfile } from "@/lib/storage/profiles";
import { lessonLevels, visualStyles, type StudentProfile } from "@/types/lesson";

type Props = {
  profiles: StudentProfile[];
  selectedId: string;
  onSelect: (profile: StudentProfile) => void;
  onSave: (profile: StudentProfile) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

export function StudentProfiles({ profiles, selectedId, onSelect, onSave, onDuplicate, onDelete }: Props) {
  const [editing, setEditing] = useState<StudentProfile | null>(null);
  const update = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => editing && setEditing({ ...editing, [key]: value });
  const active = profiles.filter((profile) => !profile.archived);

  return (
    <section className="profiles-section" id="students" aria-labelledby="profiles-title">
      <div className="profiles-heading">
        <div><span className="section-kicker">LOCAL STUDENT WORKSPACE</span><h2 id="profiles-title">Teach the student, not the template.</h2><p>Reusable profiles stay in this browser. Use a nickname or internal identifier - never information you do not need.</p></div>
        <button type="button" className="primary-button small" onClick={() => setEditing(createEmptyProfile())}>+ New profile</button>
      </div>
      <div className="profile-cards">
        {active.length === 0 && <button type="button" className="empty-profile" onClick={() => setEditing(createEmptyProfile())}><b>Create your first student profile</b><span>Save goals, recurring difficulties and recent lesson continuity locally.</span></button>}
        {active.map((profile) => <article key={profile.id} className={profile.id === selectedId ? "profile-card selected" : "profile-card"}>
          <button type="button" className="profile-main" onClick={() => onSelect(profile)}>
            <span className="profile-avatar">{profile.nickname.slice(0, 2).toUpperCase()}</span>
            <span><b>{profile.nickname}</b><small>{profile.targetLanguage} · {profile.dialect} · {profile.level}</small></span>
          </button>
          <div className="profile-meta"><span>{profile.topicsUsed.length} recent topics</span><span>{profile.vocabularyStudied.length} saved words</span></div>
          <div className="profile-actions"><button type="button" onClick={() => setEditing(profile)}>Edit</button><button type="button" onClick={() => onDuplicate(profile.id)}>Duplicate</button><button type="button" onClick={() => onSave({ ...profile, archived: true })}>Archive</button><button type="button" onClick={() => onDelete(profile.id)}>Delete</button></div>
        </article>)}
      </div>

      {editing && <div className="profile-modal" role="dialog" aria-modal="true" aria-label="Student profile editor">
        <div className="profile-editor">
          <header><div><span>LOCAL PROFILE</span><h2>{profiles.some((item) => item.id === editing.id) ? "Edit student profile" : "Create student profile"}</h2></div><button type="button" onClick={() => setEditing(null)}>Close</button></header>
          <div className="profile-form-grid">
            <label className="field"><span>Nickname or internal ID</span><input value={editing.nickname} onChange={(e) => update("nickname", e.target.value)} /></label>
            <label className="field"><span>Target language</span><input value={editing.targetLanguage} onChange={(e) => update("targetLanguage", e.target.value)} /></label>
            <label className="field"><span>Dialect</span><select value={editing.dialect} onChange={(e) => update("dialect", e.target.value as StudentProfile["dialect"])}><option value="neutral">Neutral</option><option value="rioplatense">Rioplatense</option><option value="spain">Spain</option><option value="mexican">Mexican</option><option value="custom">Custom</option></select></label>
            <label className="field"><span>CEFR level</span><select value={editing.level} onChange={(e) => update("level", e.target.value as StudentProfile["level"])}>{lessonLevels.map((level) => <option key={level}>{level}</option>)}</select></label>
            <label className="field"><span>Age group</span><input value={editing.ageGroup} onChange={(e) => update("ageGroup", e.target.value)} /></label>
            <label className="field"><span>Profession</span><input value={editing.profession} onChange={(e) => update("profession", e.target.value)} /></label>
            <label className="field"><span>Interests</span><input value={editing.interests} onChange={(e) => update("interests", e.target.value)} /></label>
            <label className="field"><span>Goals</span><input value={editing.goals} onChange={(e) => update("goals", e.target.value)} /></label>
            <label className="field"><span>Strengths</span><input value={editing.strengths} onChange={(e) => update("strengths", e.target.value)} /></label>
            <label className="field"><span>Recurring difficulties</span><input value={editing.difficulties} onChange={(e) => update("difficulties", e.target.value)} /></label>
            <label className="field"><span>Pronunciation targets</span><input value={editing.pronunciationTargets} onChange={(e) => update("pronunciationTargets", e.target.value)} /></label>
            <label className="field"><span>Grammar targets</span><input value={editing.grammarTargets} onChange={(e) => update("grammarTargets", e.target.value)} /></label>
            <label className="field"><span>Preferred visual style</span><select value={editing.preferredVisualStyle} onChange={(e) => update("preferredVisualStyle", e.target.value as StudentProfile["preferredVisualStyle"])}>{visualStyles.map((style) => <option key={style} value={style}>{style.replaceAll("-", " ")}</option>)}</select></label>
            <label className="field"><span>Practice density</span><select value={editing.preferredPracticeDensity} onChange={(e) => update("preferredPracticeDensity", e.target.value as StudentProfile["preferredPracticeDensity"])}><option value="compact">Compact</option><option value="standard">Standard</option><option value="repetition-heavy">Repetition-heavy</option></select></label>
            <label className="field full"><span>Teacher notes</span><textarea value={editing.teacherNotes} onChange={(e) => update("teacherNotes", e.target.value)} /></label>
          </div>
          <p className="privacy-note">Private profile fields remain in local browser storage and are excluded from student PDFs and analytics.</p>
          <button type="button" className="primary-button" disabled={!editing.nickname.trim()} onClick={() => { onSave(editing); setEditing(null); }}>Save student profile</button>
        </div>
      </div>}
    </section>
  );
}
