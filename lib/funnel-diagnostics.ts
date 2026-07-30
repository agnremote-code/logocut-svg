type FunnelDiagnostic = {
  eventName: string;
  params: Record<string, unknown>;
  recordedAt: string;
};

declare global {
  interface Window {
    __logocutFunnelDiagnostics?: FunnelDiagnostic[];
  }
}

export function recordFunnelDiagnostic(
  eventName: string,
  params: Record<string, unknown>,
) {
  if (
    process.env.NODE_ENV !== "development" ||
    typeof window === "undefined"
  ) {
    return;
  }

  const diagnostic = {
    eventName,
    params,
    recordedAt: new Date().toISOString(),
  };
  const diagnostics = window.__logocutFunnelDiagnostics ?? [];

  window.__logocutFunnelDiagnostics = [...diagnostics.slice(-99), diagnostic];
  console.debug("[LogoCut funnel]", diagnostic);
}
