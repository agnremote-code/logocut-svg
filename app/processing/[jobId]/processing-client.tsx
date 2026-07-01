"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getClientJob, updateClientJobStatus } from "@/lib/client-job-store";
import {
  ClientJobRecord,
  JobSummary,
  PaymentStatus,
  PROCESSING_STEPS,
} from "@/lib/job-types";

type ProcessingClientProps = {
  jobId: string;
  sessionId: string;
};

type PaymentState = "checking" | "paid" | "required" | "failed";

export default function ProcessingClient({
  jobId,
  sessionId,
}: ProcessingClientProps) {
  const router = useRouter();
  const hasStartedProcessing = useRef(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [job, setJob] = useState<ClientJobRecord | JobSummary | null>(null);
  const [isMissingJob, setIsMissingJob] = useState(false);
  const [vectorizerMessage, setVectorizerMessage] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>("checking");
  const [paymentMessage, setPaymentMessage] = useState(
    "Confirming your payment...",
  );

  const totalDurationMs = useMemo(
    () =>
      PROCESSING_STEPS.reduce((total, step) => total + step.durationMs, 0),
    [],
  );

  const activeStepIndex = Math.min(
    PROCESSING_STEPS.length - 1,
    Math.floor(elapsedMs / 1000),
  );

  const progress = Math.min(100, Math.round((elapsedMs / totalDurationMs) * 100));

  useEffect(() => {
    let isMounted = true;

    getClientJob(jobId)
      .catch(() => null)
      .then(async (storedJob) => {
        if (!isMounted) {
          return;
        }

        if (storedJob) {
          setJob(storedJob);
          return;
        }

        const response = await fetch(`/api/jobs/${jobId}`);
        const payload = (await response.json()) as {
          job?: JobSummary;
          paymentStatus?: PaymentStatus;
          error?: string;
        };

        if (!isMounted) {
          return;
        }

        if (!response.ok || !payload.job) {
          setIsMissingJob(true);
          return;
        }

        setJob(payload.job);
        if (payload.paymentStatus === "paid") {
          setPaymentState("paid");
          setPaymentMessage("Payment confirmed.");
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsMissingJob(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  useEffect(() => {
    if (isMissingJob || !job) {
      return;
    }

    let isMounted = true;

    const confirmPayment = async () => {
      try {
        if (sessionId) {
          const response = await fetch(`/api/jobs/${jobId}/checkout/confirm`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessionId }),
          });
          const payload = (await response.json()) as {
            job?: JobSummary;
            error?: string;
          };

          if (!isMounted) {
            return;
          }

          if (!response.ok || !payload.job) {
            throw new Error(payload.error ?? "Payment could not be confirmed.");
          }

          setPaymentState("paid");
          setPaymentMessage("Payment confirmed.");
          return;
        }

        const response = await fetch(`/api/jobs/${jobId}`);
        const payload = (await response.json()) as {
          paymentStatus?: PaymentStatus;
          error?: string;
        };

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Could not check payment status.");
        }

        if (payload.paymentStatus === "paid") {
          setPaymentState("paid");
          setPaymentMessage("Payment confirmed.");
          return;
        }

        setPaymentState("required");
        setPaymentMessage("Payment is required before processing can begin.");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPaymentState("failed");
        setPaymentMessage(
          error instanceof Error
            ? error.message
            : "Payment could not be confirmed.",
        );
      }
    };

    void confirmPayment();

    return () => {
      isMounted = false;
    };
  }, [isMissingJob, job, jobId, sessionId]);

  useEffect(() => {
    if (isMissingJob || !job || paymentState !== "paid") {
      return;
    }

    if (hasStartedProcessing.current) {
      return;
    }

    hasStartedProcessing.current = true;
    void updateClientJobStatus(jobId, "processing");
    const startTime = Date.now();
    const timer = window.setInterval(() => {
      const nextElapsedMs = Date.now() - startTime;

      setElapsedMs(Math.min(nextElapsedMs, totalDurationMs));

      if (nextElapsedMs >= totalDurationMs) {
        window.clearInterval(timer);
        setVectorizerMessage("Creating the clean SVG...");

        fetch(`/api/jobs/${jobId}/vectorize`, { method: "POST" })
          .then((response) => {
            if (!response.ok) {
              return updateClientJobStatus(jobId, "failed");
            }

            return updateClientJobStatus(jobId, "ready");
          })
          .catch(() => updateClientJobStatus(jobId, "failed"))
          .finally(() => {
            router.push(`/result/${jobId}`);
          });
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [isMissingJob, job, jobId, paymentState, router, totalDurationMs]);

  if (isMissingJob) {
    return (
      <main className="min-h-screen bg-[#f7f5f0] px-4 py-6 text-[#1f2520] sm:px-6 lg:px-8">
        <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col items-center justify-center text-center">
          <div className="rounded-[8px] border border-[#ddd8cc] bg-white p-6 shadow-[0_18px_60px_rgba(31,37,32,0.10)] sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
              Upload not found
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[#172017]">
              Start with a logo upload
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#626a61]">
              This upload could not be found. Please start with a new logo.
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
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col items-center justify-center gap-8">
        <div className="max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
            LogoCut SVG
          </p>
          <h1 className="text-4xl font-semibold tracking-normal text-[#172017] sm:text-5xl">
            Preparing your Cricut SVG
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#596158]">
            {paymentState === "paid"
              ? "We are creating the clean Cricut-ready SVG now."
              : paymentMessage}
          </p>
        </div>

        <div className="w-full max-w-2xl rounded-[8px] border border-[#ddd8cc] bg-white p-5 shadow-[0_18px_60px_rgba(31,37,32,0.10)] sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#657167]">
                Processing
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-[#172017]">
                {job?.fileName ?? "Your logo"}
              </p>
            </div>
            <span className="rounded-[8px] bg-[#eef5ef] px-3 py-1 text-sm font-semibold text-[#315f46]">
              {progress}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[#e8e2d8]">
            <div
              className="h-full rounded-full bg-[#315f46] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-6 space-y-3">
            {PROCESSING_STEPS.map((step, index) => {
              const isComplete = index < activeStepIndex;
              const isActive = index === activeStepIndex;

              return (
                <div
                  key={step.label}
                  className={`flex items-center gap-3 rounded-[8px] border px-4 py-3 ${
                    isActive
                      ? "border-[#315f46] bg-[#eef5ef]"
                      : "border-[#e6e1d7] bg-[#fbfaf7]"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isComplete
                        ? "bg-[#315f46] text-white"
                        : isActive
                          ? "bg-white text-[#315f46]"
                          : "bg-[#ece7dd] text-[#7a8179]"
                    }`}
                  >
                    {isComplete ? "OK" : index + 1}
                  </span>
                  <span className="text-sm font-medium text-[#27342b]">
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {vectorizerMessage ? (
            <p className="mt-4 rounded-[8px] border border-[#c9dfcf] bg-[#f1f8f2] px-4 py-3 text-sm font-medium text-[#315f46]">
              {vectorizerMessage}
            </p>
          ) : null}

          {paymentState !== "paid" ? (
            <div
              className={`mt-4 rounded-[8px] border px-4 py-3 text-sm font-medium ${
                paymentState === "checking"
                  ? "border-[#d8c36b] bg-[#fff9dc] text-[#6a5414]"
                  : "border-[#e4b5a8] bg-[#fff4f0] text-[#8a3426]"
              }`}
            >
              <p>{paymentMessage}</p>
              {paymentState === "required" || paymentState === "failed" ? (
                <button
                  className="mt-3 h-10 rounded-[8px] bg-[#315f46] px-4 text-sm font-semibold text-white transition hover:bg-[#264d39]"
                  type="button"
                  onClick={() => router.push("/")}
                >
                  Return to upload
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
