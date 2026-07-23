import Link from "next/link";
import {
  unsubscribeMarketingContact,
  verifyUnsubscribeToken,
} from "@/lib/marketing";
import { UnsubscribeTracker } from "@/components/unsubscribe-tracker";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

export default async function UnsubscribePage({ params }: Props) {
  const { token } = await params;
  const verified = verifyUnsubscribeToken(token);
  let title = "You’re unsubscribed";
  let message =
    "You will no longer receive LogoCut discounts or product update emails.";
  let ok = verified.ok;

  if (!verified.ok) {
    title = "This unsubscribe link is not valid";
    message = verified.error;
  } else {
    try {
      await unsubscribeMarketingContact(verified.contactId);
    } catch {
      ok = false;
      title = "We could not update your preferences";
      message = "Please contact support and we’ll help unsubscribe you.";
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-10 text-[#1f2520] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-xl rounded-[8px] border border-[#ddd8cc] bg-white p-6 text-center shadow-[0_18px_60px_rgba(31,37,32,0.10)] sm:p-8">
        {ok ? <UnsubscribeTracker /> : null}
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
          LogoCut SVG
        </p>
        <span
          className={`mt-5 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
            ok ? "bg-[#eef8f1] text-[#11683c]" : "bg-[#fff4f0] text-[#8a3426]"
          }`}
        >
          {ok ? "Unsubscribed" : "Needs attention"}
        </span>
        <h1 className="mt-4 text-3xl font-semibold text-[#172017]">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-[#596158]">{message}</p>
        <Link
          className="mt-7 inline-flex h-11 items-center justify-center rounded-[8px] bg-[#315f46] px-5 text-sm font-semibold text-white transition hover:bg-[#264d39]"
          href="/"
        >
          Back to LogoCut
        </Link>
      </section>
    </main>
  );
}
