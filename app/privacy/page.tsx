export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-10 text-[#1f2520] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-[8px] border border-[#ddd8cc] bg-white p-6 shadow-[0_18px_60px_rgba(31,37,32,0.10)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
          LogoCut SVG
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[#172017]">
          Privacy Policy
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-[#596158]">
          <p>
            LogoCut SVG uses uploaded images only to create SVG previews and
            paid SVG downloads for the current workflow.
          </p>
          <p>
            Payments are handled by Stripe. LogoCut SVG does not store full
            card details.
          </p>
          <p>
            Uploaded files and generated SVGs are currently stored temporarily
            for processing. Do not upload confidential artwork.
          </p>
        </div>
      </section>
    </main>
  );
}
