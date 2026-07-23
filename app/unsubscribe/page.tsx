"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UnsubscribeTracker } from "@/components/unsubscribe-tracker";

type UnsubscribeState = "submitting" | "success" | "error";

export default function UnsubscribePage() {
  const started = useRef(false);
  const [state, setState] = useState<UnsubscribeState>("submitting");

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    const token = new URLSearchParams(hash).get("token");

    window.history.replaceState(null, "", "/unsubscribe");

    if (!token) {
      setState("error");
      return;
    }

    void fetch("/api/marketing/unsubscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
      referrerPolicy: "no-referrer",
    })
      .then((response) => {
        setState(response.ok ? "success" : "error");
      })
      .catch(() => {
        setState("error");
      });
  }, []);

  const success = state === "success";
  const title =
    state === "submitting"
      ? "Updating your preferences"
      : success
        ? "You’re unsubscribed"
        : "This unsubscribe link is not valid";
  const message =
    state === "submitting"
      ? "Please wait a moment."
      : success
        ? "You will no longer receive LogoCut discounts or product update emails."
        : "The link may be invalid or expired. Contact support if you need help.";

  return (
    <main className="min-h-screen bg-[#f7f5f0] px-4 py-10 text-[#1f2520] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-xl rounded-[8px] border border-[#ddd8cc] bg-white p-6 text-center shadow-[0_18px_60px_rgba(31,37,32,0.10)] sm:p-8">
        {success ? <UnsubscribeTracker /> : null}
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#657167]">
          LogoCut SVG
        </p>
        <span
          className={`mt-5 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
            success
              ? "bg-[#eef8f1] text-[#11683c]"
              : "bg-[#fff4f0] text-[#8a3426]"
          }`}
        >
          {state === "submitting"
            ? "Updating"
            : success
              ? "Unsubscribed"
              : "Needs attention"}
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
