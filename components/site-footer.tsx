import Link from "next/link";

export const converterLinks = [
  { href: "/png-to-svg", label: "PNG to SVG" },
  { href: "/jpg-to-svg", label: "JPG to SVG" },
  { href: "/logo-to-svg", label: "Logo to SVG" },
  { href: "/image-to-svg", label: "Image to SVG" },
  { href: "/cricut-svg-converter", label: "Cricut SVG Converter" },
  { href: "/ai-image-to-svg", label: "AI Image to SVG" },
  { href: "/silhouette-svg-converter", label: "Silhouette SVG Converter" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <Link className="text-base font-semibold text-[#111827]" href="/">
            LogoCut SVG
          </Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-[#667085]">
            LogoCut SVG is an independent tool and is not affiliated with
            Cricut.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-[1.4fr_0.6fr]">
          <nav aria-label="Converters">
            <h2 className="text-sm font-semibold uppercase text-[#111827]">
              Converters
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {converterLinks.map((link) => (
                <Link
                  key={link.href}
                  className="text-sm font-medium text-[#667085] hover:text-[#15803D]"
                  href={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
          <nav aria-label="Legal links">
            <h2 className="text-sm font-semibold uppercase text-[#111827]">
              Legal
            </h2>
            <div className="mt-4 grid gap-3">
              <Link
                className="text-sm font-medium text-[#667085] hover:text-[#15803D]"
                href="/privacy"
              >
                Privacy
              </Link>
              <Link
                className="text-sm font-medium text-[#667085] hover:text-[#15803D]"
                href="/terms"
              >
                Terms
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
