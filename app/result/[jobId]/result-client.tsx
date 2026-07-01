"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getClientJob, updateClientJobStatus } from "@/lib/client-job-store";
import {
  ClientJobRecord,
  CUT_OPTIONS,
  JobSummary,
  PaymentStatus,
} from "@/lib/job-types";

type ResultClientProps = {
  jobId: string;
};

export default function ResultClient({ jobId }: ResultClientProps) {
  const router = useRouter();
  const [job, setJob] = useState<ClientJobRecord | null>(null);
  const [serverJob, setServerJob] = useState<JobSummary | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resultError, setResultError] = useState("");
  const [isSvgReady, setIsSvgReady] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [creditsCalculated, setCreditsCalculated] = useState<string | null>(
    null,
  );
  const [creditsCharged, setCreditsCharged] = useState<string | null>(null);

  const selectedCut = useMemo(
    () => CUT_OPTIONS.find((option) => option.id === (job?.cutType ?? serverJob?.cutType)),
    [job?.cutType, serverJob?.cutType],
  );

  useEffect(() => {
    let isMounted = true;

    getClientJob(jobId)
      .then(async (storedJob) => {
        if (!isMounted) {
          return;
        }

        setJob(storedJob);

        const response = await fetch(`/api/jobs/${jobId}`);
        const payload = (await response.json()) as {
          job?: JobSummary;
          previewReady?: boolean;
          svgReady?: boolean;
          paymentStatus?: PaymentStatus;
          previewError?: string | null;
          finalError?: string | null;
          vectorizerError?: string | null;
          creditsCalculated?: string | null;
          creditsCharged?: string | null;
          error?: string;
        };

        if (!response.ok) {
          setResultError(payload.error ?? "Could not load the job result.");
          return;
        }

        setServerJob(payload.job ?? null);
        setIsPreviewReady(Boolean(payload.previewReady));
        setIsSvgReady(Boolean(payload.svgReady));
        setPaymentStatus(payload.paymentStatus ?? "unpaid");
        setResultError(
          payload.finalError ??
            payload.previewError ??
            payload.vectorizerError ??
            "",
        );
        setCreditsCalculated(payload.creditsCalculated ?? null);
        setCreditsCharged(payload.creditsCharged ?? null);

        if (storedJob && payload.job?.status === "ready") {
          updateClientJobStatus(jobId, "ready");
        } else if (storedJob && payload.job?.status === "failed") {
          updateClientJobStatus(jobId, "failed");
        }
      })
      .catch(() => {
        if (isMounted) {
          setResultError("Could not load the job result.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  useEffect(() => {
    if (!job?.imageBlob) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(job.imageBlob);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [job?.imageBlob]);

  const svgResultUrl = `/api/jobs/${jobId}/result`;
  const svgPreviewUrl = `/api/jobs/${jobId}/preview`;
  const displayFileName = serverJob?.fileName ?? job?.fileName ?? "Uploaded logo";
  const downloadFileName = `${displayFileName.replace(/\.[^.]+$/, "")}-logocut.svg`;
  const unlockLabel =
    (serverJob?.cutType ?? job?.cutType) === "multi"
      ? "Unlock layered SVG - $9"
      : "Unlock clean SVG - $5";
  const finalGenerationFailed =
    paymentStatus === "paid" && !isSvgReady && Boolean(resultError);

  const handleUnlock = async () => {
    setIsStartingCheckout(true);
    setResultError("");

    try {
      const checkoutResponse = await fetch(`/api/jobs/${jobId}/checkout`, {
        method: "POST",
      });
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
    } catch (error) {
      setResultError(
        error instanceof Error ? error.message : "Could not open Stripe Checkout.",
      );
      setIsStartingCheckout(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f5f0] px-4 py-6 text-[#1f2520] sm:px-6 lg:px-8">
        <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
            Loading result...
          </p>
        </section>
      </main>
    );
  }

  if (!job && !serverJob) {
    return (
      <main className="min-h-screen bg-[#f7f5f0] px-4 py-6 text-[#1f2520] sm:px-6 lg:px-8">
        <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col items-center justify-center text-center">
          <div className="rounded-[8px] border border-[#ddd8cc] bg-white p-6 shadow-[0_18px_60px_rgba(31,37,32,0.10)] sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
              Result unavailable
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[#172017]">
              We could not find this upload
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#626a61]">
              The current MVP stores previews in this browser while the real
              storage layer is still offline.
            </p>
            <button
              className="mt-6 h-11 rounded-[8px] bg-[#315f46] px-5 text-sm font-semibold text-white transition hover:bg-[#264d39]"
              type="button"
              onClick={() => router.push("/")}
            >
              Upload logo
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-6 text-[#1f2520] sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col justify-center gap-8">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
            LogoCut SVG
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-[#172017] sm:text-5xl">
            Your Cricut SVG workspace
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#596158]">
            Preview your watermarked SVG first. If it looks good, unlock the
            clean Cricut-ready file.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-[8px] border border-[#ddd8cc] bg-white p-5 shadow-[0_18px_60px_rgba(31,37,32,0.10)] sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#657167]">
                  Original image
                </p>
                <h2 className="mt-2 truncate text-xl font-semibold text-[#172017]">
                  {displayFileName}
                </h2>
              </div>
              <span className="rounded-[8px] bg-[#f0ece3] px-3 py-1 text-sm font-semibold text-[#596158]">
                {selectedCut?.price ?? "$5"}
              </span>
            </div>

            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[8px] border border-[#e0dbd1] bg-[#fbfaf7]">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Original uploaded logo"
                  className="h-full w-full object-contain p-5"
                  src={previewUrl}
                />
              ) : (
                <p className="text-sm font-medium text-[#626a61]">
                  Original preview unavailable
                </p>
              )}
            </div>

            <p className="mt-4 text-sm leading-6 text-[#626a61]">
              {selectedCut?.name ?? "Single-color cut"} selected for this job.
            </p>
          </section>

          <section className="rounded-[8px] border border-[#ddd8cc] bg-white p-5 shadow-[0_18px_60px_rgba(31,37,32,0.10)] sm:p-6">
            <div className="mb-4">
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#657167]">
                  SVG preview
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#172017]">
                {isSvgReady
                  ? "Clean SVG ready"
                  : isPreviewReady
                    ? "Watermarked preview"
                    : "Preview unavailable"}
              </h2>
            </div>

            {isSvgReady || isPreviewReady ? (
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[8px] border border-[#e0dbd1] bg-[#fbfaf7]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={isSvgReady ? "Clean SVG preview" : "Watermarked SVG preview"}
                  className="h-full w-full object-contain p-5"
                  src={isSvgReady ? svgResultUrl : svgPreviewUrl}
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-[8px] border border-dashed border-[#cfc8bb] bg-[#fbfaf7] px-5 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[8px] bg-[#eef5ef] text-[#315f46]">
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
                    <path d="M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2h7L20 8.5v11A2.5 2.5 0 0 1 17.5 22h-11A2.5 2.5 0 0 1 4 19.5Z" />
                    <path d="M13 2v5a2 2 0 0 0 2 2h5" />
                    <path d="M8 15c1.5-3 3.5-3 5 0s3.5 3 5 0" />
                  </svg>
                </div>
                <p className="mt-5 text-base font-semibold text-[#172017]">
                  SVG is not ready
                </p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#626a61]">
                  {resultError ||
                    "We couldn't create a preview from this image. Try a clearer logo."}
                </p>
              </div>
            )}

            {isSvgReady ? (
              <a
                className="mt-5 flex h-14 w-full items-center justify-center rounded-[8px] bg-[#315f46] px-6 text-base font-semibold text-white shadow-[0_10px_24px_rgba(49,95,70,0.22)] transition hover:bg-[#264d39]"
                download={downloadFileName}
                href={svgResultUrl}
              >
                Download SVG
              </a>
            ) : isPreviewReady && paymentStatus !== "paid" ? (
              <button
                className="mt-5 flex h-14 w-full items-center justify-center rounded-[8px] bg-[#315f46] px-6 text-base font-semibold text-white shadow-[0_10px_24px_rgba(49,95,70,0.22)] transition hover:bg-[#264d39] focus:outline-none focus:ring-4 focus:ring-[#b8d3bf] disabled:cursor-not-allowed disabled:bg-[#8aa192] disabled:shadow-none"
                type="button"
                disabled={isStartingCheckout}
                onClick={handleUnlock}
              >
                {isStartingCheckout ? "Opening checkout..." : unlockLabel}
              </button>
            ) : (
              <button
                className="mt-5 flex h-14 w-full cursor-not-allowed items-center justify-center rounded-[8px] bg-[#8aa192] px-6 text-base font-semibold text-white"
                type="button"
                disabled
              >
                Download SVG
              </button>
            )}

            {isSvgReady ? (
              <p className="mt-4 rounded-[8px] border border-[#c9dfcf] bg-[#f1f8f2] px-4 py-3 text-sm font-semibold text-[#315f46]">
                Clean SVG ready. Download is enabled.
                {creditsCalculated
                  ? ` Credits calculated: ${creditsCalculated}.`
                  : ""}
                {creditsCharged ? ` Credits charged: ${creditsCharged}.` : ""}
              </p>
            ) : finalGenerationFailed ? (
              <p className="mt-4 rounded-[8px] border border-[#e4b5a8] bg-[#fff4f0] px-4 py-3 text-sm font-medium text-[#8a3426]">
                We could not create the final SVG. Contact support for a
                refund or manual help.
              </p>
            ) : isPreviewReady ? (
              <p className="mt-4 rounded-[8px] border border-[#d8c36b] bg-[#fff9dc] px-4 py-3 text-sm font-semibold text-[#6a5414]">
                Preview ready. If this looks good, unlock the clean SVG.
                TEST MODE preview may contain a Vectorizer.AI watermark.
                {creditsCalculated
                  ? ` Credits calculated: ${creditsCalculated}.`
                  : ""}
                {creditsCharged ? ` Credits charged: ${creditsCharged}.` : ""}
              </p>
            ) : (
              <p className="mt-4 rounded-[8px] border border-[#e4b5a8] bg-[#fff4f0] px-4 py-3 text-sm font-medium text-[#8a3426]">
                {resultError ||
                  "We couldn't create a preview from this image. Try a clearer logo."}
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
