export const productConfig = {
  lockMarketingPreview: process.env.NEXT_PUBLIC_SUPERCLASS_UNLOCKED !== "true",
  analyticsEnabled: false,
  paymentsEnabled: false,
  provider: "deterministic-local",
} as const;
