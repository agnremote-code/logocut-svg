import Link from "next/link";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-10 text-[#1f2520] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-[8px] border border-[#ddd8cc] bg-white p-6 shadow-[0_18px_60px_rgba(31,37,32,0.10)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
          Support policy
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#172017]">
          Refund and support help
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#626a61]">
          If your paid SVG cannot be generated or a download link does not work,
          contact support with your PayPal receipt and result link. We will help
          with the file or review the purchase for a refund.
        </p>
        <p className="mt-4 text-sm leading-6 text-[#626a61]">
          Free previews are watermarked test-mode files. Paid downloads are
          generated only after payment is confirmed.
        </p>
        <Link
          className="mt-6 inline-flex h-11 items-center rounded-[8px] bg-[#315f46] px-5 text-sm font-semibold text-white transition hover:bg-[#264d39]"
          href="/"
        >
          Back to LogoCut SVG
        </Link>
      </section>
    </main>
  );
}
