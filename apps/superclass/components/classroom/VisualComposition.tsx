"use client";

import { resolveVisualAsset } from "@/lib/visual-assets";
import type { LessonScreen } from "@/types/lesson";

function SerEstarOrbit() {
  return <svg viewBox="0 0 720 380" role="presentation">
    <defs><linearGradient id="ser-est" x1="0" x2="1"><stop stopColor="#7457ff" /><stop offset="1" stopColor="#ec4899" /></linearGradient></defs>
    <circle cx="205" cy="190" r="118" fill="#e8e2ff" />
    <circle cx="515" cy="190" r="118" fill="#ffe1ef" />
    <path d="M300 190h120" stroke="url(#ser-est)" strokeWidth="12" strokeLinecap="round" />
    <circle cx="360" cy="190" r="28" fill="#fff" stroke="#1c1830" strokeWidth="4" />
    <text x="205" y="179" textAnchor="middle" className="visual-word">SER</text>
    <text x="205" y="214" textAnchor="middle" className="visual-note">identidad · origen</text>
    <text x="515" y="179" textAnchor="middle" className="visual-word">ESTAR</text>
    <text x="515" y="214" textAnchor="middle" className="visual-note">lugar · estado</text>
    <path d="M160 62l18-28 18 28M474 310l18 28 18-28" fill="none" stroke="#1c1830" strokeWidth="5" strokeLinecap="round" />
  </svg>;
}

function PeopleAndPlace() {
  return <svg viewBox="0 0 720 380" role="presentation">
    <rect x="60" y="64" width="600" height="250" rx="34" fill="#eef0ff" />
    <path d="M90 265c105-105 205-78 278-3 81 83 180 58 262-32" fill="none" stroke="#7457ff" strokeWidth="18" strokeLinecap="round" />
    <circle cx="182" cy="168" r="43" fill="#ffcf55" />
    <path d="M128 286c5-61 25-92 55-92s50 31 55 92" fill="#ec4899" />
    <path d="M470 126h116v160H470z" fill="#fff" stroke="#1c1830" strokeWidth="5" />
    <path d="M450 126l78-68 78 68" fill="#b8f36a" stroke="#1c1830" strokeWidth="5" strokeLinejoin="round" />
    <circle cx="540" cy="223" r="13" fill="#7457ff" />
  </svg>;
}

function EditorialPath() {
  return <svg viewBox="0 0 720 380" role="presentation">
    <rect x="58" y="62" width="604" height="256" rx="38" fill="#1c1830" />
    <circle cx="563" cy="109" r="76" fill="#b8f36a" />
    <path d="M102 250C235 84 360 318 606 154" fill="none" stroke="#fff" strokeWidth="10" />
    {[150, 310, 470].map((x, index) => <g key={x}><circle cx={x} cy={index === 1 ? 222 : 181} r="27" fill={index === 1 ? "#ffcf55" : "#ec4899"} /><text x={x} y={index === 1 ? 228 : 187} textAnchor="middle" className="visual-step">{index + 1}</text></g>)}
  </svg>;
}

function VideoFrames() {
  return <svg viewBox="0 0 720 380" role="presentation">
    <rect x="70" y="68" width="580" height="244" rx="28" fill="#1c1830" />
    <rect x="96" y="94" width="338" height="192" rx="16" fill="#dfe9ff" />
    <path d="M234 141l105 49-105 49z" fill="#7457ff" />
    {[118, 160, 202, 244].map((y, index) => <rect key={y} x="470" y={y} width={130 - index * 12} height="13" rx="6" fill={index === 0 ? "#b8f36a" : "#fff"} />)}
  </svg>;
}

function ConversationMap() {
  return <svg viewBox="0 0 720 380" role="presentation">
    <path d="M82 112h254v134H172l-58 48 16-48H82z" fill="#7457ff" />
    <path d="M386 98h252v138H548l44 55-76-55H386z" fill="#ffcf55" />
    <circle cx="160" cy="177" r="17" fill="#fff" /><circle cx="210" cy="177" r="17" fill="#fff" /><circle cx="260" cy="177" r="17" fill="#fff" />
    <path d="M438 163h142M438 197h104" stroke="#1c1830" strokeWidth="15" strokeLinecap="round" />
  </svg>;
}

export function VisualComposition({ screen, purpose = "practice-context" }: { screen: LessonScreen; purpose?: "cover-atmosphere" | "meaning-map" | "source-context" | "practice-context" }) {
  const asset = resolveVisualAsset({ purpose, screen });
  if (!asset?.composition) return null;
  return <figure className={`visual-composition composition-${asset.composition}`} role="img" aria-label={asset.alt}>
    {asset.composition === "ser-estar-orbit" ? <SerEstarOrbit />
      : asset.composition === "people-and-place" ? <PeopleAndPlace />
        : asset.composition === "video-frames" ? <VideoFrames />
          : asset.composition === "conversation-map" ? <ConversationMap />
            : <EditorialPath />}
    <figcaption>{asset.credit}</figcaption>
  </figure>;
}
