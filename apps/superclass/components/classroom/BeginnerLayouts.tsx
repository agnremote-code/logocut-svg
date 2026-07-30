"use client";

import type { LessonScreen } from "@/types/lesson";
import { VisualComposition } from "@/components/classroom/VisualComposition";

export function BilingualText({ value }: { value: string }) {
  const [target, support] = value.split("||").map((part) => part.trim());
  return <span className="bilingual-text"><strong>{target}</strong>{support && <small>{support}</small>}</span>;
}

export function TopicMenu({ screen }: { screen: LessonScreen }) {
  return <div className="topic-menu">{screen.prompts.map((item, index) => <article key={item}><span>{String(index + 1).padStart(2, "0")}</span><BilingualText value={item} /></article>)}</div>;
}

export function ImageTopicCard({ screen }: { screen: LessonScreen }) {
  return <div className="image-topic-card">
    <VisualComposition screen={screen} purpose="practice-context" />
    <div>{screen.prompts.map((item) => <p key={item}><BilingualText value={item} /></p>)}</div>
    {screen.body && <small>{screen.body}</small>}
  </div>;
}

export function VocabularyBank({ screen }: { screen: LessonScreen }) {
  const categories = screen.vocabulary.reduce<Record<string, typeof screen.vocabulary>>((groups, item) => {
    (groups[item.meaning] ??= []).push(item);
    return groups;
  }, {});
  return <div className="vocabulary-bank">{Object.entries(categories).map(([category, items]) => <section key={category}><h3>{category}</h3><div>{items.map((item) => <article key={item.term}><BilingualText value={item.term} /><p><BilingualText value={item.example} /></p></article>)}</div></section>)}</div>;
}

export function VerbBank({ screen }: { screen: LessonScreen }) {
  return <div className="verb-bank">{screen.prompts.map((item) => <article key={item}><BilingualText value={item} /></article>)}</div>;
}

export function ConnectorBank({ screen }: { screen: LessonScreen }) {
  return <div className="connector-bank">{screen.prompts.map((item) => <article key={item}><BilingualText value={item} /></article>)}</div>;
}

export function SentenceStarterBank({ screen }: { screen: LessonScreen }) {
  return <div className="starter-bank">{screen.prompts.map((item) => <article key={item}><BilingualText value={item} /><i>…</i></article>)}</div>;
}

export function GuidedQuestionList({ screen }: { screen: LessonScreen }) {
  return <div className="guided-question-list">{screen.prompts.slice(0, 4).map((item, index) => <article key={item}><span>{index + 1}</span><BilingualText value={item} /></article>)}</div>;
}

export function ExampleReveal({ answers }: { answers: string[] }) {
  return <div className="example-reveal">{answers.map((answer) => <p key={answer}><BilingualText value={answer} /></p>)}</div>;
}

export function TopicNavigation({ current, total }: { current: number; total: number }) {
  return <span className="topic-navigation" aria-label={`Activity ${current} of ${total}`}>{current} / {total}</span>;
}

export function BeginnerFeedback({ screen }: { screen: LessonScreen }) {
  return <div className="beginner-feedback">
    {screen.body && <BilingualText value={screen.body} />}
    <div className="feedback-fields">
      {["Best sentence", "Verb to practise", "Small correction", "New vocabulary", "Next goal"].map((field) => <label key={field}><span>{field}</span><input aria-label={field} /></label>)}
    </div>
  </div>;
}
