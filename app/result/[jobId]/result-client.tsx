"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getClientJob, updateClientJobStatus } from "@/lib/client-job-store";
import { trackEvent, trackPurchaseOnce } from "@/lib/analytics";
import {
  ClientJobRecord,
  CUT_OPTIONS,
  CutType,
  JobSummary,
  ONE_TIME_PRODUCT_OPTIONS,
  OneTimeProductType,
  PaymentStatus,
  getDefaultProductTypeForOutput,
} from "@/lib/job-types";
import { ResultViewer } from "@/components/result-viewer";
import { resolvePreviewAsset } from "@/lib/preview-asset";
import {
  MarketingSignupCard,
  hasJoinedMarketingList,
} from "@/components/marketing-signup-card";

type ResultClientProps = {
  jobId: string;
};

type PayPalButtons = {
  render: (container: HTMLElement) => Promise<void>;
};

type PayPalButtonsOptions = {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID?: string }) => Promise<void>;
  onCancel: () => void;
  onError: () => void;
  style: {
    color: "gold";
    label: "paypal";
    layout: "vertical";
    shape: "rect";
  };
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: PayPalButtonsOptions) => PayPalButtons;
    };
  }
}

export default function ResultClient({ jobId }: ResultClientProps) {
  const router = useRouter();
  const paypalButtonContainerRef = useRef<HTMLDivElement | null>(null);
  const resultViewTrackedRef = useRef(false);
  const [job, setJob] = useState<ClientJobRecord | null>(null);
  const [serverJob, setServerJob] = useState<JobSummary | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resultError, setResultError] = useState("");
  const [isSvgReady, setIsSvgReady] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [previewAssetUrl, setPreviewAssetUrl] = useState<string | null>(null);
  const [previewAssetReady, setPreviewAssetReady] = useState(false);
  const [previewAssetError, setPreviewAssetError] = useState(false);
  const [previewAssetRetry, setPreviewAssetRetry] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [isPayPalScriptReady, setIsPayPalScriptReady] = useState(false);
  const [creditsCalculated, setCreditsCalculated] = useState<string | null>(
    null,
  );
  const [creditsCharged, setCreditsCharged] = useState<string | null>(null);
  const [purchaseDetails, setPurchaseDetails] = useState<{
    transactionId: string;
    value: number;
    currency: string;
  } | null>(null);
  const [marketingJoined, setMarketingJoined] = useState(false);
  const [productType, setProductType] =
    useState<OneTimeProductType>("single_svg");
  const [finalOutputs, setFinalOutputs] = useState<{
    single?: { ready?: boolean; status?: string; error?: string | null };
    multi?: { ready?: boolean; status?: string; error?: string | null };
  } | null>(null);
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const activeCutType: CutType = serverJob?.cutType ?? job?.cutType ?? "single";
  const activeProduct = ONE_TIME_PRODUCT_OPTIONS.find(
    (option) => option.id === productType,
  );
  const paypalSdkUrl = paypalClientId
    ? `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
        paypalClientId,
      )}&currency=USD&intent=capture&components=buttons`
    : "";

  const selectedCut = useMemo(
    () =>
      CUT_OPTIONS.find(
        (option) => option.id === activeCutType,
      ),
    [activeCutType],
  );

  useEffect(() => {
    let isMounted = true;

    getClientJob(jobId)
      .catch(() => null)
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
          purchase?: {
            transactionId?: string;
            value?: number;
            currency?: string;
          } | null;
          productType?: OneTimeProductType;
          finalOutputs?: {
            single?: { ready?: boolean; status?: string; error?: string | null };
            multi?: { ready?: boolean; status?: string; error?: string | null };
          };
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
        setProductType(
          payload.productType ??
            payload.job?.productType ??
            getDefaultProductTypeForOutput(
              payload.job?.cutType ?? storedJob?.cutType ?? "single",
            ),
        );
        setFinalOutputs(payload.finalOutputs ?? null);
        setResultError(
          payload.finalError ??
            payload.previewError ??
            payload.vectorizerError ??
            "",
        );
        setCreditsCalculated(payload.creditsCalculated ?? null);
        setCreditsCharged(payload.creditsCharged ?? null);
        setPurchaseDetails(
          payload.purchase?.transactionId &&
            typeof payload.purchase.value === "number"
            ? {
                transactionId: payload.purchase.transactionId,
                value: payload.purchase.value,
                currency: payload.purchase.currency ?? "USD",
              }
            : null,
        );

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
    if (!isLoading && (job || serverJob) && !resultViewTrackedRef.current) {
      resultViewTrackedRef.current = true;
      trackEvent("result_page_view", {
        cut_type: activeCutType,
        source_page: "result_page",
      });
    }
  }, [activeCutType, isLoading, job, serverJob]);

  useEffect(() => {
    if (
      paymentStatus !== "paid" ||
      !purchaseDetails ||
      purchaseDetails.currency !== "USD"
    ) {
      return;
    }

    trackPurchaseOnce({
      transactionId: purchaseDetails.transactionId,
      value: purchaseDetails.value,
      cutType: activeCutType,
    });
  }, [activeCutType, paymentStatus, purchaseDetails]);

  useEffect(() => {
    if (!job?.imageBlob) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(job.imageBlob);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [job?.imageBlob]);

  useEffect(() => {
    if (!isPreviewReady || isSvgReady) {
      setPreviewAssetUrl(null);
      setPreviewAssetReady(false);
      setPreviewAssetError(false);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    setPreviewAssetReady(false);
    setPreviewAssetError(false);

    resolvePreviewAsset(`/api/jobs/${jobId}/preview`)
      .then((resolvedUrl) => {
        objectUrl = resolvedUrl;
        if (active) setPreviewAssetUrl(resolvedUrl);
        else URL.revokeObjectURL(resolvedUrl);
      })
      .catch(() => {
        if (active) setPreviewAssetError(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isPreviewReady, isSvgReady, jobId, previewAssetRetry]);

  useEffect(() => {
    if (window.paypal) {
      setIsPayPalScriptReady(true);
    }

    setMarketingJoined(hasJoinedMarketingList());
  }, []);

  useEffect(() => {
    if (
      !isPayPalScriptReady ||
      !window.paypal ||
      !paypalButtonContainerRef.current ||
      !previewAssetReady ||
      isSvgReady ||
      paymentStatus === "paid"
    ) {
      return;
    }

    const container = paypalButtonContainerRef.current;
    let isMounted = true;
    container.innerHTML = "";

    const buttons = window.paypal.Buttons({
      style: {
        color: "gold",
        label: "paypal",
        layout: "vertical",
        shape: "rect",
      },
      createOrder: async () => {
        setIsStartingCheckout(true);
        setResultError("");

        const response = await fetch("/api/paypal/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId, cutType: activeCutType, productType }),
        });
        const payload = (await response.json()) as {
          orderId?: string;
          error?: string;
        };

        if (!response.ok || !payload.orderId) {
          const message = payload.error ?? "PayPal order creation failed";
          setResultError(message);
          setIsStartingCheckout(false);
          throw new Error(message);
        }

        trackEvent("paypal_order_created", {
          cut_type: activeCutType,
          product_type: productType,
          source_page: "result_page",
          value:
            productType === "complete_pack"
              ? 12
              : productType === "layered_svg"
                ? 9
                : 5,
          currency: "USD",
        });

        return payload.orderId;
      },
      onApprove: async (data) => {
        const orderId = data.orderID;

        if (!orderId) {
          setIsStartingCheckout(false);
          setResultError("PayPal capture failed");
          return;
        }

        setResultError("");
        setIsStartingCheckout(true);

        const response = await fetch(`/api/paypal/orders/${orderId}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ jobId }),
        });
        const payload = (await response.json()) as {
          resultUrl?: string;
          processingUrl?: string;
          error?: string;
        };

        if (!response.ok) {
          const message = payload.error ?? "PayPal capture failed";
          setResultError(message);
          setIsStartingCheckout(false);
          throw new Error(message);
        }

        window.location.href =
          payload.resultUrl ?? payload.processingUrl ?? `/result/${jobId}`;
      },
      onCancel: () => {
        setIsStartingCheckout(false);
      },
      onError: () => {
        if (!isMounted) {
          return;
        }

        setIsStartingCheckout(false);
        setResultError("PayPal capture failed");
      },
    });

    buttons.render(container).catch(() => {
      if (!isMounted) {
        return;
      }

      setResultError("PayPal is not configured");
    });

    return () => {
      isMounted = false;
      container.innerHTML = "";
    };
  }, [
    activeCutType,
    isPayPalScriptReady,
    previewAssetReady,
    isSvgReady,
    jobId,
    paymentStatus,
    productType,
  ]);

  const isCompletePack = productType === "complete_pack";
  const singleDownloadReady = Boolean(finalOutputs?.single?.ready);
  const layeredDownloadReady = Boolean(finalOutputs?.multi?.ready);
  const hasAnyCompleteOutput =
    isCompletePack && (singleDownloadReady || layeredDownloadReady);
  const svgResultUrl = isCompletePack
    ? `/api/jobs/${jobId}/result?output=${singleDownloadReady ? "single" : "multi"}`
    : `/api/jobs/${jobId}/result`;
  const svgDownloadUrl = `/api/jobs/${jobId}/download`;
  const svgPreviewUrl = `/api/jobs/${jobId}/preview`;
  const displayPreviewUrl =
    isSvgReady || hasAnyCompleteOutput ? svgResultUrl : previewAssetUrl;
  const originalImageUrl = serverJob ? `/api/jobs/${jobId}/original` : previewUrl;
  const displayFileName = serverJob?.fileName ?? job?.fileName ?? "Uploaded logo";
  const downloadFileName = `${displayFileName.replace(/\.[^.]+$/, "")}-logocut.svg`;
  const unlockLabel = `Unlock with PayPal - ${activeProduct?.price ?? "$5"}`;
  const finalGenerationFailed =
    paymentStatus === "paid" && !isSvgReady && Boolean(resultError);

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
              This result may have expired or the upload could not be found.
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

        {originalImageUrl && displayPreviewUrl ? (
          <div className="min-h-[620px] rounded-[20px] bg-white p-3 shadow-[0_18px_60px_rgba(31,37,32,0.10)]">
            <ResultViewer
              original={originalImageUrl}
              result={displayPreviewUrl}
              originalLabel="Your original"
              resultLabel={
                isSvgReady || hasAnyCompleteOutput
                  ? "Clean SVG"
                  : "Free SVG Preview"
              }
              resultAlt={
                isSvgReady || hasAnyCompleteOutput
                  ? "Clean SVG"
                  : "Free SVG preview"
              }
              badge={
                isSvgReady
                  ? "Paid result available"
                  : hasAnyCompleteOutput
                    ? "Partial result available"
                    : "Free Watermarked Preview"
              }
              title={displayFileName}
              controlsEnabled={isSvgReady || previewAssetReady}
              onResultLoad={() => {
                if (!isSvgReady) setPreviewAssetReady(true);
              }}
              onResultError={() => {
                if (!isSvgReady) {
                  setPreviewAssetReady(false);
                  setPreviewAssetError(true);
                }
              }}
            />
          </div>
        ) : null}

        <div className={`grid gap-5 lg:grid-cols-[1fr_1fr] ${originalImageUrl && displayPreviewUrl ? "hidden" : ""}`}>
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
              {originalImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="Original uploaded logo"
                  className="h-full w-full object-contain p-5"
                  src={originalImageUrl}
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
                  : previewAssetReady
                    ? "Free SVG Preview"
                    : "Loading SVG preview"}
              </h2>
            </div>

            {isSvgReady || hasAnyCompleteOutput || previewAssetReady ? (
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[8px] border border-[#e0dbd1] bg-[#fbfaf7]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={isSvgReady ? "Clean SVG preview" : "Watermarked SVG preview"}
                  className="h-full w-full object-contain p-5"
                  src={
                    isSvgReady || hasAnyCompleteOutput
                      ? svgResultUrl
                      : (previewAssetUrl ?? svgPreviewUrl)
                  }
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
                  {previewAssetError ? "Preview could not be displayed" : "Loading SVG preview"}
                </p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#626a61]">
                  {previewAssetError
                    ? "The SVG was generated, but the preview file could not be loaded. Please try again."
                    : resultError || "Preparing your watermarked SVG preview."}
                </p>
                {previewAssetError ? (
                  <button
                    className="secondary-button mt-4"
                    type="button"
                    onClick={() => setPreviewAssetRetry((value) => value + 1)}
                  >
                    Retry Preview
                  </button>
                ) : null}
              </div>
            )}

            {isSvgReady || hasAnyCompleteOutput ? (
              isCompletePack ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <a
                    className={`flex h-14 items-center justify-center rounded-[8px] px-5 text-center text-sm font-semibold shadow-[0_10px_24px_rgba(49,95,70,0.18)] transition ${
                      singleDownloadReady
                        ? "bg-[#315f46] text-white hover:bg-[#264d39]"
                        : "pointer-events-none bg-[#d8ded8] text-[#6b746d]"
                    }`}
                    download={`${displayFileName.replace(/\.[^.]+$/, "")}-single-color-logocut.svg`}
                    href={`${svgDownloadUrl}?output=single`}
                    onClick={() =>
                      trackEvent("svg_downloaded", {
                        cut_type: "single",
                        product_type: productType,
                        source_page: "result_page",
                      })
                    }
                  >
                    Download Single-Color SVG
                  </a>
                  <a
                    className={`flex h-14 items-center justify-center rounded-[8px] px-5 text-center text-sm font-semibold shadow-[0_10px_24px_rgba(49,95,70,0.18)] transition ${
                      layeredDownloadReady
                        ? "bg-[#315f46] text-white hover:bg-[#264d39]"
                        : "pointer-events-none bg-[#d8ded8] text-[#6b746d]"
                    }`}
                    download={`${displayFileName.replace(/\.[^.]+$/, "")}-layered-logocut.svg`}
                    href={`${svgDownloadUrl}?output=multi`}
                    onClick={() =>
                      trackEvent("svg_downloaded", {
                        cut_type: "multi",
                        product_type: productType,
                        source_page: "result_page",
                      })
                    }
                  >
                    Download Layered SVG
                  </a>
                </div>
              ) : (
                <a
                  className="mt-5 flex h-14 w-full items-center justify-center rounded-[8px] bg-[#315f46] px-6 text-base font-semibold text-white shadow-[0_10px_24px_rgba(49,95,70,0.22)] transition hover:bg-[#264d39]"
                  download={downloadFileName}
                  href={svgDownloadUrl}
                  onClick={() =>
                    trackEvent("svg_downloaded", {
                      cut_type: activeCutType,
                      product_type: productType,
                      source_page: "result_page",
                    })
                  }
                >
                  Download SVG
                </a>
              )
            ) : previewAssetReady && paymentStatus !== "paid" ? (
              <div className="mt-5">
                <div className="rounded-[8px] border border-[#d8c36b] bg-[#fff9dc] px-4 py-3">
                  <p className="text-sm font-semibold text-[#5c4710]">
                    {unlockLabel}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#6a5414]">
                    Pay securely with PayPal. After payment, your clean SVG will
                    be generated and ready to download.
                  </p>
                </div>

                <MarketingSignupCard
                  source="preview_inline"
                  compact
                  onJoined={() => setMarketingJoined(true)}
                />

                {paypalClientId ? (
                  <>
                    <Script
                      src={paypalSdkUrl}
                      strategy="afterInteractive"
                      onLoad={() => setIsPayPalScriptReady(true)}
                      onError={() => setResultError("PayPal is not configured")}
                    />
                    <div
                      ref={paypalButtonContainerRef}
                      className="mt-4 min-h-[56px]"
                    />
                    {isStartingCheckout ? (
                      <p className="mt-3 text-center text-sm font-medium text-[#315f46]">
                        Confirming payment and creating your clean SVG...
                      </p>
                    ) : null}
                  </>
                ) : (
                  <button
                    className="mt-4 flex h-14 w-full cursor-not-allowed items-center justify-center rounded-[8px] bg-[#8aa192] px-6 text-base font-semibold text-white"
                    type="button"
                    disabled
                  >
                    PayPal is not configured
                  </button>
                )}
              </div>
            ) : null}

            {(isSvgReady || hasAnyCompleteOutput) && !marketingJoined ? (
              <MarketingSignupCard
                source="post_purchase_result"
                compact
                onJoined={() => setMarketingJoined(true)}
              />
            ) : null}

            {isSvgReady ? (
              <p className="mt-4 rounded-[8px] border border-[#c9dfcf] bg-[#f1f8f2] px-4 py-3 text-sm font-semibold text-[#315f46]">
                {isCompletePack
                  ? "Complete SVG Pack ready. Both downloads are enabled."
                  : "Clean SVG ready. Download is enabled."}
                {creditsCalculated
                  ? ` Credits calculated: ${creditsCalculated}.`
                  : ""}
                {creditsCharged ? ` Credits charged: ${creditsCharged}.` : ""}
              </p>
            ) : hasAnyCompleteOutput ? (
              <p className="mt-4 rounded-[8px] border border-[#d8c36b] bg-[#fff9dc] px-4 py-3 text-sm font-semibold text-[#6a5414]">
                One file is ready. The missing file can be retried safely
                without another payment.
              </p>
            ) : finalGenerationFailed ? (
              <p className="mt-4 rounded-[8px] border border-[#e4b5a8] bg-[#fff4f0] px-4 py-3 text-sm font-medium text-[#8a3426]">
                We could not create the final SVG. Contact support for a
                refund or manual help.
              </p>
            ) : previewAssetReady ? (
              <p className="mt-4 rounded-[8px] border border-[#d8c36b] bg-[#fff9dc] px-4 py-3 text-sm font-semibold text-[#6a5414]">
                Preview ready. If this looks good, unlock the clean SVG.
                TEST MODE preview may contain a Vectorizer.AI watermark.
                {creditsCalculated
                  ? ` Credits calculated: ${creditsCalculated}.`
                  : ""}
                {creditsCharged ? ` Credits charged: ${creditsCharged}.` : ""}
              </p>
            ) : previewAssetError ? (
              <p className="mt-4 rounded-[8px] border border-[#e4b5a8] bg-[#fff4f0] px-4 py-3 text-sm font-medium text-[#8a3426]">
                Preview could not be displayed. Retry the preview before continuing.
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
