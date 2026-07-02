import { CutPrice } from "@/lib/pricing";

type PayPalEnvironment = "sandbox" | "live";

type PayPalOrderResponse = {
  id?: string;
  status?: string;
  purchase_units?: PayPalPurchaseUnit[];
};

type PayPalPurchaseUnit = {
  reference_id?: string;
  custom_id?: string;
  amount?: {
    currency_code?: string;
    value?: string;
  };
  payments?: {
    captures?: Array<{
      id?: string;
      status?: string;
      amount?: {
        currency_code?: string;
        value?: string;
      };
    }>;
  };
};

export type PayPalCaptureResponse = {
  id?: string;
  status?: string;
  purchase_units?: PayPalPurchaseUnit[];
};

export type PayPalOrderDetailsResponse = PayPalOrderResponse;

export class PayPalNotConfiguredError extends Error {
  constructor() {
    super("PayPal is not configured");
    this.name = "PayPalNotConfiguredError";
  }
}

export class PayPalApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PayPalApiError";
    this.status = status;
  }
}

function getPayPalEnvironment(): PayPalEnvironment {
  const environment = process.env.PAYPAL_ENVIRONMENT?.trim() || "sandbox";

  if (environment === "sandbox" || environment === "live") {
    return environment;
  }

  throw new PayPalNotConfiguredError();
}

function getPayPalBaseUrl() {
  return getPayPalEnvironment() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getPayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new PayPalNotConfiguredError();
  }

  return { clientId, clientSecret };
}

function getUsdAmount(price: CutPrice) {
  return (price.amountCents / 100).toFixed(2);
}

async function getPayPalAccessToken() {
  const { clientId, clientSecret } = getPayPalCredentials();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
  } | null;

  if (!response.ok || !payload?.access_token) {
    throw new PayPalApiError("PayPal order creation failed", response.status);
  }

  return payload.access_token;
}

async function paypalRequest<T>({
  path,
  method,
  body,
  requestId,
  errorMessage,
}: {
  path: string;
  method: "GET" | "POST";
  body?: unknown;
  requestId?: string;
  errorMessage: string;
}) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok || !payload) {
    throw new PayPalApiError(errorMessage, response.status);
  }

  return payload;
}

export async function createPayPalOrder({
  jobId,
  price,
}: {
  jobId: string;
  price: CutPrice;
}) {
  const order = await paypalRequest<PayPalOrderResponse>({
    path: "/v2/checkout/orders",
    method: "POST",
    requestId: `logocut-create-${jobId}`,
    errorMessage: "PayPal order creation failed",
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: jobId,
          custom_id: jobId,
          description: price.productName,
          amount: {
            currency_code: "USD",
            value: getUsdAmount(price),
          },
        },
      ],
    },
  });

  if (!order.id) {
    throw new PayPalApiError("PayPal order creation failed", 502);
  }

  return order.id;
}

export async function getPayPalOrderDetails({
  orderId,
}: {
  orderId: string;
}) {
  return paypalRequest<PayPalOrderDetailsResponse>({
    path: `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    method: "GET",
    errorMessage: "PayPal order lookup failed",
  });
}

export async function capturePayPalOrder({
  orderId,
  jobId,
}: {
  orderId: string;
  jobId: string;
}) {
  return paypalRequest<PayPalCaptureResponse>({
    path: `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    method: "POST",
    requestId: `logocut-capture-${jobId}-${orderId}`,
    errorMessage: "PayPal capture failed",
  });
}

export function getExpectedPayPalAmount(price: CutPrice) {
  return getUsdAmount(price);
}

export function isPayPalNotConfiguredError(error: unknown) {
  return error instanceof PayPalNotConfiguredError;
}

export function isPayPalApiError(error: unknown) {
  return error instanceof PayPalApiError;
}
