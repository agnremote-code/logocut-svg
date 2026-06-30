"use client";

import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import QualityCheckCard from "@/components/quality-check-card";
import { saveClientJob } from "@/lib/client-job-store";
import {
  ImageQualityInspection,
  inspectImageQuality,
} from "@/lib/image-quality";
import {
  ACCEPTED_FILE_TYPES,
  CUT_OPTIONS,
  CutType,
  JobSummary,
  MAX_FILE_SIZE,
} from "@/lib/job-types";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedCut, setSelectedCut] = useState<CutType>("single");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qualityInspection, setQualityInspection] =
    useState<ImageQualityInspection>();
  const [isQualityChecking, setIsQualityChecking] = useState(false);
  const [qualityError, setQualityError] = useState("");

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const runQualityInspection = async (file: File) => {
    setIsQualityChecking(true);
    setQualityError("");
    setQualityInspection(undefined);

    try {
      const inspection = await inspectImageQuality(file);
      setQualityInspection(inspection);
      setSelectedCut(inspection.recommendedCutType);
      return inspection;
    } catch {
      setQualityError("Could not complete the image quality check.");
      return null;
    } finally {
      setIsQualityChecking(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (
      !ACCEPTED_FILE_TYPES.includes(
        file.type as (typeof ACCEPTED_FILE_TYPES)[number],
      )
    ) {
      setError("Please upload a PNG or JPG logo.");
      setQualityInspection(undefined);
      setQualityError("");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Please upload an image under 10 MB.");
      setQualityInspection(undefined);
      setQualityError("");
      return;
    }

    setError("");
    setSelectedFile(file);
    setSelectedCut("single");
    void runQualityInspection(file);
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

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleUploadKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  };

  const handleReplace = () => {
    openFilePicker();
  };

  const handleStartProcessing = async () => {
    if (!selectedFile) {
      setError("Please upload a PNG or JPG logo.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      if (!qualityInspection && !isQualityChecking) {
        await runQualityInspection(selectedFile);
      }

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
      });

      const checkoutResponse = await fetch(
        `/api/jobs/${payload.job.id}/checkout`,
        { method: "POST" },
      );
      const checkoutPayload = (await checkoutResponse.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!checkoutResponse.ok || !checkoutPayload.checkoutUrl) {
        throw new Error(
          checkoutPayload.error ?? "Could not open Stripe Checkout.",
        );
      }

      window.location.href = checkoutPayload.checkoutUrl;
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Could not start processing.",
      );
      setIsSubmitting(false);
    }
  };

  const selectedPrice =
    CUT_OPTIONS.find((option) => option.id === selectedCut)?.price ?? "$5";

  return (
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-6 text-[#1f2520] sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col items-center justify-center gap-8">
        <div className="max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
            LogoCut SVG
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-[#172017] sm:text-5xl lg:text-6xl">
            Logo to Cricut SVG
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#596158] sm:text-lg">
            Upload a messy logo. Get a clean SVG that opens and cuts properly
            in Cricut Design Space.
          </p>
        </div>

        <div className="w-full max-w-3xl rounded-[8px] border border-[#ddd8cc] bg-white p-4 shadow-[0_18px_60px_rgba(31,37,32,0.10)] sm:p-6">
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            onChange={handleFileChange}
          />

          {!selectedFile ? (
            <div
              className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-[8px] border-2 border-dashed px-5 py-12 text-center transition ${
                isDragging
                  ? "border-[#315f46] bg-[#eef5ef]"
                  : "border-[#cfc8bb] bg-[#fbfaf7] hover:border-[#315f46] hover:bg-[#f3f7f1]"
              }`}
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onKeyDown={handleUploadKeyDown}
            >
              <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-[8px] bg-[#315f46] text-white">
                <svg
                  aria-hidden="true"
                  className="h-7 w-7"
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
              <span className="text-xl font-semibold text-[#172017]">
                Drop your logo here to start
              </span>
              <span className="mt-3 text-sm leading-6 text-[#6b716b]">
                Accepted formats: PNG, JPG under 10 MB
              </span>
              <button
                className="mt-6 h-11 rounded-[8px] bg-[#315f46] px-5 text-sm font-semibold text-white transition hover:bg-[#264d39] focus:outline-none focus:ring-4 focus:ring-[#b8d3bf]"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openFilePicker();
                }}
              >
                Choose file
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 rounded-[8px] border border-[#e6e1d7] bg-[#fbfaf7] p-4 sm:grid-cols-[150px_1fr_auto] sm:items-center">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[8px] border border-[#e0dbd1] bg-white">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="Uploaded logo preview"
                      className="h-full w-full object-contain p-3"
                      src={previewUrl}
                    />
                  ) : null}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#657167]">
                    Uploaded logo
                  </p>
                  <p className="mt-2 truncate text-lg font-semibold text-[#172017]">
                    {selectedFile.name}
                  </p>
                </div>

                <button
                  className="h-11 rounded-[8px] border border-[#cfc8bb] px-4 text-sm font-semibold text-[#27342b] transition hover:border-[#315f46] hover:bg-white"
                  type="button"
                  onClick={handleReplace}
                >
                  Replace
                </button>
              </div>

              <QualityCheckCard
                error={qualityError}
                inspection={qualityInspection}
                isLoading={isQualityChecking}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {CUT_OPTIONS.map((option) => {
                  const isSelected = selectedCut === option.id;

                  return (
                    <button
                      key={option.id}
                      className={`rounded-[8px] border p-4 text-left transition ${
                        isSelected
                          ? "border-[#315f46] bg-[#eef5ef] shadow-[inset_0_0_0_1px_#315f46]"
                          : qualityInspection?.recommendedCutType === option.id
                            ? "border-[#b8d3bf] bg-[#f7fbf7]"
                            : "border-[#e0dbd1] bg-white hover:border-[#b9c6b6]"
                      }`}
                      type="button"
                      onClick={() => {
                        setSelectedCut(option.id);
                      }}
                    >
                      <span className="flex items-start justify-between gap-4">
                        <span>
                          <span className="block text-base font-semibold text-[#172017]">
                            {option.name}
                          </span>
                          {qualityInspection?.recommendedCutType === option.id ? (
                            <span className="mt-2 inline-flex rounded-[8px] bg-[#315f46] px-2 py-1 text-xs font-semibold text-white">
                              Recommended
                            </span>
                          ) : null}
                          <span className="mt-2 block text-sm leading-6 text-[#626a61]">
                            {option.description}
                          </span>
                        </span>
                        <span className="rounded-[8px] bg-[#172017] px-3 py-1 text-sm font-semibold text-white">
                          {option.price}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                className="flex h-14 w-full items-center justify-center rounded-[8px] bg-[#315f46] px-6 text-base font-semibold text-white shadow-[0_10px_24px_rgba(49,95,70,0.22)] transition hover:bg-[#264d39] focus:outline-none focus:ring-4 focus:ring-[#b8d3bf] disabled:cursor-not-allowed disabled:bg-[#8aa192] disabled:shadow-none"
                type="button"
                disabled={isSubmitting}
                onClick={handleStartProcessing}
              >
                {isSubmitting
                  ? "Starting Cricut workflow..."
                  : `Get Cricut SVG - ${selectedPrice}`}
              </button>
            </div>
          )}

          {error ? (
            <p className="mt-4 rounded-[8px] border border-[#e4b5a8] bg-[#fff4f0] px-4 py-3 text-sm font-medium text-[#8a3426]">
              {error}
            </p>
          ) : null}

        </div>
      </section>
    </main>
  );
}
