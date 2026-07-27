type AnalyticsOutputType = "single" | "multi";
type AnalyticsProductType =
  | "single_svg"
  | "layered_svg"
  | "complete_pack";

type AnalyticsItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: 1;
  product_type: AnalyticsProductType;
  cut_type: AnalyticsOutputType;
};

const ANALYTICS_PARAM_KEYS = new Set([
  "cut_type",
  "product_type",
  "source_page",
  "source",
  "price",
  "file_type",
  "currency",
  "transaction_id",
  "sample",
  "position_bucket",
  "setting",
  "value",
  "view_mode",
  "preview_mode",
  "preview_failure_code",
  "background",
  "direction",
  "consent_source",
  "failure_reason",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "items",
]);

const PRODUCT_NAMES: Record<AnalyticsProductType, string> = {
  single_svg: "Single-Color SVG",
  layered_svg: "Layered SVG",
  complete_pack: "Complete SVG Pack",
};

function hasSensitiveText(value: string) {
  return (
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value) ||
    /%40/i.test(value) ||
    /(?:api[_-]?key|client[_-]?secret|service[_-]?role|bearer)\s*[:=]/i.test(
      value,
    )
  );
}

function sanitizeItem(value: unknown): AnalyticsItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<AnalyticsItem>;

  if (
    typeof item.item_id !== "string" ||
    typeof item.item_name !== "string" ||
    typeof item.price !== "number" ||
    item.quantity !== 1 ||
    !item.product_type ||
    !item.cut_type ||
    hasSensitiveText(item.item_id) ||
    hasSensitiveText(item.item_name)
  ) {
    return null;
  }

  return {
    item_id: item.item_id.slice(0, 100),
    item_name: item.item_name.slice(0, 100),
    price: item.price,
    quantity: 1,
    product_type: item.product_type,
    cut_type: item.cut_type,
  };
}

export function sanitizeAnalyticsParams(params: Record<string, unknown> = {}) {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (!ANALYTICS_PARAM_KEYS.has(key) || value === undefined) {
      continue;
    }

    if (key === "items" && Array.isArray(value)) {
      const items = value
        .map(sanitizeItem)
        .filter((item): item is AnalyticsItem => Boolean(item));

      if (items.length) {
        clean.items = items;
      }
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      clean[key] = value;
      continue;
    }

    if (
      typeof value === "string" &&
      value.length <= 256 &&
      !hasSensitiveText(value)
    ) {
      clean[key] = value;
    }
  }

  return clean;
}

export function createPurchaseAnalyticsParams(params: {
  transactionId: string;
  value: number;
  cutType: AnalyticsOutputType;
  productType: AnalyticsProductType;
}) {
  return {
    currency: "USD" as const,
    value: params.value,
    cut_type: params.cutType,
    product_type: params.productType,
    transaction_id: params.transactionId,
    items: [
      {
        item_id: params.productType,
        item_name: PRODUCT_NAMES[params.productType],
        price: params.value,
        quantity: 1 as const,
        product_type: params.productType,
        cut_type: params.cutType,
      },
    ],
  };
}
