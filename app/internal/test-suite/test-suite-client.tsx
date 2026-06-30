"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import QualityCheckCard from "@/components/quality-check-card";
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

type TestStatus =
  | "queued"
  | "uploading"
  | "vectorizing"
  | "ready"
  | "failed";

type ReviewStatus = "untested" | "pass" | "fail";

type TestItem = {
  id: string;
  file: File;
  originalUrl: string;
  status: TestStatus;
  reviewStatus: ReviewStatus;
  cutType: CutType;
  jobId?: string;
  svgUrl?: string;
  downloadName?: string;
  processingTimeMs?: number;
  error?: string;
  qualityInspection?: ImageQualityInspection;
  isQualityChecking: boolean;
  qualityError?: string;
  notes: string;
};

const testTargets = [
  "clean logos",
  "blurry logos",
  "screenshots",
  "transparent PNGs",
  "black logos",
  "white logos",
  "circular logos",
  "logos with gradients",
  "logos with small text",
  "logos with shadows",
];

function formatDuration(durationMs?: number) {
  if (!durationMs) {
    return "--";
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

function createItem(file: File, cutType: CutType): TestItem {
  return {
    id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    originalUrl: URL.createObjectURL(file),
    status: "queued",
    reviewStatus: "untested",
    cutType,
    isQualityChecking: true,
    notes: "",
  };
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export default function TestSuiteClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<TestItem[]>([]);
  const [cutType, setCutType] = useState<CutType>("single");
  const [isRunning, setIsRunning] = useState(false);
  const [batchError, setBatchError] = useState("");

  const summary = useMemo(
    () => ({
      total: items.length,
      ready: items.filter((item) => item.status === "ready").length,
      failed: items.filter((item) => item.status === "failed").length,
      passed: items.filter((item) => item.reviewStatus === "pass").length,
      failedReview: items.filter((item) => item.reviewStatus === "fail").length,
    }),
    [items],
  );

  const updateItem = (id: string, update: Partial<TestItem>) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, ...update } : item,
      ),
    );
  };

  const inspectItem = async (item: TestItem) => {
    updateItem(item.id, {
      isQualityChecking: true,
      qualityError: undefined,
      qualityInspection: undefined,
    });

    try {
      const inspection = await inspectImageQuality(item.file);
      updateItem(item.id, {
        qualityInspection: inspection,
        cutType: inspection.recommendedCutType,
        isQualityChecking: false,
      });
      return inspection;
    } catch {
      updateItem(item.id, {
        isQualityChecking: false,
        qualityError: "Could not complete the image quality check.",
      });
      return null;
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    setBatchError("");

    const validItems: TestItem[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      if (
        !ACCEPTED_FILE_TYPES.includes(
          file.type as (typeof ACCEPTED_FILE_TYPES)[number],
        )
      ) {
        errors.push(`${file.name}: PNG or JPG only.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: over 10 MB.`);
        return;
      }

      validItems.push(createItem(file, cutType));
    });

    if (errors.length) {
      setBatchError(errors.join(" "));
    }

    if (validItems.length) {
      setItems((currentItems) => [...validItems, ...currentItems]);
      validItems.forEach((item) => {
        void inspectItem(item);
      });
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  const processItem = async (item: TestItem) => {
    const startedAt = performance.now();

    updateItem(item.id, {
      status: "uploading",
      error: undefined,
      processingTimeMs: undefined,
    });

    try {
      let cutTypeForJob = item.cutType;

      if (!item.qualityInspection && !item.qualityError) {
        const inspection = await inspectItem(item);

        if (inspection) {
          cutTypeForJob = inspection.recommendedCutType;
        }
      }

      const formData = new FormData();
      formData.append("image", item.file);
      formData.append("cutType", cutTypeForJob);

      const createResponse = await fetch("/api/jobs", {
        method: "POST",
        body: formData,
      });

      const createPayload = await readJsonResponse<{
        job?: JobSummary;
        error?: string;
      }>(createResponse);

      if (!createResponse.ok || !createPayload.job) {
        throw new Error(createPayload.error ?? "Could not create job.");
      }

      updateItem(item.id, {
        status: "vectorizing",
        jobId: createPayload.job.id,
      });

      const vectorizeResponse = await fetch(
        `/api/jobs/${createPayload.job.id}/vectorize`,
        { method: "POST" },
      );

      const vectorizePayload = await readJsonResponse<{
        error?: string;
      }>(vectorizeResponse);

      if (!vectorizeResponse.ok) {
        throw new Error(
          vectorizePayload.error ?? "Vectorizer.AI test mode failed.",
        );
      }

      const finishedAt = performance.now();
      const baseName = item.file.name.replace(/\.[^.]+$/, "");

      updateItem(item.id, {
        status: "ready",
        svgUrl: `/api/jobs/${createPayload.job.id}/result`,
        downloadName: `${baseName}-logocut-test.svg`,
        processingTimeMs: Math.round(finishedAt - startedAt),
        notes: item.notes || "Inspect cut path quality in the SVG preview.",
      });
    } catch (error) {
      updateItem(item.id, {
        status: "failed",
        processingTimeMs: Math.round(performance.now() - startedAt),
        error:
          error instanceof Error
            ? error.message
            : "This logo could not be processed.",
        notes: item.notes || "Failed during test-mode processing.",
      });
    }
  };

  const processAll = async () => {
    setIsRunning(true);

    const queuedItems = items.filter(
      (item) => item.status === "queued" || item.status === "failed",
    );

    for (const item of queuedItems) {
      await processItem(item);
    }

    setIsRunning(false);
  };

  const removeItem = (id: string) => {
    setItems((currentItems) => {
      const itemToRemove = currentItems.find((item) => item.id === id);

      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.originalUrl);
      }

      return currentItems.filter((item) => item.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach((item) => URL.revokeObjectURL(item.originalUrl));
    setItems([]);
    setBatchError("");
  };

  return (
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-6 text-[#1f2520] sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[8px] border border-[#ddd8cc] bg-white p-5 shadow-[0_18px_60px_rgba(31,37,32,0.08)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
                Internal testing
              </p>
              <h1 className="text-3xl font-semibold tracking-normal text-[#172017] sm:text-4xl">
                LogoCut SVG Test Suite
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#596158] sm:text-base">
                Upload batches of edge-case logos and compare the original
                raster image against the Vectorizer.AI test-mode SVG result.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5 lg:min-w-[520px]">
              <div className="rounded-[8px] border border-[#e6e1d7] bg-[#fbfaf7] p-3">
                <p className="font-semibold text-[#172017]">{summary.total}</p>
                <p className="text-[#626a61]">Total</p>
              </div>
              <div className="rounded-[8px] border border-[#e6e1d7] bg-[#fbfaf7] p-3">
                <p className="font-semibold text-[#315f46]">{summary.ready}</p>
                <p className="text-[#626a61]">Ready</p>
              </div>
              <div className="rounded-[8px] border border-[#e6e1d7] bg-[#fbfaf7] p-3">
                <p className="font-semibold text-[#8a3426]">
                  {summary.failed}
                </p>
                <p className="text-[#626a61]">API failed</p>
              </div>
              <div className="rounded-[8px] border border-[#e6e1d7] bg-[#fbfaf7] p-3">
                <p className="font-semibold text-[#315f46]">
                  {summary.passed}
                </p>
                <p className="text-[#626a61]">Pass</p>
              </div>
              <div className="rounded-[8px] border border-[#e6e1d7] bg-[#fbfaf7] p-3">
                <p className="font-semibold text-[#8a3426]">
                  {summary.failedReview}
                </p>
                <p className="text-[#626a61]">Fail</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-[8px] border border-[#ddd8cc] bg-white p-5 shadow-[0_18px_60px_rgba(31,37,32,0.08)]">
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                multiple
                onChange={handleFileChange}
              />

              <button
                className="flex min-h-40 w-full flex-col items-center justify-center rounded-[8px] border-2 border-dashed border-[#cfc8bb] bg-[#fbfaf7] px-5 py-8 text-center transition hover:border-[#315f46] hover:bg-[#f3f7f1]"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="text-lg font-semibold text-[#172017]">
                  Add logo test files
                </span>
                <span className="mt-2 text-sm leading-6 text-[#6b716b]">
                  PNG, JPG, JPEG under 10 MB each
                </span>
              </button>

              <div className="mt-4 grid gap-3">
                <label className="text-sm font-semibold text-[#27342b]">
                  Cut type
                  <select
                    className="mt-2 h-11 w-full rounded-[8px] border border-[#cfc8bb] bg-white px-3 text-sm text-[#172017]"
                    value={cutType}
                    onChange={(event) => setCutType(event.target.value as CutType)}
                  >
                    {CUT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className="h-12 rounded-[8px] bg-[#315f46] px-5 text-sm font-semibold text-white transition hover:bg-[#264d39] disabled:cursor-not-allowed disabled:bg-[#8aa192]"
                  type="button"
                  disabled={isRunning || !items.length}
                  onClick={processAll}
                >
                  {isRunning ? "Running tests..." : "Run queued tests"}
                </button>

                <button
                  className="h-11 rounded-[8px] border border-[#cfc8bb] px-4 text-sm font-semibold text-[#27342b] transition hover:border-[#315f46] hover:bg-[#fbfaf7]"
                  type="button"
                  disabled={isRunning || !items.length}
                  onClick={clearAll}
                >
                  Clear suite
                </button>
              </div>

              {batchError ? (
                <p className="mt-4 rounded-[8px] border border-[#e4b5a8] bg-[#fff4f0] px-4 py-3 text-sm font-medium text-[#8a3426]">
                  {batchError}
                </p>
              ) : null}
            </div>

            <div className="rounded-[8px] border border-[#ddd8cc] bg-white p-5 shadow-[0_18px_60px_rgba(31,37,32,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#657167]">
                Coverage checklist
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {testTargets.map((target) => (
                  <span
                    key={target}
                    className="rounded-[8px] border border-[#e0dbd1] bg-[#fbfaf7] px-3 py-2 text-xs font-semibold text-[#596158]"
                  >
                    {target}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            {!items.length ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-[8px] border border-[#ddd8cc] bg-white p-8 text-center shadow-[0_18px_60px_rgba(31,37,32,0.08)]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
                    Empty test suite
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-[#172017]">
                    Add a batch of logos to begin
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-[#626a61]">
                    Use real messy inputs here: screenshots, blurry files,
                    transparent PNGs, gradients, small text, shadows, and
                    contrast edge cases.
                  </p>
                </div>
              </div>
            ) : (
              items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[8px] border border-[#ddd8cc] bg-white p-4 shadow-[0_18px_60px_rgba(31,37,32,0.08)] sm:p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-[#172017]">
                        {item.file.name}
                      </p>
                      <p className="mt-1 text-sm text-[#626a61]">
                        {item.cutType === "single"
                          ? "Single-color cut"
                          : "Multi-color layered cut"}{" "}
                        · {Math.round(item.file.size / 1024)} KB ·{" "}
                        {formatDuration(item.processingTimeMs)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-[8px] px-3 py-1 text-sm font-semibold ${
                          item.status === "ready"
                            ? "bg-[#f1f8f2] text-[#315f46]"
                            : item.status === "failed"
                              ? "bg-[#fff4f0] text-[#8a3426]"
                              : "bg-[#f0ece3] text-[#596158]"
                        }`}
                      >
                        {item.status}
                      </span>
                      <button
                        className="h-8 rounded-[8px] border border-[#cfc8bb] px-3 text-xs font-semibold text-[#596158] transition hover:border-[#315f46] hover:text-[#27342b]"
                        type="button"
                        onClick={() => removeItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1fr_1fr_320px]">
                    <div>
                      <p className="mb-2 text-sm font-semibold text-[#27342b]">
                        Original image
                      </p>
                      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[8px] border border-[#e0dbd1] bg-[#fbfaf7]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={`Original ${item.file.name}`}
                          className="h-full w-full object-contain p-4"
                          src={item.originalUrl}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-[#27342b]">
                        Generated SVG preview
                      </p>
                      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[8px] border border-[#e0dbd1] bg-[#fbfaf7]">
                        {item.svgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={`Generated SVG ${item.file.name}`}
                            className="h-full w-full object-contain p-4"
                            src={item.svgUrl}
                          />
                        ) : (
                          <p className="px-6 text-center text-sm font-medium text-[#626a61]">
                            {item.error ||
                              (item.status === "queued"
                                ? "Queued for Vectorizer.AI test mode"
                                : "Processing...")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <QualityCheckCard
                        compact
                        error={item.qualityError}
                        inspection={item.qualityInspection}
                        isLoading={item.isQualityChecking}
                      />

                      <label className="text-sm font-semibold text-[#27342b]">
                        Cut mode
                        <select
                          className={`mt-2 h-11 w-full rounded-[8px] border bg-white px-3 text-sm text-[#172017] ${
                            item.qualityInspection?.recommendedCutType ===
                            item.cutType
                              ? "border-[#315f46]"
                              : "border-[#cfc8bb]"
                          }`}
                          value={item.cutType}
                          onChange={(event) =>
                            updateItem(item.id, {
                              cutType: event.target.value as CutType,
                            })
                          }
                        >
                          {CUT_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                              {item.qualityInspection?.recommendedCutType ===
                              option.id
                                ? " - recommended"
                                : ""}
                            </option>
                          ))}
                        </select>
                      </label>

                      {item.svgUrl ? (
                        <a
                          className="flex h-11 items-center justify-center rounded-[8px] bg-[#315f46] px-4 text-sm font-semibold text-white transition hover:bg-[#264d39]"
                          download={item.downloadName}
                          href={item.svgUrl}
                        >
                          Download SVG
                        </a>
                      ) : (
                        <button
                          className="h-11 cursor-not-allowed rounded-[8px] bg-[#8aa192] px-4 text-sm font-semibold text-white"
                          type="button"
                          disabled
                        >
                          Download SVG
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`h-10 rounded-[8px] border px-3 text-sm font-semibold ${
                            item.reviewStatus === "pass"
                              ? "border-[#315f46] bg-[#eef5ef] text-[#315f46]"
                              : "border-[#cfc8bb] text-[#27342b]"
                          }`}
                          type="button"
                          onClick={() =>
                            updateItem(item.id, { reviewStatus: "pass" })
                          }
                        >
                          Pass
                        </button>
                        <button
                          className={`h-10 rounded-[8px] border px-3 text-sm font-semibold ${
                            item.reviewStatus === "fail"
                              ? "border-[#8a3426] bg-[#fff4f0] text-[#8a3426]"
                              : "border-[#cfc8bb] text-[#27342b]"
                          }`}
                          type="button"
                          onClick={() =>
                            updateItem(item.id, { reviewStatus: "fail" })
                          }
                        >
                          Fail
                        </button>
                      </div>

                      <label className="text-sm font-semibold text-[#27342b]">
                        Pass/fail notes
                        <textarea
                          className="mt-2 min-h-28 w-full rounded-[8px] border border-[#cfc8bb] bg-white p-3 text-sm font-normal leading-6 text-[#172017]"
                          placeholder="Jagged edges, missing holes, tiny text lost, good cut paths..."
                          value={item.notes}
                          onChange={(event) =>
                            updateItem(item.id, { notes: event.target.value })
                          }
                        />
                      </label>

                      {item.error ? (
                        <p className="rounded-[8px] border border-[#e4b5a8] bg-[#fff4f0] px-4 py-3 text-sm font-medium text-[#8a3426]">
                          {item.error}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </section>
      </section>
    </main>
  );
}
