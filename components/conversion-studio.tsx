"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { ResultViewer } from "@/components/result-viewer";
import { saveClientJob } from "@/lib/client-job-store";
import { ACCEPTED_FILE_TYPES, CUT_OPTIONS, CutType, JobSummary, MAX_FILE_SIZE } from "@/lib/job-types";
import { trackEvent } from "@/lib/analytics";

const samples=[
  ["northline","Logo","Northline Studio"],["harbor","Badge","Harbor Coffee"],["pet","Pet","Loyal Companion"],["rocket","Cartoon","Little Voyager"],["make","Text","Make Something"],["floral","AI Artwork","Petal Geometry"],
] as const;
type State="demo"|"selected"|"generating"|"ready"|"error";

export function ConversionStudio(){
 const input=useRef<HTMLInputElement>(null); const studio=useRef<HTMLElement>(null); const [state,setState]=useState<State>("demo"); const [sample,setSample]=useState(0); const [file,setFile]=useState<File|null>(null); const [original,setOriginal]=useState("/demo/generated/northline-original.png"); const [result,setResult]=useState("/demo/generated/northline.svg"); const [cut,setCut]=useState<CutType>("single"); const [error,setError]=useState(""); const [jobId,setJobId]=useState(""); const [drag,setDrag]=useState(false);
 useEffect(()=>{const handler=()=>{studio.current?.scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>input.current?.click(),250)};window.addEventListener("logocut:open-uploader",handler);return()=>window.removeEventListener("logocut:open-uploader",handler)},[]);
 useEffect(()=>()=>{if(file&&original.startsWith("blob:"))URL.revokeObjectURL(original)},[file,original]);
 const choose=(i:number)=>{if(file)return;setSample(i);setOriginal(`/demo/generated/${samples[i][0]}-original.png`);setResult(`/demo/generated/${samples[i][0]}.svg`);trackEvent("demo_sample_selected",{sample:samples[i][0]});};
 const accept=(f:File)=>{if(!ACCEPTED_FILE_TYPES.includes(f.type as typeof ACCEPTED_FILE_TYPES[number])){setError("Please choose a PNG, JPG or JPEG image.");setState("error");return}if(f.size>MAX_FILE_SIZE){setError("That image is over 10 MB. Please choose a smaller file.");setState("error");return}setError("");setFile(f);setOriginal(URL.createObjectURL(f));setState("selected");trackEvent("upload_completed",{source_page:"homepage_studio",file_type:f.type,cut_type:cut});};
 const change=(e:ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(f)accept(f)}; const drop=(e:DragEvent)=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files?.[0];if(f)accept(f)};
 const generate=async()=>{if(!file)return input.current?.click();setState("generating");setError("");trackEvent(jobId?"preview_regenerated":"preview_requested",{source_page:"homepage_studio",cut_type:cut,file_type:file.type});try{const form=new FormData();form.append("image",file);form.append("cutType",cut);const create=await fetch("/api/jobs",{method:"POST",body:form});const data=await create.json() as {job?:JobSummary,error?:string};if(!create.ok||!data.job)throw new Error(data.error??"Could not start preview.");await saveClientJob({...data.job,imageBlob:file}).catch(()=>undefined);const vector=await fetch(`/api/jobs/${data.job.id}/vectorize`,{method:"POST"});const payload=await vector.json() as {error?:string};if(!vector.ok)throw new Error(payload.error??"We couldn't create this preview.");setJobId(data.job.id);setResult(`/api/jobs/${data.job.id}/preview`);setState("ready");trackEvent("preview_generated",{source_page:"homepage_studio",cut_type:cut,file_type:file.type});}catch(e){setError(e instanceof Error?e.message:"We couldn't create this preview.");setState("error")}};
 return <section id="conversion-studio" ref={studio} className="conversion-studio" tabIndex={-1} data-logocut-uploader>
  <div className="studio-sidebar">
   <div><p className="studio-kicker">SVG CONVERSION STUDIO</p><h2>Upload Your Image</h2><p className="studio-copy">Preview before paying</p></div>
   <input ref={input} className="sr-only" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={change}/>
   <div className={`studio-dropzone ${drag?'dragging':''}`} role="button" tabIndex={0} onClick={()=>input.current?.click()} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.current?.click()}}} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={drop}>
    <span className="upload-mark">↑</span><strong>{file?"Replace your image":"Drop a PNG or JPG here"}</strong><span>PNG, JPG or JPEG · Maximum 10 MB</span><button type="button" className="secondary-button" onClick={e=>{e.stopPropagation();input.current?.click()}}>Choose Image</button>
   </div>
   {error&&<p className="studio-error" role="alert">{error}</p>}
   <fieldset className="studio-settings"><legend>Output Type</legend><div className="setting-segments">{CUT_OPTIONS.map(o=><button type="button" key={o.id} className={cut===o.id?'active':''} onClick={()=>{setCut(o.id);trackEvent("conversion_setting_changed",{setting:"output_type",value:o.id})}}><strong>{o.id==='single'?'Single-Color SVG':'Layered SVG'}</strong><span>{o.price}</span></button>)}</div><p>Choose the format that matches your cutting project.</p></fieldset>
   {state==="ready"?<div className="purchase-summary"><span className="success-pill">Free Watermarked Preview</span><h3>{cut==='single'?'Single-Color SVG':'Layered SVG'}</h3><strong className="purchase-price">{cut==='single'?'$5':'$9'} <small>one-time</small></strong><ul><li>Clean SVG without watermark</li><li>Instant download after processing</li><li>No subscription</li></ul><a className="primary-button" href={`/result/${jobId}`}>Unlock Clean SVG</a><button className="text-button" onClick={()=>setState("selected")}>Adjust Settings</button></div>:<button className="primary-button studio-primary" onClick={generate} disabled={state==="generating"}>{state==="generating"?"Creating your preview…":file?"Generate Free Preview":"Try Your Own Image"}</button>}
  </div>
  <div className="studio-result">
   {state==="generating"?<div className="generating" role="status" aria-live="polite"><div className="trace-animation"/><h3>Analyzing your image</h3><p>Tracing clean vector paths</p><p>Preparing your SVG preview</p></div>:<ResultViewer original={original} result={result} originalLabel={file?"Your original":"Original PNG"} badge={state==="ready"?"Free Watermarked Preview":file?undefined:"Example conversion"} title={file?file.name:samples[sample][2]}/>}
   {!file&&<div className="sample-selector" aria-label="Example conversions">{samples.map((s,i)=><button key={s[0]} className={sample===i?'active':''} onClick={()=>choose(i)}><span className="sample-thumb"><img src={`/demo/generated/${s[0]}-thumb.png`} alt="" loading={i===0?"eager":"lazy"}/></span>{s[1]}</button>)}</div>}
  </div>
 </section>
}
