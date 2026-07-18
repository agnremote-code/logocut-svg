"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConversionUploader } from "@/components/conversion-uploader";
import { SiteFooter } from "@/components/site-footer";
import { UploaderTrigger, openUploader } from "@/components/uploader-trigger";
import { trackEvent } from "@/lib/analytics";

const trustItems = [
  "Free preview before paying",
  "Compatible with Cricut Design Space",
  "Instant SVG delivery",
  "Single-color from $5",
];

const demoExamples = [
  {
    title: "Simple Business Logo",
    original: "/demo/business-logo-original.png",
    result: "/demo/business-logo-svg.svg",
    altOriginal: "Original raster-style badge for a fictional business logo",
    altResult: "Clean SVG preview of a fictional business logo badge",
  },
  {
    title: "Cartoon-Style Illustration",
    original: "/demo/illustration-original.png",
    result: "/demo/illustration-svg.svg",
    altOriginal: "Original raster-style cheerful sun illustration",
    altResult: "Clean SVG preview of a cheerful sun illustration",
  },
  {
    title: "One-Color Text Design",
    original: "/demo/text-design-original.png",
    result: "/demo/text-design-svg.svg",
    altOriginal: "Original raster-style handmade text design",
    altResult: "Clean SVG preview of a handmade text design",
  },
];

const steps = [
  {
    title: "Upload your image",
    text: "PNG, JPG and JPEG files up to 10 MB.",
    icon: "upload",
  },
  {
    title: "Preview the SVG for free",
    text: "Check the result before spending anything.",
    icon: "preview",
  },
  {
    title: "Unlock and download",
    text: "Pay once and download the clean SVG instantly.",
    icon: "download",
  },
];

const useCases = [
  "Vinyl decals",
  "T-shirts and HTV",
  "Stickers",
  "Tumblers",
  "Business logos",
  "Signs",
  "Cricut projects",
  "Silhouette projects",
];

const trustClaims = [
  "Secure PayPal checkout",
  "No subscription",
  "Instant SVG download after payment",
  "Compatible with Cricut Design Space",
  "Compatible with SVG-capable cutting software",
  "Files remain available through the result link",
];

const comparisonRows = [
  ["Preview before paying", "Yes", "Not always"],
  ["Software installation", "None", "Often required"],
  ["Account required", "No", "Depends on software"],
  ["Pricing", "One-time payment", "Software or designer costs"],
  ["Delivery", "Instant after payment", "Manual work required"],
];

const faqItems = [
  {
    question: "Will I see the SVG before paying?",
    answer:
      "Yes. A free watermarked preview is generated first. You only pay if you want to unlock the clean SVG.",
  },
  {
    question: "How much does it cost?",
    answer:
      "A single-color SVG costs $5. A layered SVG costs $9. Both are one-time payments with no subscription.",
  },
  {
    question: "Does it work with Cricut Design Space?",
    answer:
      "Yes. The final download is an SVG file that can be imported into Cricut Design Space.",
  },
  {
    question: "Does it work with Silhouette Studio?",
    answer:
      "SVG files can be imported into Silhouette Studio editions that support SVG importing.",
  },
  {
    question: "What images can I upload?",
    answer: "You can upload PNG, JPG and JPEG images up to 10 MB.",
  },
  {
    question: "Can I convert AI-generated images?",
    answer:
      "Yes. You can upload AI-generated artwork as long as you have permission to use it.",
  },
  {
    question: "Can I convert a logo?",
    answer:
      "Yes. Simple logos with clear shapes and strong contrast usually produce the cleanest results.",
  },
  {
    question: "What is the difference between single-color and layered SVG?",
    answer:
      "Single-color is best for simple cut shapes and decals. Layered SVG is intended for designs that need separate color layers.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No. You can upload, preview, pay and download without creating an account.",
  },
  {
    question: "Do I need to install software?",
    answer: "No. The conversion runs directly in your browser.",
  },
  {
    question: "Can I use images that I found online?",
    answer: "Only upload images that you own or have permission to use.",
  },
  {
    question: "What happens after payment?",
    answer:
      "The clean production SVG is generated and the download button becomes available on your result page.",
  },
];

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function StepIcon({ type }: { type: string }) {
  return (
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
      {type === "upload" ? (
        <>
          <path d="M12 15V3" />
          <path d="m7 8 5-5 5 5" />
          <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
        </>
      ) : null}
      {type === "preview" ? (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : null}
      {type === "download" ? (
        <>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </>
      ) : null}
    </svg>
  );
}

function MobileStickyCta() {
  const [isUploaderVisible, setIsUploaderVisible] = useState(true);

  useEffect(() => {
    const uploader = document.querySelector("[data-logocut-uploader]");

    if (!uploader) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsUploaderVisible(entry.isIntersecting),
      { threshold: 0.18 },
    );

    observer.observe(uploader);

    return () => observer.disconnect();
  }, []);

  if (isUploaderVisible) {
    return null;
  }

  return (
    <div className="mobile-sticky-cta">
      <button
        className="primary-button h-[52px] w-full"
        type="button"
        onClick={() => openUploader("mobile_sticky")}
      >
        Preview Your SVG Free
      </button>
    </div>
  );
}

export function HomePage() {
  useEffect(() => {
    trackEvent("homepage_view", { source_page: "homepage" });
  }, []);

  return (
    <main className="bg-white text-[#111827]">
      <nav className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-5 sm:px-6">
        <Link className="text-sm font-semibold text-[#111827]" href="/">
          LogoCut SVG
        </Link>
        <div className="hidden items-center gap-5 text-sm font-medium text-[#667085] sm:flex">
          <Link href="/png-to-svg" className="hover:text-[#15803D]">
            PNG to SVG
          </Link>
          <Link href="/cricut-svg-converter" className="hover:text-[#15803D]">
            Cricut SVG
          </Link>
          <Link href="/logo-to-svg" className="hover:text-[#15803D]">
            Logo to SVG
          </Link>
        </div>
      </nav>

      <section className="hero-section">
        <p className="hero-eyebrow">PNG & JPG TO SVG CONVERTER</p>
        <h1>Convert PNG or JPG Into a Cricut-Ready SVG</h1>
        <p className="hero-subheadline">
          Upload your image, preview the SVG for free, and only pay if you like
          the result.
        </p>
        <div className="hero-uploader-wrap">
          <ConversionUploader sourcePage="homepage_hero" />
        </div>
        <div className="hero-trust-grid">
          {trustItems.map((item) => (
            <div key={item} className="hero-trust-item">
              <CheckIcon />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section bg-[#F8FAFC]">
        <div className="section-heading">
          <h2>See What Your SVG Could Look Like</h2>
          <p>From ordinary image files to clean, scalable cut paths.</p>
        </div>
        <div className="example-grid">
          {demoExamples.map((example) => (
            <article className="example-card" key={example.title}>
              <h3>{example.title}</h3>
              <div className="comparison-pair" aria-label={`${example.title} comparison`}>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={example.original} alt={example.altOriginal} />
                  <figcaption>Original image</figcaption>
                </figure>
                <span className="comparison-arrow" aria-hidden="true">
                  →
                </span>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={example.result} alt={example.altResult} />
                  <figcaption>SVG result</figcaption>
                </figure>
              </div>
              <ul className="result-notes" aria-label="Result benefits">
                <li>Clean edges</li>
                <li>Scalable paths</li>
                <li>Ready for cutting software</li>
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>From Image to SVG in Three Steps</h2>
        </div>
        <div className="three-column-grid">
          {steps.map((step, index) => (
            <article className="info-card" key={step.title}>
              <div className="info-icon">
                <StepIcon type={step.icon} />
              </div>
              <p className="eyebrow-small">Step {index + 1}</p>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section bg-[#F8FAFC]">
        <div className="section-heading">
          <h2>Simple, One-Time Pricing</h2>
          <p>Preview first. Pay only when the result works for you.</p>
        </div>
        <div className="pricing-grid">
          <article className="pricing-card">
            <h3>Free Preview</h3>
            <p className="price">$0</p>
            <ul>
              <li>Watermarked SVG preview</li>
              <li>Check the conversion first</li>
              <li>No account required</li>
            </ul>
            <UploaderTrigger
              className="secondary-button h-[52px] w-full"
              sourcePage="pricing_free"
            >
              Generate Free Preview
            </UploaderTrigger>
          </article>
          <article className="pricing-card pricing-card-popular">
            <span className="popular-badge">Most Popular</span>
            <h3>Single-Color SVG</h3>
            <p className="price">$5</p>
            <ul>
              <li>Clean SVG download</li>
              <li>Best for decals, vinyl and simple logos</li>
              <li>One-time payment</li>
              <li>No subscription</li>
            </ul>
            <UploaderTrigger
              className="primary-button h-[52px] w-full"
              sourcePage="pricing_single"
              cutType="single"
            >
              Try Single-Color Preview
            </UploaderTrigger>
          </article>
          <article className="pricing-card">
            <h3>Layered SVG</h3>
            <p className="price">$9</p>
            <ul>
              <li>Multi-color SVG output</li>
              <li>Best for layered craft projects</li>
              <li>One-time payment</li>
              <li>No subscription</li>
            </ul>
            <UploaderTrigger
              className="secondary-button h-[52px] w-full"
              sourcePage="pricing_layered"
              cutType="multi"
            >
              Try Layered Preview
            </UploaderTrigger>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Made for Real Craft Projects</h2>
        </div>
        <div className="use-case-grid">
          {useCases.map((item) => (
            <div className="use-case-item" key={item}>
              <CheckIcon />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section bg-[#F8FAFC]">
        <div className="section-heading">
          <h2>Preview First. Pay Only When It Works.</h2>
        </div>
        <div className="trust-claim-grid">
          {trustClaims.map((item) => (
            <div className="trust-claim" key={item}>
              <CheckIcon />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>A Faster Way to Prepare Images for Cutting</h2>
        </div>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th scope="col">Workflow</th>
                <th scope="col">LogoCut SVG</th>
                <th scope="col">Manual tracing workflow</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(([label, logocut, manual]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{logocut}</td>
                  <td>{manual}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section bg-[#F8FAFC]" id="faq">
        <div className="section-heading">
          <h2>FAQ</h2>
        </div>
        <div className="faq-list">
          {faqItems.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <h2>Ready to Turn Your Image Into an SVG?</h2>
        <p>Upload your image and see the preview before paying.</p>
        <UploaderTrigger
          className="primary-button mx-auto mt-7 h-[52px] w-full max-w-sm"
          sourcePage="final_cta"
        >
          Generate Free SVG Preview
        </UploaderTrigger>
        <p className="mt-4 text-sm font-medium text-[#667085]">
          No account · No subscription · From $5
        </p>
      </section>

      <SiteFooter />
      <MobileStickyCta />
    </main>
  );
}
