import { HomePage } from "@/components/home-page";

const homepageFaqItems = [
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

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LogoCut SVG",
    description:
      "PNG and JPG to Cricut-ready SVG converter with free watermarked preview before payment.",
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    url: "https://www.logocutsvg.com",
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        name: "Free SVG preview",
      },
      {
        "@type": "Offer",
        price: "5",
        priceCurrency: "USD",
        name: "Single-color SVG",
      },
      {
        "@type": "Offer",
        price: "9",
        priceCurrency: "USD",
        name: "Layered SVG",
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homepageFaqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomePage />
    </>
  );
}
