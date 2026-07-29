"use client";

import { useState } from "react";
import { copyReadyHomework, copyReadyNextClass, createPostClassSummary } from "@/lib/lesson/post-class";
import type { LessonDraft } from "@/types/lesson";

export function PostClassTools({ lesson, onSaveToProfile }: { lesson: LessonDraft; onSaveToProfile?: () => void }) {
  const summary = createPostClassSummary(lesson);
  const [copied, setCopied] = useState("");
  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1800);
  };
  return <section className="post-class-section" aria-labelledby="post-class-title">
    <header><div><span className="section-kicker">AFTER THE CALL</span><h2 id="post-class-title">Close the loop while the class is fresh.</h2></div><p>Copy-ready follow-up for a platform message or private chat. Nothing is sent automatically.</p></header>
    <div className="post-class-grid">
      <article className="summary-card"><small>CLASS SUMMARY</small><p>{summary.classSummary}</p><div className="summary-tags">{summary.vocabularyStudied.map((word) => <span key={word}>{word}</span>)}</div><p><b>Grammar:</b> {summary.grammarStudied}</p><p><b>Pronunciation:</b> {summary.pronunciationTarget}</p></article>
      <article className="message-card"><small>MESSAGE TO STUDENT</small><pre>{summary.studentMessage}</pre></article>
      <article className="next-card"><small>NEXT CLASS</small><h3>{summary.suggestedNextClass}</h3><p><b>Homework:</b> {summary.homework}</p>{summary.correctedSentences.length > 0 && <div><b>Corrected sentences</b>{summary.correctedSentences.map((item) => <p key={item}>{item}</p>)}</div>}</article>
    </div>
    <div className="post-class-actions">
      <button type="button" onClick={() => void copy("summary", summary.studentMessage)}>{copied === "summary" ? "Copied ✓" : "Copy Student Summary"}</button>
      <button type="button" onClick={() => void copy("homework", copyReadyHomework(summary))}>{copied === "homework" ? "Copied ✓" : "Copy Homework"}</button>
      <button type="button" onClick={() => void copy("next", copyReadyNextClass(summary))}>{copied === "next" ? "Copied ✓" : "Copy Next-Class Plan"}</button>
      {onSaveToProfile && <button type="button" className="primary-button small" onClick={onSaveToProfile}>Save to Student Profile</button>}
    </div>
  </section>;
}
