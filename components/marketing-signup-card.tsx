"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type MarketingSignupSource = "preview_inline" | "post_purchase_result";

type Props = {
  source: MarketingSignupSource;
  compact?: boolean;
  onJoined?: () => void;
};

const JOINED_STORAGE_KEY = "logocut_marketing_joined";

function getUtmAttribution() {
  if (typeof window === "undefined") {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source") ?? undefined,
    medium: params.get("utm_medium") ?? undefined,
    campaign: params.get("utm_campaign") ?? undefined,
  };
}

export function hasJoinedMarketingList() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(JOINED_STORAGE_KEY) === "1";
}

export function MarketingSignupCard({ source, compact = false, onJoined }: Props) {
  const viewedRef = useRef(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "joined" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (viewedRef.current) {
      return;
    }

    viewedRef.current = true;
    trackEvent(
      source === "post_purchase_result"
        ? "post_purchase_marketing_capture_viewed"
        : "marketing_capture_viewed",
      { consent_source: source },
    );
  }, [source]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    trackEvent("marketing_email_submitted", { consent_source: source });

    if (!consent) {
      setStatus("error");
      setMessage("Please check the consent box to join the list.");
      trackEvent("marketing_signup_failed", {
        consent_source: source,
        failure_reason: "missing_consent",
      });
      return;
    }

    setStatus("submitting");

    try {
      const response = await fetch("/api/marketing/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          consent,
          source,
          utm: getUtmAttribution(),
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "signup_failed");
      }

      window.localStorage.setItem(JOINED_STORAGE_KEY, "1");
      setStatus("joined");
      setMessage("You’re on the list. We sent a confirmation if email is available.");
      trackEvent("marketing_opt_in_completed", { consent_source: source });
      onJoined?.();
    } catch {
      setStatus("error");
      setMessage("Could not join right now. PayPal checkout still works.");
      trackEvent("marketing_signup_failed", {
        consent_source: source,
        failure_reason: "request_failed",
      });
    }
  };

  return (
    <form
      className={`marketing-card ${compact ? "compact" : ""}`}
      onSubmit={submit}
      aria-label="Join the LogoCut email list"
    >
      <span className="marketing-badge">
        {source === "post_purchase_result" ? "GET FUTURE DISCOUNTS" : "GET LOGOCUT DEALS"}
      </span>
      <h3>
        {source === "post_purchase_result"
          ? "Save on your next SVG conversion"
          : "Get discounts on future SVG conversions"}
      </h3>
      <p>
        {source === "post_purchase_result"
          ? "Join the LogoCut list for future discounts and product updates."
          : "Join the LogoCut email list for occasional discounts, product updates and new features."}
      </p>
      <label className="sr-only" htmlFor={`marketing-email-${source}`}>
        Email address
      </label>
      <input
        id={`marketing-email-${source}`}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={status === "submitting" || status === "joined"}
      />
      <label className="marketing-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          disabled={status === "submitting" || status === "joined"}
        />
        <span>I agree to receive occasional LogoCut discounts and product updates.</span>
      </label>
      <div className="marketing-actions">
        <button
          type="submit"
          className="primary-button"
          disabled={status === "submitting" || status === "joined"}
        >
          {status === "submitting" ? "Joining..." : "Join the list"}
        </button>
        <small>
          No spam. Unsubscribe anytime.{" "}
          <Link href="/privacy">Privacy Policy</Link>
        </small>
      </div>
      {message ? (
        <p
          className={`marketing-message ${status === "joined" ? "success" : "error"}`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
