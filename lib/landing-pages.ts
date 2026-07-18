import { Metadata } from "next";

export type LandingPageConfig = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  subheadline: string;
  intro: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  links: Array<{
    href: string;
    label: string;
  }>;
};

const baseUrl = "https://www.logocutsvg.com";

export const landingPages: LandingPageConfig[] = [
  {
    slug: "png-to-svg",
    title: "Convert PNG to SVG Online | LogoCut SVG",
    description:
      "Convert PNG images to SVG online with a free watermarked preview before payment. Single-color SVG is $5 and layered SVG is $9.",
    h1: "Convert PNG to SVG Online",
    subheadline:
      "Upload a PNG, preview the SVG for free, and unlock the clean file only when the result works for your project.",
    intro:
      "PNG files are useful for sharing artwork, but they are still made from pixels. When a PNG needs to become a cut file, the shape usually needs to be traced into paths first. LogoCut SVG gives you a quick way to test that conversion before you spend anything.",
    sections: [
      {
        heading: "A practical PNG conversion workflow",
        paragraphs: [
          "Start by uploading a PNG with clear edges and enough contrast between the artwork and the background. The converter creates a watermarked SVG preview first, so you can check whether the outlines, fills and overall shape are moving in the right direction before choosing a paid download.",
          "This is helpful for decals, small business marks, text graphics, simple illustrations and artwork prepared for craft projects. A clean PNG often produces a cleaner SVG than a low-resolution screenshot, so use the best version you have permission to use.",
        ],
      },
      {
        heading: "Preview before you pay",
        paragraphs: [
          "The preview step is free. If the result is not right for your design, you can stop there without creating a checkout. If the preview works, the single-color SVG download is $5 and the layered SVG option is $9. Both are one-time payments with no subscription.",
          "Single-color output is usually best for vinyl decals, simple logo cuts and bold text designs. Layered output is intended for designs that need separate color layers. You can choose the output type before requesting the free preview.",
        ],
      },
      {
        heading: "Using the SVG after download",
        paragraphs: [
          "After payment is confirmed, the clean SVG is generated and made available on the result page. SVG files are scalable, so they can be resized inside SVG-capable design and cutting software without the pixelation you would see from enlarging a PNG.",
          "LogoCut SVG is especially useful when you want a fast online path from image to SVG without installing tracing software. For more specific workflows, see the Cricut SVG converter, JPG to SVG converter and logo to SVG pages linked below.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I upload a transparent PNG?",
        answer:
          "Yes. Transparent PNG files can be uploaded as long as they are under 10 MB.",
      },
      {
        question: "Is PNG to SVG free?",
        answer:
          "The watermarked preview is free. A single-color SVG download costs $5 and a layered SVG download costs $9.",
      },
      {
        question: "What kind of PNG works best?",
        answer:
          "PNG images with clear shapes, strong contrast and limited background clutter usually preview best.",
      },
    ],
    links: [
      { href: "/", label: "Homepage" },
      { href: "/jpg-to-svg", label: "JPG to SVG" },
      { href: "/cricut-svg-converter", label: "Cricut SVG Converter" },
      { href: "/logo-to-svg", label: "Logo to SVG" },
    ],
  },
  {
    slug: "jpg-to-svg",
    title: "Convert JPG to SVG Online | LogoCut SVG",
    description:
      "Convert JPG and JPEG files to SVG online. Generate a free preview first, then unlock single-color SVG for $5 or layered SVG for $9.",
    h1: "Convert JPG to SVG Online",
    subheadline:
      "Turn a JPG or JPEG into a previewable SVG path file before deciding whether to unlock the clean download.",
    intro:
      "JPG files are common for photos, scanned artwork and exported designs, but they are compressed raster images. To use a JPG as an SVG, the visible shapes need to be interpreted as vector paths. LogoCut SVG lets you test that process online with a free preview before payment.",
    sections: [
      {
        heading: "Best uses for JPG to SVG",
        paragraphs: [
          "A JPG can work well when the subject has clear boundaries, strong contrast and a relatively simple background. Logos, bold illustrations and text-based artwork are usually better candidates than busy photos with many small details. The free preview helps you judge the result before paying.",
          "If your JPG came from a screenshot, exported canvas or AI image tool, try to upload the highest-resolution version available. Extra compression can blur edges, and blurred edges can make tracing less predictable.",
        ],
      },
      {
        heading: "Simple pricing after preview",
        paragraphs: [
          "LogoCut SVG does not ask you to pay before you see a preview. Upload the image, choose single-color or layered output, then generate the free watermarked SVG preview. If it looks useful, unlock the clean file with a one-time payment.",
          "The single-color SVG is $5 and works best for decals, simple signs and bold cut shapes. The layered SVG is $9 and is intended for designs that need separate color layers. There is no account requirement and no subscription.",
        ],
      },
      {
        heading: "Preparing a cleaner JPG",
        paragraphs: [
          "Before uploading, crop away unrelated background and use an image where the important artwork fills the frame. Avoid uploading images you do not own or do not have permission to use. For online artwork, permission matters even when conversion is technically possible.",
          "Once the clean SVG is unlocked, the result page provides the download. You can use the file in Cricut Design Space or other SVG-capable cutting software. You may also want to compare this page with the PNG to SVG and image to SVG converters.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I upload JPEG files?",
        answer: "Yes. JPG and JPEG files are accepted up to 10 MB.",
      },
      {
        question: "Will a photo become a perfect cut file?",
        answer:
          "Not always. Photos can contain many soft edges and tiny details, so the free preview is the safest way to check the result.",
      },
      {
        question: "Do I pay before seeing the JPG conversion?",
        answer:
          "No. You see a free watermarked SVG preview before deciding whether to unlock the clean download.",
      },
    ],
    links: [
      { href: "/", label: "Homepage" },
      { href: "/png-to-svg", label: "PNG to SVG" },
      { href: "/image-to-svg", label: "Image to SVG" },
      { href: "/silhouette-svg-converter", label: "Silhouette SVG Converter" },
    ],
  },
  {
    slug: "logo-to-svg",
    title: "Convert Your Logo to SVG | LogoCut SVG",
    description:
      "Convert a logo image to SVG with a free preview before payment. Unlock a single-color SVG for $5 or layered SVG for $9.",
    h1: "Convert Your Logo to SVG",
    subheadline:
      "Upload a logo image and preview the SVG before unlocking a clean, scalable file.",
    intro:
      "A logo often starts as a PNG or JPG because those formats are easy to share. For cutting, scaling or importing into design software, SVG paths are usually more useful. LogoCut SVG helps turn a logo image into a previewable SVG without asking for payment first.",
    sections: [
      {
        heading: "Good logo candidates",
        paragraphs: [
          "Simple logos with strong contrast, readable shapes and limited photographic detail usually produce the cleanest previews. If your logo has a transparent background, upload that version. If it has a white background, crop away extra space and keep the artwork centered.",
          "Avoid uploading logos you do not own or do not have permission to use. The converter is designed for your own business logo, personal brand mark, event artwork or other authorized design assets.",
        ],
      },
      {
        heading: "Choose single-color or layered",
        paragraphs: [
          "Single-color SVG output costs $5 after the free preview and is often the right choice for decals, labels, vinyl and simple signage. It focuses on producing one clean cut shape from the logo artwork.",
          "Layered SVG output costs $9 after preview and is intended for logos that need separate color areas. Before paying, inspect the watermarked preview to confirm the conversion is suitable for the way you plan to use the file.",
        ],
      },
      {
        heading: "Fast online conversion",
        paragraphs: [
          "You do not need to create an account or install tracing software. Upload the image, generate the free preview, and only unlock the result if it looks useful. After payment is confirmed, the clean SVG is generated and the result page makes the download available.",
          "For file-specific guidance, visit the PNG to SVG and JPG to SVG pages. For craft-machine-focused workflows, the Cricut SVG converter and Silhouette SVG converter pages explain how SVG downloads fit into those tools.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I convert my business logo?",
        answer:
          "Yes. You can upload a logo you own or have permission to use, as long as the file is PNG, JPG or JPEG and under 10 MB.",
      },
      {
        question: "Which logo type works best?",
        answer:
          "Bold, simple logos with clean edges and strong contrast usually produce the clearest SVG previews.",
      },
      {
        question: "Is there a subscription?",
        answer:
          "No. The preview is free, and paid downloads are one-time purchases.",
      },
    ],
    links: [
      { href: "/", label: "Homepage" },
      { href: "/png-to-svg", label: "PNG to SVG" },
      { href: "/cricut-svg-converter", label: "Cricut SVG Converter" },
      { href: "/ai-image-to-svg", label: "AI Image to SVG" },
    ],
  },
  {
    slug: "image-to-svg",
    title: "Convert Any Image to SVG | LogoCut SVG",
    description:
      "Convert PNG, JPG and JPEG images to SVG online. Preview for free, then unlock single-color SVG for $5 or layered SVG for $9.",
    h1: "Convert Any Image to SVG",
    subheadline:
      "Upload a PNG, JPG or JPEG and see a free SVG preview before choosing a paid download.",
    intro:
      "When an image needs to scale cleanly or become a cut path, SVG can be a better fit than a pixel-based file. LogoCut SVG gives you a browser-based conversion workflow for PNG, JPG and JPEG images with a free preview before checkout.",
    sections: [
      {
        heading: "What image conversion means",
        paragraphs: [
          "Converting an image to SVG is not the same as changing a file extension. The visible artwork has to become vector paths. That is why the preview matters: it lets you inspect the shape of the conversion before deciding whether the clean SVG is worth unlocking.",
          "The converter is useful for clear artwork such as logos, icons, text designs, simplified illustrations and AI-generated graphics that you have permission to use. Very complex photos may be harder to turn into practical cut files.",
        ],
      },
      {
        heading: "A preview-first purchase flow",
        paragraphs: [
          "Upload a file up to 10 MB, choose single-color or layered output, and generate the free watermarked preview. No checkout starts automatically. Pay only if the preview works for your intended project.",
          "Single-color SVG downloads cost $5. Layered SVG downloads cost $9. Both are one-time payments, and there is no account requirement. Secure PayPal checkout appears on the result page only after the preview exists.",
        ],
      },
      {
        heading: "Where the SVG can be used",
        paragraphs: [
          "After payment is confirmed, the clean SVG is generated and can be downloaded from the result page. The file can be imported into Cricut Design Space and other cutting or design software that supports SVG files.",
          "If you already know your source file type or target workflow, the PNG to SVG, JPG to SVG, logo to SVG and Cricut SVG converter pages provide more focused guidance. Each route uses the same real upload and preview system.",
        ],
      },
    ],
    faqs: [
      {
        question: "Which image formats are accepted?",
        answer: "PNG, JPG and JPEG files up to 10 MB are accepted.",
      },
      {
        question: "Can I try without an account?",
        answer:
          "Yes. You can upload, preview, pay and download without creating an account.",
      },
      {
        question: "What if the SVG preview is not useful?",
        answer:
          "You can stop after the free preview. Payment is only needed to unlock the clean SVG.",
      },
    ],
    links: [
      { href: "/", label: "Homepage" },
      { href: "/png-to-svg", label: "PNG to SVG" },
      { href: "/jpg-to-svg", label: "JPG to SVG" },
      { href: "/logo-to-svg", label: "Logo to SVG" },
    ],
  },
  {
    slug: "cricut-svg-converter",
    title: "Cricut SVG Converter | LogoCut SVG",
    description:
      "Convert images into Cricut-ready SVG files with a free preview first. Unlock single-color SVG for $5 or layered SVG for $9.",
    h1: "Convert Images Into Cricut-Ready SVG Files",
    subheadline:
      "Preview a watermarked SVG before unlocking the clean file for Cricut Design Space.",
    intro:
      "Cricut projects often need artwork that can scale and cut cleanly. If your design is currently a PNG, JPG or JPEG, LogoCut SVG can generate a free SVG preview first so you can decide whether the conversion is ready for your project.",
    sections: [
      {
        heading: "Built around previewing first",
        paragraphs: [
          "Upload your image near the top of the page, choose the output type and generate a free preview. The preview may be watermarked, but it gives you a practical look at the converted SVG before any payment step appears.",
          "This is useful when preparing decals, shirt graphics, tumbler designs, signs and simple business logos. The best results usually come from clear artwork with bold shapes and strong contrast.",
        ],
      },
      {
        heading: "Pricing for Cricut-ready downloads",
        paragraphs: [
          "If the preview looks right, unlock a single-color SVG for $5 or a layered SVG for $9. Both are one-time payments. There is no subscription and no account requirement for the upload, preview, payment and download flow.",
          "Single-color files are often the simplest choice for vinyl and HTV projects. Layered SVG files are intended for designs that need separate color layers. The preview helps you choose with less guesswork.",
        ],
      },
      {
        heading: "Importing into Design Space",
        paragraphs: [
          "The final download is an SVG file that can be imported into Cricut Design Space. Once imported, you can resize the artwork and continue setting up your cut project inside Design Space.",
          "LogoCut SVG is an independent tool and is not affiliated with Cricut. For source-file guidance, see PNG to SVG or JPG to SVG. For broader image conversion, visit the image to SVG page.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does the SVG work with Cricut Design Space?",
        answer:
          "Yes. The final download is an SVG file that can be imported into Cricut Design Space.",
      },
      {
        question: "Can I preview before paying?",
        answer:
          "Yes. A free watermarked SVG preview is generated before checkout.",
      },
      {
        question: "Is LogoCut SVG affiliated with Cricut?",
        answer:
          "No. LogoCut SVG is an independent tool and is not affiliated with Cricut.",
      },
    ],
    links: [
      { href: "/", label: "Homepage" },
      { href: "/png-to-svg", label: "PNG to SVG" },
      { href: "/logo-to-svg", label: "Logo to SVG" },
      { href: "/silhouette-svg-converter", label: "Silhouette SVG Converter" },
    ],
  },
  {
    slug: "ai-image-to-svg",
    title: "Convert AI-Generated Images to SVG | LogoCut SVG",
    description:
      "Convert AI-generated PNG or JPG artwork to SVG with a free preview before payment. Single-color SVG is $5 and layered SVG is $9.",
    h1: "Convert AI-Generated Images to SVG",
    subheadline:
      "Upload AI-generated artwork you have permission to use and preview the SVG conversion for free.",
    intro:
      "AI image tools often export PNG or JPG files, but craft and design workflows may need SVG paths instead. LogoCut SVG helps you test whether an AI-generated image can become a useful SVG before you unlock a clean download.",
    sections: [
      {
        heading: "Start with authorized artwork",
        paragraphs: [
          "Only upload AI-generated images that you own or have permission to use. If the artwork includes protected characters, brand marks or content you cannot legally use, conversion does not make it safe to use. The uploader accepts PNG, JPG and JPEG files up to 10 MB.",
          "For better previews, choose AI images with crisp shapes, simple backgrounds and strong contrast. Poster-style artwork, icons, badges, text designs and simplified illustrations are often more suitable than highly detailed scenes.",
        ],
      },
      {
        heading: "Preview the conversion first",
        paragraphs: [
          "AI images can include soft gradients, painterly edges and tiny details that are not always ideal for cutting. The free watermarked preview is designed to show you how the SVG interpretation looks before any payment is required.",
          "If the preview works, unlock a clean single-color SVG for $5 or a layered SVG for $9. Both options are one-time purchases. No subscription is required, and checkout only happens after the preview exists.",
        ],
      },
      {
        heading: "Using the final SVG",
        paragraphs: [
          "After payment is confirmed, the clean SVG is generated and available from the result page. You can import the file into Cricut Design Space or other software that supports SVG files and continue preparing your craft project.",
          "If your AI tool exported a transparent PNG, the PNG to SVG page may also be useful. If it exported a JPG, visit the JPG to SVG page. For machine-specific guidance, see the Cricut SVG converter and Silhouette SVG converter pages.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I upload AI-generated artwork?",
        answer:
          "Yes, as long as you have permission to use the artwork and it is a PNG, JPG or JPEG under 10 MB.",
      },
      {
        question: "Will detailed AI art convert well?",
        answer:
          "Highly detailed art can be unpredictable. The free preview helps you decide whether the result is useful.",
      },
      {
        question: "Can I convert copyrighted characters?",
        answer:
          "Only upload images that you own or have permission to use.",
      },
    ],
    links: [
      { href: "/", label: "Homepage" },
      { href: "/image-to-svg", label: "Image to SVG" },
      { href: "/png-to-svg", label: "PNG to SVG" },
      { href: "/cricut-svg-converter", label: "Cricut SVG Converter" },
    ],
  },
  {
    slug: "silhouette-svg-converter",
    title: "Silhouette SVG Converter | LogoCut SVG",
    description:
      "Convert PNG, JPG and JPEG images to SVG for SVG-capable Silhouette Studio editions. Preview first, then unlock for $5 or $9.",
    h1: "Convert Images to SVG for Silhouette Studio",
    subheadline:
      "Generate a free SVG preview before unlocking a clean file for SVG-capable Silhouette workflows.",
    intro:
      "Silhouette Studio support for SVG importing depends on the edition you use. If your workflow supports SVG files, LogoCut SVG can help convert PNG, JPG and JPEG images into previewable SVG output before payment.",
    sections: [
      {
        heading: "Check the SVG before unlocking",
        paragraphs: [
          "Upload an image up to 10 MB and generate a free watermarked preview. This lets you inspect the converted paths before deciding whether to unlock the clean SVG. No checkout starts automatically, and no account is required.",
          "The converter is best suited for clear artwork such as simple logos, decals, text designs and bold illustrations. Busy photos or low-contrast images may not produce practical cut paths, so previewing is important.",
        ],
      },
      {
        heading: "One-time download pricing",
        paragraphs: [
          "A single-color SVG download costs $5 after preview. It is often the right fit for vinyl decals, simple signs and one-color cut shapes. A layered SVG download costs $9 and is intended for projects that need separate color layers.",
          "Both options are one-time payments with no subscription. Secure PayPal checkout appears on the result page only after a preview has been generated and only if you choose to unlock the clean file.",
        ],
      },
      {
        heading: "Working with Silhouette files",
        paragraphs: [
          "SVG files can be imported into Silhouette Studio editions that support SVG importing. After download, continue setup, sizing and cut preparation inside your Silhouette software.",
          "LogoCut SVG does not claim to replace every manual design workflow. It is a faster preview-first route for common image-to-SVG needs. Related pages include image to SVG, logo to SVG and Cricut SVG converter.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does this work with Silhouette Studio?",
        answer:
          "SVG files can be imported into Silhouette Studio editions that support SVG importing.",
      },
      {
        question: "Can I use JPG or PNG files?",
        answer:
          "Yes. PNG, JPG and JPEG images up to 10 MB can be uploaded.",
      },
      {
        question: "Do I need to pay before the preview?",
        answer:
          "No. The SVG preview is free, and payment is only required to unlock the clean SVG.",
      },
    ],
    links: [
      { href: "/", label: "Homepage" },
      { href: "/image-to-svg", label: "Image to SVG" },
      { href: "/jpg-to-svg", label: "JPG to SVG" },
      { href: "/cricut-svg-converter", label: "Cricut SVG Converter" },
    ],
  },
];

export function getLandingPage(slug: string) {
  return landingPages.find((page) => page.slug === slug);
}

export function getLandingMetadata(page: LandingPageConfig): Metadata {
  const url = `${baseUrl}/${page.slug}`;

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      siteName: "LogoCut SVG",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: page.title,
      description: page.description,
    },
  };
}

export function getLandingJsonLd(page: LandingPageConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
