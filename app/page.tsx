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

const proofPoints = ["Free preview", "Pay after preview", "No account"];
const supportedFiles = ["PNG", "JPG", "JPEG", "Logos", "AI art", "Photos"];

const faqItems = [
  {
    question: "Will I see my SVG before paying?",
    answer:
      "Yes. A free watermarked SVG preview is generated first. You only pay if you're happy with the result.",
  },
  {
    question: "Does it work with Cricut?",
    answer:
      "Yes. The downloaded SVG is compatible with Cricut Design Space.",
  },
  {
    question: "Does it work with Silhouette?",
    answer:
      "Yes. The SVG can also be used with Silhouette Studio Business Edition and other cutting software supporting SVG files.",
  },
  {
    question: "Can I upload AI generated artwork?",
    answer:
      "Yes. AI generated artwork, logos, illustrations and photos are supported.",
  },
  {
    question: "Do I need to install software?",
    answer: "No. Everything runs directly in your browser.",
  },
];

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
      setError("Please upload a PNG or JPG image.");
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
      setError("Please upload a PNG or JPG image.");
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
    <main className="min-h-screen bg-[#f8f7f3] text-[#171d19]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link className="text-sm font-semibold text-[#172017]" href="/">
          LogoCut SVG
        </Link>
        <div className="hidden items-center gap-4 text-sm font-medium text-[#626a61] sm:flex">
          <span>Preview free</span>
          <span className="h-1 w-1 rounded-full bg-[#a7ada4]" />
          <span>$5 unlock</span>
        </div>
      </nav>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-16 pt-2 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-20 lg:pt-10">
        <div className="flex flex-col justify-center">
          <p className="mb-4 inline-flex w-fit rounded-[8px] border border-[#dfe2dc] bg-white px-3 py-2 text-sm font-semibold text-[#315f46] shadow-[0_10px_30px_rgba(31,37,32,0.06)]">
            PNG/JPG to Cricut-ready SVG
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-normal text-[#121713] sm:text-5xl lg:text-6xl">
            PNG or JPG to Cricut SVG in seconds.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#566058] sm:text-lg">
            Upload an image, get a free watermarked preview, then unlock the
            clean cut-ready SVG for $5 only if it looks right.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {proofPoints.map((point) => (
              <span
                key={point}
                className="inline-flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-[#28342c] shadow-[0_10px_30px_rgba(31,37,32,0.06)]"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-[#315f46]"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
                {point}
              </span>
            ))}
          </div>

          <button
            className="mt-8 flex h-14 w-full max-w-sm items-center justify-center rounded-[8px] bg-[#172017] px-6 text-base font-semibold text-white shadow-[0_18px_40px_rgba(23,32,23,0.22)] transition hover:bg-[#315f46] focus:outline-none focus:ring-4 focus:ring-[#b8d3bf] sm:hidden"
            type="button"
            onClick={openFilePicker}
          >
            Upload image
          </button>

          <div className="mt-8 hidden max-w-2xl grid-cols-3 overflow-hidden rounded-[8px] border border-[#dfe2dc] bg-white text-center shadow-[0_18px_50px_rgba(31,37,32,0.08)] sm:grid">
            <div className="border-r border-[#e6e8e3] px-3 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b72]">
                Preview
              </p>
              <p className="mt-1 text-lg font-semibold text-[#172017]">Free</p>
            </div>
            <div className="border-r border-[#e6e8e3] px-3 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b72]">
                Unlock
              </p>
              <p className="mt-1 text-lg font-semibold text-[#172017]">$5</p>
            </div>
            <div className="px-3 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737b72]">
                Delivery
              </p>
              <p className="mt-1 text-lg font-semibold text-[#172017]">
                Instant
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[8px] border border-[#d8ddd5] bg-white p-3 shadow-[0_30px_80px_rgba(31,37,32,0.16)] sm:p-4">
          <div className="rounded-[8px] border border-[#eef0eb] bg-[#fbfaf7] p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#657167]">
                  Start here
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#172017]">
                  Generate a free SVG preview
                </h2>
              </div>
              <span className="hidden rounded-[8px] bg-[#eef5ef] px-3 py-2 text-sm font-semibold text-[#315f46] sm:inline-flex">
                No signup
              </span>
            </div>

            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              onChange={handleFileChange}
            />

            {!selectedFile ? (
              <div
                className={`flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-[8px] border-2 border-dashed px-5 py-12 text-center transition ${
                  isDragging
                    ? "border-[#315f46] bg-[#eef5ef]"
                    : "border-[#c9d0c5] bg-white hover:border-[#315f46] hover:bg-[#f4f8f2]"
                }`}
                role="button"
                tabIndex={0}
                onClick={openFilePicker}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onKeyDown={handleUploadKeyDown}
              >
                <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-[8px] bg-[#172017] text-white shadow-[0_14px_28px_rgba(23,32,23,0.20)]">
                  <svg
                    aria-hidden="true"
                    className="h-8 w-8"
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
                <span className="text-2xl font-semibold text-[#172017]">
                  Drop your image here
                </span>
                <span className="mt-3 max-w-sm text-sm leading-6 text-[#626a61]">
                  PNG, JPG or JPEG up to 10 MB. Works best with logos,
                  illustrations and artwork.
                </span>
                <button
                  className="mt-7 h-12 rounded-[8px] bg-[#315f46] px-6 text-sm font-semibold text-white transition hover:bg-[#264d39] focus:outline-none focus:ring-4 focus:ring-[#b8d3bf]"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openFilePicker();
                  }}
                >
                  Choose image
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 rounded-[8px] border border-[#e0dbd1] bg-white p-4 sm:grid-cols-[132px_1fr_auto] sm:items-center">
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[8px] border border-[#e0dbd1] bg-[#fbfaf7]">
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
                    <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#657167]">
                      Uploaded
                    </p>
                    <p className="mt-2 truncate text-lg font-semibold text-[#172017]">
                      {selectedFile.name}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#626a61]">
                      We will create a watermarked preview before payment.
                    </p>
                  </div>

                  <button
                    className="h-11 rounded-[8px] border border-[#cfc8bb] px-4 text-sm font-semibold text-[#27342b] transition hover:border-[#315f46] hover:bg-[#fbfaf7]"
                    type="button"
                    onClick={handleReplace}
                  >
                    Replace
                  </button>
                </div>

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
                            <span className="mt-2 block text-sm leading-6 text-[#626a61]">
                              {option.id === "single"
                                ? "Best for most logos and simple cuts."
                                : option.description}
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
                  className="flex h-14 w-full items-center justify-center rounded-[8px] bg-[#172017] px-6 text-base font-semibold text-white shadow-[0_14px_30px_rgba(23,32,23,0.22)] transition hover:bg-[#315f46] focus:outline-none focus:ring-4 focus:ring-[#b8d3bf] disabled:cursor-not-allowed disabled:bg-[#8aa192] disabled:shadow-none"
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleStartProcessing}
                >
                  {isSubmitting
                    ? "Creating your preview..."
                    : "Generate free preview"}
                </button>
              </div>
            )}

            {error ? (
              <p className="mt-4 rounded-[8px] border border-[#e4b5a8] bg-[#fff4f0] px-4 py-3 text-sm font-medium text-[#8a3426]">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {supportedFiles.map((fileType) => (
                <span
                  key={fileType}
                  className="rounded-[8px] border border-[#e1e4de] bg-white px-3 py-1.5 text-xs font-semibold text-[#626a61]"
                >
                  {fileType}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 border-t border-[#e4e5df] px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#657167]">
            Preview before paying
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight text-[#172017] sm:text-4xl">
            Know what you are buying before checkout.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#596158]">
            The first SVG is watermarked and free. If the preview looks good,
            unlock the clean file with secure PayPal checkout and download it
            instantly.
          </p>
          <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-3">
            <div className="rounded-[8px] bg-white p-4 shadow-[0_12px_36px_rgba(31,37,32,0.07)]">
              <p className="text-2xl font-semibold text-[#172017]">1</p>
              <p className="mt-2 text-sm font-semibold text-[#27342b]">
                Upload PNG/JPG
              </p>
            </div>
            <div className="rounded-[8px] bg-white p-4 shadow-[0_12px_36px_rgba(31,37,32,0.07)]">
              <p className="text-2xl font-semibold text-[#172017]">2</p>
              <p className="mt-2 text-sm font-semibold text-[#27342b]">
                Preview free
              </p>
            </div>
            <div className="rounded-[8px] bg-white p-4 shadow-[0_12px_36px_rgba(31,37,32,0.07)]">
              <p className="text-2xl font-semibold text-[#172017]">3</p>
              <p className="mt-2 text-sm font-semibold text-[#27342b]">
                Unlock for $5
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[8px] border border-[#dfe2dc] bg-white p-4 shadow-[0_24px_70px_rgba(31,37,32,0.12)]">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="rounded-[8px] border border-[#e1e4de] bg-[#fbfaf7] p-4">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[8px] bg-white">
                <div className="h-28 w-28 rounded-full bg-[repeating-linear-gradient(45deg,#1f2520_0,#1f2520_8px,#6c706b_8px,#6c706b_16px)] opacity-80" />
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#737b72]">
                PNG/JPG
              </p>
              <p className="mt-1 text-sm text-[#626a61]">
                Pixels get rough when enlarged.
              </p>
            </div>

            <div className="flex justify-center text-[#315f46]">
              <svg
                aria-hidden="true"
                className="h-8 w-8 rotate-90 sm:rotate-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </div>

            <div className="rounded-[8px] border border-[#d6e5d9] bg-[#eef5ef] p-4">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[8px] bg-white">
                <svg
                  aria-hidden="true"
                  className="h-32 w-32 text-[#172017]"
                  fill="currentColor"
                  viewBox="0 0 120 120"
                >
                  <circle cx="60" cy="60" r="44" />
                  <path d="M38 60 60 35l22 25-22 25Z" fill="#fff" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#315f46]">
                Clean SVG
              </p>
              <p className="mt-1 text-sm text-[#315f46]">
                Scalable paths ready for cutting.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl border-t border-[#e4e5df] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#657167]">
              Questions
            </p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight text-[#172017]">
              The short version: upload first, decide after preview.
            </h2>
          </div>
          <div className="grid gap-3">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="rounded-[8px] border border-[#dfe2dc] bg-white p-5 shadow-[0_10px_30px_rgba(31,37,32,0.05)]"
              >
                <summary className="cursor-pointer text-base font-semibold text-[#172017]">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-[#626a61]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-3 border-t border-[#e4e5df] px-4 py-6 text-sm text-[#626a61] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          LogoCut SVG is an independent tool and is not affiliated with Cricut.
        </p>
        <nav className="flex gap-4" aria-label="Footer links">
          <Link
            className="font-medium text-[#315f46] hover:text-[#264d39]"
            href="/privacy"
          >
            Privacy Policy
          </Link>
          <Link
            className="font-medium text-[#315f46] hover:text-[#264d39]"
            href="/terms"
          >
            Terms
          </Link>
        </nav>
      </footer>
    </main>
  );
}
