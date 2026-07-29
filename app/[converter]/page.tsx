import Link from "next/link";
import { notFound } from "next/navigation";
import { ConversionUploader } from "@/components/conversion-uploader";
import { PaidLandingAnalytics } from "@/components/paid-landing-analytics";
import { SiteFooter } from "@/components/site-footer";
import { UploaderTrigger } from "@/components/uploader-trigger";
import {
  getLandingJsonLd,
  getLandingMetadata,
  getLandingPage,
  landingPages,
} from "@/lib/landing-pages";

type ConverterPageProps = {
  params: Promise<{
    converter: string;
  }>;
};

export function generateStaticParams() {
  return landingPages.map((page) => ({ converter: page.slug }));
}

export async function generateMetadata({ params }: ConverterPageProps) {
  const { converter } = await params;
  const page = getLandingPage(converter);

  if (!page) {
    return {};
  }

  return getLandingMetadata(page);
}

export default async function ConverterPage({ params }: ConverterPageProps) {
  const { converter } = await params;
  const page = getLandingPage(converter);

  if (!page) {
    notFound();
  }

  return (
    <main className="paid-landing-page">
      <PaidLandingAnalytics sourcePage={page.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getLandingJsonLd(page)),
        }}
      />

      <nav className="paid-landing-nav">
        <Link className="paid-landing-brand" href="/">
          <span aria-hidden="true">LC</span>
          LogoCut SVG
        </Link>
        <Link
          className="paid-landing-home-link"
          href="/"
        >
          Home
        </Link>
      </nav>

      <div className="paid-landing-announcement">
        Free preview first <span>·</span> No account <span>·</span> No
        subscription
      </div>

      <section className="paid-landing-hero">
        <div className="paid-landing-hero-inner">
          <div className="paid-landing-copy">
            <p className="paid-landing-eyebrow">
              PNG &amp; JPG TO CRICUT-READY SVG
            </p>
            <h1>{page.h1}</h1>
            <p className="paid-landing-subheadline">{page.subheadline}</p>

            <div
              id="paid-landing-pricing"
              className="paid-price-row"
              aria-label="One-time pricing"
            >
              <div>
                <span>Single-color</span>
                <strong>$5</strong>
              </div>
              <div>
                <span>Layered</span>
                <strong>$9</strong>
              </div>
              <div className="paid-price-best">
                <span>Both SVGs</span>
                <strong>$12</strong>
                <small>Best value</small>
              </div>
            </div>

            <ul className="paid-landing-benefits">
              <li>See the watermarked SVG before paying</li>
              <li>Pay once only if the preview works for you</li>
              <li>Download a clean, cut-ready SVG</li>
            </ul>
          </div>

          <div className="paid-landing-uploader">
            <div className="paid-uploader-heading">
              <span>1</span>
              <div>
                <strong>Upload your image</strong>
                <small>Your free preview comes next</small>
              </div>
            </div>
            <ConversionUploader sourcePage={page.slug} compact />
            <div className="paid-uploader-trust" aria-label="Upload assurances">
              <span>PNG or JPG</span>
              <span>Under 10 MB</span>
              <span>Secure processing</span>
            </div>
          </div>
        </div>
      </section>

      <section className="paid-how-it-works" aria-label="How LogoCut works">
        <div>
          <span>1</span>
          <p>
            <strong>Upload</strong>
            Choose your PNG or JPG.
          </p>
        </div>
        <div>
          <span>2</span>
          <p>
            <strong>Preview free</strong>
            Review the watermarked SVG.
          </p>
        </div>
        <div>
          <span>3</span>
          <p>
            <strong>Unlock</strong>
            Pay once and download clean files.
          </p>
        </div>
      </section>

      <section className="section paid-landing-details">
        <article className="landing-copy">
          <section className="paid-intro-section">
            <p className="paid-section-label">BUILT FOR REAL CUTTING PROJECTS</p>
            <h2 className="!mt-0">Preview the conversion before you commit</h2>
            <p>{page.intro}</p>
          </section>

          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}

          <div className="landing-card">
            <h2 className="!mt-0">Simple, transparent pricing</h2>
            <p>
              Every converter page uses the same upload workflow: free
              watermarked preview first, then a $5 single-color SVG or $9
              layered SVG only if you choose to unlock the clean file. Get both
              clean versions in the Complete SVG Pack for $12.
            </p>
            <div className="landing-links" aria-label="Related converter pages">
              {page.links.map((link) => (
                <Link
                  key={link.href}
                  className="secondary-button"
                  href={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="section bg-[#F8FAFC]">
        <div className="section-heading">
          <h2>Questions about this converter</h2>
        </div>
        <div className="faq-list">
          {page.faqs.map((faq) => (
            <details className="faq-item" key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <h2>Ready to Turn Your Image Into an SVG?</h2>
        <p>Upload your image and see the preview before paying.</p>
        <UploaderTrigger
          className="primary-button mx-auto mt-7 h-[52px] w-full max-w-sm"
          sourcePage={`${page.slug}_final_cta`}
        >
          Upload PNG or JPG
        </UploaderTrigger>
        <p className="mt-4 text-sm font-medium text-[#d1d5db]">
          No account · No subscription · From $5
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
