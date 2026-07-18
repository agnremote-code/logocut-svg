import Link from "next/link";
import { notFound } from "next/navigation";
import { ConversionUploader } from "@/components/conversion-uploader";
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
    <main className="bg-white text-[#111827]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getLandingJsonLd(page)),
        }}
      />

      <nav className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-5 sm:px-6">
        <Link className="text-sm font-semibold text-[#111827]" href="/">
          LogoCut SVG
        </Link>
        <Link
          className="text-sm font-semibold text-[#15803D] hover:text-[#16A34A]"
          href="/"
        >
          Home
        </Link>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div>
            <p className="hero-eyebrow">PNG & JPG TO SVG CONVERTER</p>
            <h1>{page.h1}</h1>
            <p>{page.subheadline}</p>
            <p>{page.intro}</p>
            <UploaderTrigger
              className="primary-button mt-5 h-[52px] w-full max-w-sm"
              sourcePage={`${page.slug}_hero_cta`}
            >
              Generate Free SVG Preview
            </UploaderTrigger>
          </div>
          <ConversionUploader sourcePage={page.slug} compact />
        </div>
      </section>

      <section className="section">
        <article className="landing-copy">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}

          <div className="landing-card">
            <h2 className="!mt-0">Preview first, then unlock</h2>
            <p>
              Every converter page uses the same upload workflow: free
              watermarked preview first, then a $5 single-color SVG or $9
              layered SVG only if you choose to unlock the clean file.
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
          Generate Free SVG Preview
        </UploaderTrigger>
        <p className="mt-4 text-sm font-medium text-[#d1d5db]">
          No account · No subscription · From $5
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
