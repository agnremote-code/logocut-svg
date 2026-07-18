"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { CutType } from "@/lib/job-types";
import { trackEvent } from "@/lib/analytics";

type PayPalButtons = { render: (container: HTMLElement) => Promise<void> };
type PayPalOptions = {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID?: string }) => Promise<void>;
  onCancel: () => void;
  onError: () => void;
  style: { color: "gold"; label: "paypal"; layout: "vertical"; shape: "rect" };
};

declare global {
  interface Window {
    paypal?: { Buttons: (options: PayPalOptions) => PayPalButtons };
  }
}

export function PayPalCheckout({ jobId, cutType }: { jobId: string; cutType: CutType }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const sdkUrl = clientId
    ? `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons`
    : "";

  useEffect(() => {
    if (window.paypal) setSdkReady(true);
    if (!viewedRef.current) {
      viewedRef.current = true;
      trackEvent("checkout_viewed", { cut_type: cutType, source_page: "conversion_studio" });
    }
  }, [cutType]);

  useEffect(() => {
    if (!sdkReady || !window.paypal || !containerRef.current || !jobId) return;
    const container = containerRef.current;
    let active = true;
    container.innerHTML = "";

    const buttons = window.paypal.Buttons({
      style: { color: "gold", label: "paypal", layout: "vertical", shape: "rect" },
      createOrder: async () => {
        setProcessing(true);
        setError("");
        const response = await fetch("/api/paypal/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, cutType }),
        });
        const payload = (await response.json()) as { orderId?: string; error?: string };
        if (!response.ok || !payload.orderId) {
          setProcessing(false);
          throw new Error(payload.error ?? "PayPal order creation failed");
        }
        trackEvent("paypal_order_created", {
          cut_type: cutType,
          source_page: "conversion_studio",
          value: cutType === "multi" ? 9 : 5,
          currency: "USD",
        });
        return payload.orderId;
      },
      onApprove: async ({ orderID }) => {
        if (!orderID) {
          setProcessing(false);
          setError("Payment confirmation could not be completed.");
          return;
        }
        const response = await fetch(`/api/paypal/orders/${orderID}/capture`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });
        const payload = (await response.json()) as {
          resultUrl?: string;
          processingUrl?: string;
          error?: string;
        };
        if (!response.ok) {
          setProcessing(false);
          throw new Error(payload.error ?? "Payment confirmation failed");
        }
        window.location.href = payload.resultUrl ?? payload.processingUrl ?? `/result/${jobId}`;
      },
      onCancel: () => setProcessing(false),
      onError: () => {
        if (!active) return;
        setProcessing(false);
        setError("PayPal could not be loaded. Please try again.");
      },
    });

    buttons.render(container).catch(() => {
      if (active) setError("PayPal could not be loaded. Please try again.");
    });
    return () => {
      active = false;
      container.innerHTML = "";
    };
  }, [cutType, jobId, sdkReady]);

  if (!clientId) {
    return <p className="checkout-error">PayPal is temporarily unavailable.</p>;
  }

  return (
    <div className="studio-paypal" aria-label="PayPal checkout">
      <Script src={sdkUrl} strategy="afterInteractive" onLoad={() => setSdkReady(true)} />
      <div ref={containerRef} className="paypal-button-slot" />
      {processing ? <p role="status">Confirming payment…</p> : null}
      {error ? <p className="checkout-error" role="alert">{error}</p> : null}
    </div>
  );
}
