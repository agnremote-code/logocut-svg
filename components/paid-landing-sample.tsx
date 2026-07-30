"use client";

import Image from "next/image";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

export function PaidLandingSample({ sourcePage }: { sourcePage: string }) {
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const showSamplePreview = () => {
    if (isPreviewVisible) {
      return;
    }

    trackEvent("sample_demo_started", {
      source_page: sourcePage,
      sample: "northline",
    });
    setIsPreviewVisible(true);
    trackEvent("sample_preview_generated", {
      source_page: sourcePage,
      sample: "northline",
    });
  };

  return (
    <section
      className={`paid-sample-demo ${isPreviewVisible ? "is-preview-visible" : ""}`}
      data-sample-demo
      aria-label="Real PNG to SVG example"
    >
      <div className="paid-sample-heading">
        <div>
          <span>REAL EXAMPLE</span>
          <strong>See a PNG become a clean SVG</strong>
        </div>
        {!isPreviewVisible ? (
          <button type="button" onClick={showSamplePreview}>
            Try With a Sample Image
          </button>
        ) : (
          <span className="paid-sample-ready">Sample preview ready</span>
        )}
      </div>

      <div className="paid-sample-comparison">
        <figure>
          <Image
            alt="Original Northline sample PNG"
            height={180}
            src="/demo/generated/northline-original.png"
            width={260}
          />
          <figcaption>Original PNG</figcaption>
        </figure>
        <span className="paid-sample-arrow" aria-hidden="true">
          →
        </span>
        <figure className="paid-sample-result">
          {isPreviewVisible ? (
            <Image
              alt="Converted Northline sample SVG"
              height={180}
              src="/demo/generated/northline.svg"
              width={260}
            />
          ) : (
            <div className="paid-sample-placeholder" aria-hidden="true">
              <span>SVG</span>
            </div>
          )}
          <figcaption>SVG result</figcaption>
        </figure>
      </div>

      {isPreviewVisible ? (
        <p className="paid-sample-note">
          This is a demonstration only. Upload your own image to create a
          preview and unlock checkout.
        </p>
      ) : null}
    </section>
  );
}
