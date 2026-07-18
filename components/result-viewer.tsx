"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type Props = {
  original: string;
  result: string;
  originalLabel?: string;
  resultLabel?: string;
  resultAlt?: string;
  badge?: string;
  title?: string;
  controlsEnabled?: boolean;
  onResultLoad?: () => void;
  onResultError?: () => void;
};
type Mode = "compare" | "svg" | "cut";

export function ResultViewer({ original, result, originalLabel="Original PNG", resultLabel="Clean SVG", resultAlt="Clean SVG", badge, title, controlsEnabled=true, onResultLoad, onResultError }: Props) {
  const [split,setSplit]=useState(52); const [mode,setMode]=useState<Mode>("compare"); const [zoom,setZoom]=useState(1); const [material,setMaterial]=useState("white");
  const box=useRef<HTMLDivElement>(null);
  const changeMode=(next:Mode)=>{setMode(next);trackEvent("preview_view_mode_changed",{view_mode:next});};
  const nudge=(value:number)=>{setSplit(value);trackEvent("comparison_slider_used",{position_bucket:Math.round(value/10)*10});};
  const zoomBy=(amount:number)=>{setZoom(v=>Math.max(.6,Math.min(2.4,v+amount)));trackEvent("preview_zoom_used",{direction:amount>0?"in":"out"});};
  return <div className="result-viewer" ref={box}>
    <div className="result-topbar"><div>{badge&&<span className="example-badge">{badge}</span>}<strong>{title}</strong></div>{controlsEnabled&&<div className="view-tabs" role="group" aria-label="Preview view">{([['compare','Compare'],['svg','SVG Only'],['cut','Cut Preview']] as const).map(([id,label])=><button key={id} className={mode===id?'active':''} onClick={()=>changeMode(id)}>{label}</button>)}</div>}</div>
    <div className={`result-canvas material-${material}`}>
      {mode==="compare"?<div className="comparison-view">
        <img src={original} alt={`${title??'Design'} original raster image`} className="comparison-image"/>
        <div className="comparison-result" style={{clipPath:`inset(0 0 0 ${split}%)`}}><img src={result} alt={resultAlt} className="comparison-image" onLoad={onResultLoad} onError={onResultError}/></div>
        <span className="compare-label original-label">{originalLabel}</span><span className="compare-label svg-label">{resultLabel}</span>
        {controlsEnabled&&<><input className="comparison-range" type="range" min="5" max="95" value={split} onChange={e=>nudge(Number(e.target.value))} aria-label="Move before and after comparison"/><div className="comparison-handle" style={{left:`${split}%`}} aria-hidden="true"><span>↔</span></div></>}
      </div>:<div className={`single-view ${mode==='cut'?'is-cut':''}`}><img src={result} alt={resultAlt} style={{transform:`scale(${zoom})`}} onLoad={onResultLoad} onError={onResultError}/></div>}
    </div>
    {controlsEnabled&&<div className="result-toolbar">
      {mode==="cut"&&<select aria-label="Cut preview material" value={material} onChange={e=>{setMaterial(e.target.value);trackEvent("cut_preview_background_changed",{background:e.target.value});}}><option value="white">White vinyl</option><option value="black">Black vinyl</option><option value="kraft">Kraft paper</option><option value="grid">Transparent grid</option></select>}
      {mode!=="compare"&&<><button onClick={()=>zoomBy(-.2)} aria-label="Zoom out">−</button><button onClick={()=>setZoom(1)}>Fit</button><button onClick={()=>zoomBy(.2)} aria-label="Zoom in">+</button></>}
      <button onClick={()=>box.current?.requestFullscreen?.()}>Fullscreen</button>
    </div>}
  </div>;
}
