"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { ResultViewer } from "@/components/result-viewer";
import { saveClientJob } from "@/lib/client-job-store";
import {
  ACCEPTED_FILE_TYPES,
  CUT_OPTIONS,
  CutType,
  JobSummary,
  MAX_FILE_SIZE,
} from "@/lib/job-types";
import { trackEvent } from "@/lib/analytics";

const samples = [
  ["northline", "Logo", "Northline Studio"],
  ["harbor", "Badge", "Harbor Coffee"],
  ["pet", "Pet", "Loyal Companion"],
  ["rocket", "Cartoon", "Little Voyager"],
  ["make", "Text", "Make Something"],
  ["floral", "AI Artwork", "Petal Geometry"],
] as const;

type StudioState =
  | "demo"
  | "file_selected"
  | "preview_generating"
  | "preview_ready"
  | "preview_error"
  | "paid_result";

function SelectedFilePlaceholder({ original, title }: { original: string; title: string }) {
  return (
    <div className="selected-file-result" aria-live="polite">
      <div className="selected-file-heading">
        <span className="selected-state-badge">IMAGE SELECTED</span>
        <h3>Your image is ready</h3>
        <p>Generate a free preview to see your SVG result.</p>
      </div>
      <div className="selected-file-pair">
        <figure>
          <span>Your original</span>
          <img src={original} alt={`Uploaded image: ${title}`} />
        </figure>
        <div className="empty-svg-preview">
          <span aria-hidden="true">◇</span>
          <strong>Your SVG preview will appear here</strong>
        </div>
      </div>
    </div>
  );
}

function PreviewGenerating({ original, title }: { original: string; title: string }) {
  return (
    <div className="generating-layout" role="status" aria-live="polite">
      <figure className="generating-original">
        <span>Your original</span>
        <img src={original} alt={`Uploaded image: ${title}`} />
      </figure>
      <div className="generating">
        <div className="trace-animation" />
        <h3>Analyzing your image</h3>
        <p>Tracing vector paths</p>
        <p>Preparing your SVG preview</p>
      </div>
    </div>
  );
}

export function ConversionStudio() {
  const input = useRef<HTMLInputElement>(null);
  const studio = useRef<HTMLElement>(null);
  const [state, setState] = useState<StudioState>("demo");
  const [sample, setSample] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [userOriginalUrl, setUserOriginalUrl] = useState<string | null>(null);
  const [userPreviewUrl, setUserPreviewUrl] = useState<string | null>(null);
  const [cut, setCut] = useState<CutType>("single");
  const [previewCut, setPreviewCut] = useState<CutType | null>(null);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState("");
  const [drag, setDrag] = useState(false);

  const demoOriginal = `/demo/generated/${samples[sample][0]}-original.png`;
  const demoResult = `/demo/generated/${samples[sample][0]}.svg`;

  useEffect(() => {
    const handler = () => {
      studio.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => input.current?.click(), 250);
    };
    window.addEventListener("logocut:open-uploader", handler);
    return () => window.removeEventListener("logocut:open-uploader", handler);
  }, []);

  useEffect(
    () => () => {
      if (userOriginalUrl?.startsWith("blob:")) URL.revokeObjectURL(userOriginalUrl);
    },
    [userOriginalUrl],
  );

  const chooseSample = (index: number) => {
    if (state !== "demo") return;
    setSample(index);
    trackEvent("demo_sample_selected", { sample: samples[index][0] });
  };

  const clearRealPreview = () => {
    setUserPreviewUrl(null);
    setPreviewCut(null);
    setJobId("");
  };

  const acceptFile = (nextFile: File) => {
    if (!ACCEPTED_FILE_TYPES.includes(nextFile.type as (typeof ACCEPTED_FILE_TYPES)[number])) {
      setError("Please choose a PNG, JPG or JPEG image.");
      if (file) setState("preview_error");
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setError("That image is over 10 MB. Please choose a smaller file.");
      if (file) setState("preview_error");
      return;
    }

    setError("");
    setFile(nextFile);
    setUserOriginalUrl(URL.createObjectURL(nextFile));
    clearRealPreview();
    setState("file_selected");
    trackEvent("upload_completed", {
      source_page: "homepage_studio",
      file_type: nextFile.type,
      cut_type: cut,
    });
  };

  const changeFile = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) acceptFile(nextFile);
  };

  const dropFile = (event: DragEvent) => {
    event.preventDefault();
    setDrag(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) acceptFile(nextFile);
  };

  const changeCut = (nextCut: CutType) => {
    if (nextCut === cut) return;
    setCut(nextCut);
    trackEvent("conversion_setting_changed", { setting: "output_type", value: nextCut });

    if (state === "preview_ready" || state === "paid_result") {
      clearRealPreview();
      setError("Settings changed. Generate a new preview to update the SVG.");
      setState("file_selected");
    }
  };

  const generatePreview = async () => {
    if (!file) {
      input.current?.click();
      return;
    }

    clearRealPreview();
    setState("preview_generating");
    setError("");
    trackEvent("preview_requested", {
      source_page: "homepage_studio",
      cut_type: cut,
      file_type: file.type,
    });

    try {
      const form = new FormData();
      form.append("image", file);
      form.append("cutType", cut);
      const createResponse = await fetch("/api/jobs", { method: "POST", body: form });
      const createPayload = (await createResponse.json()) as { job?: JobSummary; error?: string };
      if (!createResponse.ok || !createPayload.job) {
        throw new Error(createPayload.error ?? "Could not start preview.");
      }

      await saveClientJob({ ...createPayload.job, imageBlob: file }).catch(() => undefined);
      const previewResponse = await fetch(`/api/jobs/${createPayload.job.id}/vectorize`, {
        method: "POST",
      });
      const previewPayload = (await previewResponse.json()) as { error?: string };
      if (!previewResponse.ok) {
        throw new Error(previewPayload.error ?? "We couldn't create this preview.");
      }

      setJobId(createPayload.job.id);
      setUserPreviewUrl(`/api/jobs/${createPayload.job.id}/preview`);
      setPreviewCut(cut);
      setState("preview_ready");
      trackEvent("preview_generated", {
        source_page: "homepage_studio",
        cut_type: cut,
        file_type: file.type,
      });
    } catch (previewError) {
      clearRealPreview();
      setError(
        previewError instanceof Error ? previewError.message : "We couldn't create this preview.",
      );
      setState("preview_error");
    }
  };

  const hasMatchingPreview =
    state === "preview_ready" && Boolean(userOriginalUrl && userPreviewUrl && jobId) && previewCut === cut;

  return (
    <section
      id="conversion-studio"
      ref={studio}
      className="conversion-studio"
      tabIndex={-1}
      data-logocut-uploader
      data-studio-state={state}
    >
      <div className="studio-sidebar">
        <div>
          <p className="studio-kicker">SVG CONVERSION STUDIO</p>
          <h2>Upload Your Image</h2>
          <p className="studio-copy">Preview before paying</p>
        </div>
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          onChange={changeFile}
        />
        <div
          className={`studio-dropzone ${drag ? "dragging" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              input.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={dropFile}
        >
          <span className="upload-mark">↑</span>
          <strong>{file ? "Replace your image" : "Drop a PNG or JPG here"}</strong>
          <span>PNG, JPG or JPEG · Maximum 10 MB</span>
          <button
            type="button"
            className="secondary-button"
            onClick={(event) => {
              event.stopPropagation();
              if (input.current) input.current.value = "";
              input.current?.click();
            }}
          >
            Choose Image
          </button>
        </div>
        {error ? (
          <p className="studio-error" role="alert">
            {error}
          </p>
        ) : null}
        <fieldset className="studio-settings">
          <legend>Output Type</legend>
          <div className="setting-segments">
            {CUT_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.id}
                className={cut === option.id ? "active" : ""}
                onClick={() => changeCut(option.id)}
              >
                <strong>{option.id === "single" ? "Single-Color SVG" : "Layered SVG"}</strong>
                <span>{option.price}</span>
              </button>
            ))}
          </div>
          <p>Choose the format that matches your cutting project.</p>
        </fieldset>
        {hasMatchingPreview ? (
          <div className="purchase-summary">
            <span className="success-pill">Free Watermarked Preview</span>
            <h3>{cut === "single" ? "Single-Color SVG" : "Layered SVG"}</h3>
            <strong className="purchase-price">
              {cut === "single" ? "$5" : "$9"} <small>one-time</small>
            </strong>
            <ul>
              <li>Clean SVG without watermark</li>
              <li>Instant download after processing</li>
              <li>No subscription</li>
            </ul>
            <a className="primary-button" href={`/result/${jobId}`}>
              Unlock Clean SVG
            </a>
            <button className="text-button" onClick={() => setState("file_selected")}>
              Adjust Settings
            </button>
          </div>
        ) : (
          <button
            className="primary-button studio-primary"
            onClick={generatePreview}
            disabled={state === "preview_generating"}
          >
            {state === "preview_generating"
              ? "Creating your preview…"
              : file
                ? "Generate Free Preview"
                : "Try Your Own Image"}
          </button>
        )}
      </div>
      <div className="studio-result">
        {state === "demo" ? (
          <ResultViewer
            original={demoOriginal}
            result={demoResult}
            badge="Example conversion"
            title={samples[sample][2]}
          />
        ) : null}
        {(state === "file_selected" || state === "preview_error") && userOriginalUrl && file ? (
          <SelectedFilePlaceholder original={userOriginalUrl} title={file.name} />
        ) : null}
        {state === "preview_generating" && userOriginalUrl && file ? (
          <PreviewGenerating original={userOriginalUrl} title={file.name} />
        ) : null}
        {hasMatchingPreview && userOriginalUrl && userPreviewUrl && file ? (
          <ResultViewer
            original={userOriginalUrl}
            result={userPreviewUrl}
            originalLabel="Your original"
            badge="Free SVG Preview"
            title={`${file.name} · ${cut === "single" ? "Single-Color SVG" : "Layered SVG"}`}
          />
        ) : null}
        {state === "demo" ? (
          <div className="sample-selector" aria-label="Example conversions">
            {samples.map((item, index) => (
              <button
                key={item[0]}
                className={sample === index ? "active" : ""}
                onClick={() => chooseSample(index)}
              >
                <span className="sample-thumb">
                  <img
                    src={`/demo/generated/${item[0]}-thumb.png`}
                    alt=""
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </span>
                {item[1]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
