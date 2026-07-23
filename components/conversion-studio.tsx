"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ResultViewer } from "@/components/result-viewer";
import {
  clearActiveConversion,
  getActiveConversion,
  getClientJob,
  saveActiveConversion,
  saveClientJob,
} from "@/lib/client-job-store";
import {
  ACCEPTED_FILE_TYPES,
  CUT_OPTIONS,
  CutType,
  JobSummary,
  MAX_FILE_SIZE,
  ONE_TIME_PRODUCT_OPTIONS,
  OneTimeProductType,
  getDefaultProductTypeForOutput,
} from "@/lib/job-types";
import { trackEvent } from "@/lib/analytics";
import { resolvePreviewAsset } from "@/lib/preview-asset";
import { PayPalCheckout } from "@/components/paypal-checkout";

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
type PreviewAssetState =
  | "preview_asset_loading"
  | "preview_asset_ready"
  | "preview_asset_error"
  | null;
type PreviewFailureCode =
  | "network_error"
  | "missing_credentials"
  | "vectorizer_error"
  | "invalid_input"
  | "unknown_error";

const previewHelperCopy: Record<CutType, string> = {
  single: "Colors are intentionally simplified for vinyl, decals and silhouette cuts.",
  multi: "Colors are separated into layered shapes for multi-color projects.",
};

const previewFailureMessages: Record<PreviewFailureCode, string> = {
  network_error: "The preview service could not be reached. Please retry.",
  missing_credentials: "Preview service is temporarily unavailable.",
  vectorizer_error: "We couldn’t generate this preview right now. Please retry.",
  invalid_input: "This image could not be processed. Try another PNG or JPG.",
  unknown_error: "We couldn’t generate this preview right now. Please retry.",
};

function isPreviewFailureCode(value: unknown): value is PreviewFailureCode {
  return (
    value === "network_error" ||
    value === "missing_credentials" ||
    value === "vectorizer_error" ||
    value === "invalid_input"
  );
}

function getPreviewFailureMessage(code: PreviewFailureCode) {
  return previewFailureMessages[code] ?? previewFailureMessages.unknown_error;
}

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

function PreviewDisplayError({ onRetry, onChoose }: { onRetry: () => void; onChoose: () => void }) {
  return (
    <div className="preview-display-error" role="alert">
      <span aria-hidden="true">!</span>
      <h3>Preview could not be displayed</h3>
      <p>The SVG was generated, but the preview file could not be loaded. Please try again.</p>
      <div>
        <button className="primary-button" onClick={onRetry}>Retry Preview</button>
        <button className="secondary-button" onClick={onChoose}>Choose Another Image</button>
      </div>
    </div>
  );
}

function PreviewGenerationError({
  original,
  title,
  message,
  onRetry,
  onChoose,
}: {
  original: string;
  title: string;
  message: string;
  onRetry: () => void;
  onChoose: () => void;
}) {
  return (
    <div className="preview-generation-error" role="alert">
      <figure>
        <span>Your original</span>
        <img src={original} alt={`Uploaded image: ${title}`} />
      </figure>
      <div>
        <span aria-hidden="true">!</span>
        <h3>Preview failed</h3>
        <p>{message}</p>
        <div>
          <button className="primary-button" onClick={onRetry}>
            Retry Preview
          </button>
          <button className="secondary-button" onClick={onChoose}>
            Choose Another Image
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckoutTrustCopy() {
  return (
    <div className="checkout-trust-copy" aria-label="Checkout reassurance">
      <span>One-time payment</span>
      <span>No subscription</span>
      <span>Secure PayPal checkout</span>
      <span>Preview before payment</span>
      <span>Immediate download</span>
      <span>Support if generation fails</span>
      <nav aria-label="Checkout policies">
        <Link href="/support">Refund/support policy</Link>
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/terms">Terms of use</Link>
      </nav>
    </div>
  );
}

export function ConversionStudio() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const studio = useRef<HTMLElement>(null);
  const previewDisplayedJobRef = useRef("");
  const [state, setState] = useState<StudioState>("demo");
  const [sample, setSample] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [userOriginalUrl, setUserOriginalUrl] = useState<string | null>(null);
  const [userPreviewUrl, setUserPreviewUrl] = useState<string | null>(null);
  const [previewReference, setPreviewReference] = useState<string | null>(null);
  const [previewAssetState, setPreviewAssetState] = useState<PreviewAssetState>(null);
  const [cut, setCut] = useState<CutType>("single");
  const [productType, setProductType] = useState<OneTimeProductType>("single_svg");
  const [previewCut, setPreviewCut] = useState<CutType | null>(null);
  const [error, setError] = useState("");
  const [previewFailureCode, setPreviewFailureCode] =
    useState<PreviewFailureCode | null>(null);
  const [jobId, setJobId] = useState("");
  const [drag, setDrag] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [restoreMessage, setRestoreMessage] = useState("");
  const [restoredResultUrl, setRestoredResultUrl] = useState("");

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

  useEffect(() => {
    let active = true;

    async function restoreActiveConversion() {
      const activeConversion = getActiveConversion();

      if (!activeConversion?.jobId) {
        return;
      }

      try {
        const response = await fetch(`/api/jobs/${activeConversion.jobId}`);
        const payload = (await response.json()) as {
          job?: JobSummary;
          productType?: OneTimeProductType;
          previewReady?: boolean;
          svgReady?: boolean;
          paymentStatus?: "unpaid" | "paid";
        };

        if (!active || !response.ok || !payload.job) {
          clearActiveConversion();
          return;
        }

        const product =
          payload.productType ??
          payload.job.productType ??
          activeConversion.productType;
        const previewMode = payload.job.cutType ?? activeConversion.previewMode;
        setCut(previewMode);
        setProductType(product);
        setJobId(payload.job.id);

        if (payload.paymentStatus === "paid" || payload.svgReady) {
          setRestoredResultUrl(`/result/${payload.job.id}`);
          setRestoreMessage("Your paid result is still available.");
          setState("paid_result");
          saveActiveConversion({
            jobId: payload.job.id,
            cutType: previewMode,
            productType: product,
            previewMode,
            previewStatus: payload.previewReady ? "ready" : "not_started",
            paymentStatus: "paid",
            svgReady: Boolean(payload.svgReady),
          });
          return;
        }

        if (!payload.previewReady) {
          clearActiveConversion();
          return;
        }

        const storedJob = await getClientJob(payload.job.id).catch(() => null);

        if (!active) {
          return;
        }

        if (!storedJob?.imageBlob) {
          setRestoredResultUrl(`/result/${payload.job.id}`);
          setRestoreMessage("Your preview is still available.");
          setState("file_selected");
          return;
        }

        const restoredFile = new File([storedJob.imageBlob], payload.job.fileName, {
          type: payload.job.fileType,
        });
        setFile(restoredFile);
        setUserOriginalUrl(URL.createObjectURL(restoredFile));
        setPreviewCut(previewMode);
        setPreviewReference(`/api/jobs/${payload.job.id}/preview`);
        setRestoreMessage("Your previous preview was restored.");
        await loadPreviewAsset(`/api/jobs/${payload.job.id}/preview`);
        saveActiveConversion({
          jobId: payload.job.id,
          cutType: previewMode,
          productType: product,
          previewMode,
          previewStatus: "ready",
          paymentStatus: "unpaid",
          svgReady: false,
        });
      } catch {
        clearActiveConversion();
      }
    }

    void restoreActiveConversion();

    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (userPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(userPreviewUrl);
    },
    [userPreviewUrl],
  );

  const chooseSample = (index: number) => {
    if (state !== "demo") return;
    setSample(index);
    trackEvent("demo_sample_selected", { sample: samples[index][0] });
  };

  const clearRealPreview = () => {
    setUserPreviewUrl(null);
    setPreviewReference(null);
    setPreviewAssetState(null);
    setPreviewCut(null);
    setPreviewFailureCode(null);
    setJobId("");
  };

  const startNewConversion = () => {
    clearActiveConversion();
    clearRealPreview();
    setFile(null);
    setUserOriginalUrl(null);
    setRecoveryEmail("");
    setRestoredResultUrl("");
    setRestoreMessage("");
    setError("");
    setState("demo");
    trackEvent("new_conversion_started", { source_page: "conversion_studio" });
  };

  const loadPreviewAsset = async (reference: string) => {
    setPreviewAssetState("preview_asset_loading");
    setState("preview_generating");
    try {
      const resolvedUrl = await resolvePreviewAsset(reference);
      setUserPreviewUrl(resolvedUrl);
      return true;
    } catch {
      setUserPreviewUrl(null);
      setPreviewAssetState("preview_asset_error");
      setState("preview_error");
      return false;
    }
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
    setRestoredResultUrl("");
    setRestoreMessage("");
    trackEvent("upload_completed", {
      source_page: "homepage_studio",
      file_type: nextFile.type,
      cut_type: cut,
    });
    trackEvent("file_accepted", {
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

  const resetStalePreviewAfterModeChange = () => {
    if (state === "preview_ready" || state === "paid_result") {
      clearActiveConversion();
      clearRealPreview();
      setError("Settings changed. Generate a new preview to update the SVG.");
      setState("file_selected");
    }
  };

  const changeCut = (nextCut: CutType) => {
    if (nextCut === cut) return;
    setCut(nextCut);
    setProductType((currentProductType) =>
      currentProductType === "complete_pack"
        ? "complete_pack"
        : getDefaultProductTypeForOutput(nextCut),
    );
    trackEvent("conversion_setting_changed", { setting: "output_type", value: nextCut });
    trackEvent("preview_view_mode_changed", {
      preview_mode: nextCut,
      product_type: productType,
      source_page: "homepage_studio",
    });

    resetStalePreviewAfterModeChange();
  };

  const selectProductType = (nextProductType: OneTimeProductType) => {
    setProductType(nextProductType);
    trackEvent("product_selected", {
      product_type: nextProductType,
      price:
        nextProductType === "complete_pack"
          ? 12
          : nextProductType === "layered_svg"
            ? 9
            : 5,
      source_page: "homepage_studio",
    });

    if (nextProductType === "complete_pack" && cut !== "multi") {
      setCut("multi");
      trackEvent("preview_view_mode_changed", {
        preview_mode: "multi",
        product_type: "complete_pack",
        source_page: "homepage_studio",
      });
      resetStalePreviewAfterModeChange();
    }
  };

  const toggleCompletePack = () => {
    const selectingCompletePack = productType !== "complete_pack";
    const nextProductType = selectingCompletePack
      ? "complete_pack"
      : getDefaultProductTypeForOutput(cut);

    selectProductType(nextProductType);
    trackEvent("conversion_setting_changed", {
      setting: "product_type",
      value: nextProductType,
      product_type: nextProductType,
      price: selectingCompletePack ? 12 : undefined,
      source: "studio_above_fold",
    });
  };

  const generatePreview = async () => {
    if (!file) {
      input.current?.click();
      return;
    }

    clearRealPreview();
    setState("preview_generating");
    setError("");
    setPreviewFailureCode(null);
    trackEvent("preview_requested", {
      source_page: "homepage_studio",
      cut_type: cut,
      preview_mode: cut,
      file_type: file.type,
    });
    trackEvent("preview_started", {
      source_page: "homepage_studio",
      cut_type: cut,
      preview_mode: cut,
      file_type: file.type,
    });

    try {
      const form = new FormData();
      form.append("image", file);
      form.append("cutType", cut);
      form.append("productType", productType);
      const createResponse = await fetch("/api/jobs", { method: "POST", body: form });
      const createPayload = (await createResponse.json()) as {
        job?: JobSummary;
        error?: string;
        code?: unknown;
      };
      if (!createResponse.ok || !createPayload.job) {
        throw {
          code: isPreviewFailureCode(createPayload.code)
            ? createPayload.code
            : "unknown_error",
        };
      }

      await saveClientJob({ ...createPayload.job, imageBlob: file }).catch(() => undefined);
      saveActiveConversion({
        jobId: createPayload.job.id,
        cutType: cut,
        productType,
        previewMode: cut,
        previewStatus: "not_started",
        paymentStatus: "unpaid",
        svgReady: false,
      });
      const previewResponse = await fetch(`/api/jobs/${createPayload.job.id}/vectorize`, {
        method: "POST",
      });
      const previewPayload = (await previewResponse.json()) as {
        error?: string;
        code?: unknown;
        detail?: string;
        previewAsset?: {
          reference?: string;
          contentType?: string;
          base64?: string;
        } | null;
      };
      if (!previewResponse.ok) {
        throw {
          code: isPreviewFailureCode(previewPayload.code)
            ? previewPayload.code
            : "unknown_error",
        };
      }

      setJobId(createPayload.job.id);
      setPreviewCut(cut);
      const reference =
        previewPayload.previewAsset?.reference ?? `/api/jobs/${createPayload.job.id}/preview`;
      setPreviewReference(reference);
      const immediatePreview =
        previewPayload.previewAsset?.base64 &&
        previewPayload.previewAsset.contentType === "image/svg+xml"
          ? `data:image/svg+xml;base64,${previewPayload.previewAsset.base64}`
          : reference;
      await loadPreviewAsset(immediatePreview);
      saveActiveConversion({
        jobId: createPayload.job.id,
        cutType: cut,
        productType,
        previewMode: cut,
        previewStatus: "ready",
        paymentStatus: "unpaid",
        svgReady: false,
      });
      trackEvent("preview_generated", {
        source_page: "homepage_studio",
        cut_type: cut,
        preview_mode: cut,
        file_type: file.type,
      });
    } catch (previewError) {
      const failureCode =
        typeof previewError === "object" &&
        previewError !== null &&
        "code" in previewError &&
        isPreviewFailureCode(previewError.code)
          ? previewError.code
          : "unknown_error";
      clearRealPreview();
      setPreviewFailureCode(failureCode);
      setError(getPreviewFailureMessage(failureCode));
      setState("preview_error");
      trackEvent("preview_failed", {
        source_page: "homepage_studio",
        cut_type: cut,
        preview_mode: cut,
        preview_failure_code: failureCode,
      });
    }
  };

  const hasMatchingPreview =
    state === "preview_ready" &&
    previewAssetState === "preview_asset_ready" &&
    Boolean(userOriginalUrl && userPreviewUrl && jobId) &&
    previewCut === cut;
  const selectedProduct = ONE_TIME_PRODUCT_OPTIONS.find(
    (option) => option.id === productType,
  ) ?? ONE_TIME_PRODUCT_OPTIONS[0];
  const isCompletePackSelected = productType === "complete_pack";

  const markPreviewLoaded = () => {
    setPreviewAssetState("preview_asset_ready");
    setState("preview_ready");
    if (jobId && previewDisplayedJobRef.current !== jobId) {
      previewDisplayedJobRef.current = jobId;
      trackEvent("preview_displayed", { cut_type: cut, source_page: "conversion_studio" });
    }
  };

  const markPreviewFailed = () => {
    setPreviewAssetState("preview_asset_error");
    setPreviewFailureCode("vectorizer_error");
    setError(getPreviewFailureMessage("vectorizer_error"));
    setState("preview_error");
    if (jobId) {
      saveActiveConversion({
        jobId,
        cutType: cut,
        productType,
        previewMode: cut,
        previewStatus: "failed",
        paymentStatus: "unpaid",
        svgReady: false,
      });
    }
    trackEvent("preview_failed", {
      source_page: "homepage_studio",
      cut_type: cut,
      preview_mode: cut,
      preview_failure_code: "vectorizer_error",
    });
  };

  const retryPreview = async () => {
    trackEvent("preview_retry_clicked", {
      source_page: "homepage_studio",
      cut_type: cut,
      preview_mode: cut,
      preview_failure_code: previewFailureCode ?? undefined,
    });
    if (previewReference) {
      const recovered = await loadPreviewAsset(previewReference);
      if (recovered) return;
    }
    await generatePreview();
  };

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
        <button
          type="button"
          className={`complete-pack-card ${isCompletePackSelected ? "active" : ""}`}
          onClick={toggleCompletePack}
          aria-pressed={isCompletePackSelected}
        >
          <span className="complete-pack-main">
            <span className="complete-pack-badge">Best value</span>
            <span className="complete-pack-copy">
              <strong>Complete SVG Pack</strong>
              <small>Both SVG versions from one upload</small>
            </span>
          </span>
          <span className="complete-pack-price">
            <b>$12</b>
            <small>Save $2</small>
          </span>
        </button>
        {isCompletePackSelected ? (
          <div className="complete-preview-switch" role="group" aria-label="Choose preview type">
            <span>View preview as</span>
            <button
              type="button"
              className={cut === "single" ? "active" : ""}
              onClick={() => changeCut("single")}
            >
              Single-Color Preview
            </button>
            <button
              type="button"
              className={cut === "multi" ? "active" : ""}
              onClick={() => changeCut("multi")}
            >
              Layered Preview
            </button>
            <p>{previewHelperCopy[cut]}</p>
          </div>
        ) : null}
        {restoreMessage ? (
          <div className="restore-banner">
            <p>{restoreMessage}</p>
            <button className="text-button" type="button" onClick={startNewConversion}>
              Start a new conversion
            </button>
          </div>
        ) : null}
        {hasMatchingPreview ? (
          <div className="purchase-summary">
            <span className="success-pill">Free Watermarked Preview</span>
            <h2>
              {isCompletePackSelected
                ? "Unlock both clean SVG files for $12"
                : "Unlock Your Clean SVG"}
            </h2>
            <div className="product-choice-list" role="radiogroup" aria-label="Choose product">
              {ONE_TIME_PRODUCT_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={productType === option.id ? "active" : ""}
                  onClick={() => {
                    selectProductType(option.id);
                    trackEvent("conversion_setting_changed", {
                      setting: "product_type",
                      value: option.id,
                    });
                  }}
                  role="radio"
                  aria-checked={productType === option.id}
                >
                  <span>
                    <strong>{option.name}</strong>
                    {option.badge ? <em>{option.badge}</em> : null}
                  </span>
                  <small>{option.description}</small>
                  <b>{option.price}</b>
                </button>
              ))}
            </div>
            <h3>{selectedProduct.name}</h3>
            <strong className="purchase-price">
              {selectedProduct.price} <small>one-time</small>
            </strong>
            <ul>
              <li>
                {productType === "complete_pack"
                  ? "Both clean single-color and layered SVG files"
                  : "Clean SVG without watermark"}
              </li>
              <li>Instant download after processing</li>
              <li>No subscription</li>
            </ul>
            <label className="recovery-email-field">
              <span>Email me my download link</span>
              <input
                type="email"
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <small>Optional. No account required.</small>
            </label>
            <CheckoutTrustCopy />
            <PayPalCheckout
              jobId={jobId}
              cutType={cut}
              productType={productType}
              recoveryEmail={recoveryEmail}
            />
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
              : "Generate Free Preview"}
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
        {state === "paid_result" && restoredResultUrl ? (
          <div className="selected-file-result" aria-live="polite">
            <div className="selected-file-heading">
              <span className="selected-state-badge">RESULT READY</span>
              <h3>Your paid SVG is available</h3>
              <p>Continue to your result page to download your files.</p>
            </div>
            <div className="empty-svg-preview">
              <span aria-hidden="true">✓</span>
              <strong>Download links are ready</strong>
              <button
                className="primary-button"
                type="button"
                onClick={() => router.push(restoredResultUrl)}
              >
                Continue to downloads
              </button>
              <button className="secondary-button" type="button" onClick={startNewConversion}>
                Start a new conversion
              </button>
            </div>
          </div>
        ) : null}
        {state === "file_selected" && userOriginalUrl && file ? (
          <SelectedFilePlaceholder original={userOriginalUrl} title={file.name} />
        ) : null}
        {state === "preview_generating" && !userPreviewUrl && userOriginalUrl && file ? (
          <PreviewGenerating original={userOriginalUrl} title={file.name} />
        ) : null}
        {(previewAssetState === "preview_asset_loading" || hasMatchingPreview) && userOriginalUrl && userPreviewUrl && file ? (
          <ResultViewer
            original={userOriginalUrl}
            result={userPreviewUrl}
            originalLabel="Your original"
            resultLabel={cut === "single" ? "Single-Color Preview" : "Layered Preview"}
            resultAlt={cut === "single" ? "Single-color SVG preview" : "Layered SVG preview"}
            badge={cut === "single" ? "Single-Color Preview" : "Layered Preview"}
            title={`${file.name} · ${cut === "single" ? "Single-Color Preview" : "Layered Preview"}`}
            controlsEnabled={hasMatchingPreview}
            onResultLoad={markPreviewLoaded}
            onResultError={markPreviewFailed}
          />
        ) : null}
        {state === "preview_error" && previewAssetState === "preview_asset_error" ? (
          <PreviewDisplayError onRetry={retryPreview} onChoose={() => input.current?.click()} />
        ) : null}
        {state === "preview_error" && previewAssetState !== "preview_asset_error" && userOriginalUrl && file ? (
          <PreviewGenerationError
            original={userOriginalUrl}
            title={file.name}
            message={error || getPreviewFailureMessage(previewFailureCode ?? "unknown_error")}
            onRetry={retryPreview}
            onChoose={() => input.current?.click()}
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
