"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function UnsubscribeTracker() {
  useEffect(() => {
    trackEvent("marketing_unsubscribed", { source_page: "unsubscribe_page" });
  }, []);

  return null;
}
