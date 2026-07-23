import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyRecoveryToken } from "@/lib/recovery-token";

type RecoveryPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function RecoveryPage({ params }: RecoveryPageProps) {
  const { token } = await params;
  const result = verifyRecoveryToken(token);

  if (result.ok) {
    redirect(`/result/${result.jobId}?recovery=${encodeURIComponent(token)}`);
  }

  return (
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-6 text-[#1f2520] sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col items-center justify-center text-center">
        <div className="rounded-[8px] border border-[#ddd8cc] bg-white p-6 shadow-[0_18px_60px_rgba(31,37,32,0.10)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
            Recovery link unavailable
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[#172017]">
            This download link is no longer valid
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#626a61]">
            The link may have expired or been changed. For help, contact
            support with your PayPal receipt.
          </p>
          <Link
            className="mt-6 inline-flex h-11 items-center rounded-[8px] bg-[#315f46] px-5 text-sm font-semibold text-white transition hover:bg-[#264d39]"
            href="/"
          >
            Start a new conversion
          </Link>
        </div>
      </section>
    </main>
  );
}
