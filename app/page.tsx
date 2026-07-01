"use client";

import Link from "next/link";
import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { saveClientJob } from "@/lib/client-job-store";
import {
  ACCEPTED_FILE_TYPES,
  CUT_OPTIONS,
  CutType,
  JobSummary,
  MAX_FILE_SIZE,
} from "@/lib/job-types";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LogoCut SVG",
  description:
    "Logo to Cricut SVG converter with free watermarked preview before payment.",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  url: "https://www.logocutsvg.com",
};

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedCut, setSelectedCut] = useState<CutType>("single");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const validateAndSetFile = (file: File) => {
    if (
      !ACCEPTED_FILE_TYPES.includes(
        file.type as (typeof ACCEPTED_FILE_TYPES)[number],
      )
    ) {
      setError("Please upload a PNG or JPG logo.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Please upload an image under 10 MB.");
      return;
    }

    setError("");
    setSelectedFile(file);
    setSelectedCut("single");
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
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-6 text-[#1f2520] sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col items-center justify-center gap-8">
        <div className="max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
            LogoCut SVG
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-[#172017] sm:text-5xl lg:text-6xl">
            Logo to Cricut SVG
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#596158] sm:text-lg">
            Upload a PNG or JPG logo. Preview before paying, and unlock a
            clean Cricut-ready SVG only if it looks good.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#6b716b]">
            A simple PNG to SVG and JPG to SVG workflow made for Cricut Design
            Space.
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

              <section className="rounded-[8px] border border-[#b8d8bf] bg-[#f1f8f2] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#657167]">
                      Ready
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[#315f46]">
                      Ready to create your Cricut SVG
                    </h3>
                    <p className="mt-1 text-sm font-medium leading-6 text-[#27342b]">
                      Your logo is ready to process. Clear logos work best, and
                      tiny details may simplify in the final SVG.
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-[8px] bg-white px-3 py-1 text-sm font-semibold text-[#315f46]">
                    Ready
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#626a61]">
                  You can continue with this logo or upload a clearer version if
                  you have one.
                </p>
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                {CUT_OPTIONS.map((option) => {
                  const isSelected = selectedCut === option.id;

                  return (
                    <button
                      key={option.id}
                      className={`rounded-[8px] border p-4 text-left transition ${
                        isSelected
                          ? "border-[#315f46] bg-[#eef5ef] shadow-[inset_0_0_0_1px_#315f46]"
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
                          {option.id === "single" ? (
                            <span className="mt-2 inline-flex rounded-[8px] bg-[#315f46] px-2 py-1 text-xs font-semibold text-white">
                              Default
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
                  ? "Creating SVG preview..."
                  : "Create free SVG preview"}
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
      <footer className="mx-auto flex w-full max-w-5xl flex-col gap-3 border-t border-[#e0dbd1] py-6 text-sm text-[#626a61] sm:flex-row sm:items-center sm:justify-between">
        <p>
          LogoCut SVG is an independent tool and is not affiliated with Cricut.
        </p>
        <nav className="flex gap-4" aria-label="Footer links">
          <Link className="font-medium text-[#315f46] hover:text-[#264d39]" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="font-medium text-[#315f46] hover:text-[#264d39]" href="/terms">
            Terms
          </Link>
        </nav>
      </footer>
    </main>
  );
}
