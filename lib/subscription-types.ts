export type SubscriptionStatus =
  | "inactive"
  | "checkout_pending"
  | "active"
  | "past_due"
  | "cancelled_until_period_end"
  | "expired";

export type SubscriptionProvider = "stripe";

export type SubscriberConversionStatus =
  | "reserved"
  | "processing"
  | "completed"
  | "failed"
  | "reversed";

export type SubscriberUser = {
  id: string;
  emailHash: string;
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
};

export type SubscriberSubscription = {
  id: string;
  userId: string;
  provider: SubscriptionProvider;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  monthlyConversionLimit: number;
  createdAt: string;
  updatedAt: string;
};

export type SubscriberUsageLedgerEntry = {
  id: string;
  userId: string;
  jobId: string;
  billingPeriodId: string;
  usageType: "complete_conversion";
  status: SubscriberConversionStatus;
  reservedAt: string;
  completedAt?: string;
  reversedAt?: string;
  reversalReason?: string;
  stripeEventId?: string;
};

export const SUBSCRIBER_RETENTION_POLICY = {
  originalDays: 30,
  generatedSvgDays: 90,
} as const;
