"use client";

import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { saveClientJob } from "@/lib/client-job-store";
import { trackEvent } from "@/lib/analytics";
import {
  ACCEPTED_FILE_TYPES,
  CUT_OPTIONS,
  CutType,
  JobSummary,
  MAX_FILE_SIZE,
} from "@/lib/job-types";

type ConversionUploaderProps = {
  sourcePage: string;
  compact?: boolean;
};

type OpenUploaderEvent = CustomEvent<{
  sourcePage?: string;
  cutType?: CutType;
}>;

export function ConversionUploader({
  sourcePage,
  compact = false,
}: ConversionUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploaderRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedCut, setSelectedCut] = useState<CutType>("single");
  const [lastSourcePage, setLastSourcePage] = useState(sourcePage);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleOpenUploader = (event: Event) => {
      const customEvent = event as OpenUploaderEvent;

      if (customEvent.detail?.cutType) {
        setSelectedCut(customEvent.detail.cutType);
      }

      setLastSourcePage(customEvent.detail?.sourcePage ?? sourcePage);
      trackEvent("uploader_clicked", {
        source_page: customEvent.detail?.sourcePage ?? sourcePage,
        cut_type: customEvent.detail?.cutType,
      });
      uploaderRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      uploaderRef.current?.focus();
      fileInputRef.current?.click();
    };

    window.addEventListener("logocut:open-uploader", handleOpenUploader);

    return () =>
      window.removeEventListener("logocut:open-uploader", handleOpenUploader);
  }, [sourcePage]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const openFilePicker = () => {
    trackEvent("uploader_clicked", {
      source_page: lastSourcePage,
      cut_type: selectedCut,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const validateAndSetFile = (file: File) => {
    trackEvent("upload_started", {
      source_page: lastSourcePage,
      cut_type: selectedCut,
      file_type: file.type,
    });

    if (
      !ACCEPTED_FILE_TYPES.includes(
        file.type as (typeof ACCEPTED_FILE_TYPES)[number],
      )
    ) {
      setError("Please upload a PNG or JPG image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Please upload an image under 10 MB.");
      return;
    }

    setError("");
    setSelectedFile(file);
    trackEvent("upload_completed", {
      source_page: lastSourcePage,
      cut_type: selectedCut,
      file_type: file.type,
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleUploadKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedFile) {
      setError("Please upload a PNG or JPG image.");
      uploaderRef.current?.focus();
      return;
    }

    setError("");
    setIsSubmitting(true);
    trackEvent("preview_requested", {
      source_page: lastSourcePage,
      cut_type: selectedCut,
      file_type: selectedFile.type,
    });

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("cutType", selectedCut);

      const response = await fetch("/api/jobs", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        job?: JobSummary;
        error?: string;
      };

      if (!response.ok || !payload.job) {
        throw new Error(payload.error ?? "Could not start processing.");
      }

      await saveClientJob({
        ...payload.job,
        imageBlob: selectedFile,
      }).catch(() => undefined);

      const previewResponse = await fetch(
        `/api/jobs/${payload.job.id}/vectorize`,
        { method: "POST" },
      );
      const previewPayload = (await previewResponse.json()) as {
        error?: string;
      };

      if (!previewResponse.ok) {
        throw new Error(
          previewPayload.error ??
            "We couldn't create a preview from this image. Try a clearer logo.",
        );
      }

      trackEvent("preview_generated", {
        source_page: lastSourcePage,
        cut_type: selectedCut,
        file_type: selectedFile.type,
      });
      window.location.href = `/result/${payload.job.id}`;
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "We couldn't create a preview from this image. Try a clearer logo.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <section
      ref={uploaderRef}
      aria-label="Upload image for SVG conversion"
      className="uploader-shell"
      data-logocut-uploader
      tabIndex={-1}
    >
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        aria-label="Choose PNG or JPG image"
        onChange={handleFileChange}
      />

      {!selectedFile ? (
        <div
          className={`uploader-dropzone ${compact ? "uploader-dropzone-compact" : ""} ${
            isDragging ? "is-dragging" : ""
          }`}
          role="button"
          tabIndex={0}
          onClick={openFilePicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleUploadKeyDown}
        >
          <span className="uploader-icon" aria-hidden="true">
            <svg
              className="h-9 w-9"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M20 16.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5" />
            </svg>
          </span>
          <span className="uploader-title">Drop your image here</span>
          <span className="uploader-help">
            PNG, JPG or JPEG · Maximum 10 MB
          </span>
          <button
            className="primary-button uploader-button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openFilePicker();
            }}
          >
            Generate Free SVG Preview
          </button>
        </div>
      ) : (
        <div className="uploader-selected">
          <div className="uploader-file">
            <div className="uploader-preview">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Uploaded image preview"
                  className="h-full w-full object-contain p-3"
                  src={previewUrl}
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="eyebrow-small">Uploaded</p>
              <p className="truncate text-lg font-semibold text-[#111827]">
                {selectedFile.name}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                A watermarked SVG preview will be generated before payment.
              </p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={openFilePicker}
            >
              Replace
            </button>
          </div>

          <div className="cut-options" role="group" aria-label="SVG output type">
            {CUT_OPTIONS.map((option) => {
              const isSelected = selectedCut === option.id;

              return (
                <button
                  key={option.id}
                  className={`cut-option ${isSelected ? "is-selected" : ""}`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedCut(option.id)}
                >
                  <span>
                    <span className="block text-base font-semibold text-[#111827]">
                      {option.id === "single"
                        ? "Single-Color SVG"
                        : "Layered SVG"}
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-[#667085]">
                      {option.description}
                    </span>
                  </span>
                  <span className="price-chip">{option.price}</span>
                </button>
              );
            })}
          </div>

          <button
            className="primary-button h-14 w-full disabled:cursor-not-allowed disabled:bg-[#86A58F]"
            type="button"
            disabled={isSubmitting}
            onClick={handleStartProcessing}
          >
            {isSubmitting ? "Creating your preview..." : "Generate Free SVG Preview"}
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-4 rounded-[8px] border border-[#f2b8a8] bg-[#fff4f0] px-4 py-3 text-sm font-medium text-[#8a3426]">
          {error}
        </p>
      ) : null}

      <p className="uploader-assurance">
        No account required · No subscription · Secure PayPal checkout
      </p>
    </section>
  );
}
