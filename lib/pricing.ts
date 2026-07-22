import {
  CutType,
  OneTimeProductType,
  ProductType,
  getDefaultProductTypeForOutput,
} from "@/lib/job-types";

export type CutPrice = {
  amountCents: number;
  label: string;
  productName: string;
};

export type SubscriptionPlan = {
  id: "logocut_unlimited";
  name: "LogoCut Unlimited";
  amountCents: number;
  interval: "month";
  label: "$19/month";
  monthlyConversionLimit: 25;
};

const prices: Record<CutType, CutPrice> = {
  single: {
    amountCents: 500,
    label: "$5",
    productName: "LogoCut SVG - Single-color cut",
  },
  multi: {
    amountCents: 900,
    label: "$9",
    productName: "LogoCut SVG - Multi-color layered cut",
  },
};

const oneTimePrices: Record<OneTimeProductType, CutPrice> = {
  single_svg: prices.single,
  layered_svg: prices.multi,
  complete_pack: {
    amountCents: 1200,
    label: "$12",
    productName: "LogoCut SVG - Complete SVG Pack",
  },
};

export const LOGOCUT_UNLIMITED_PLAN: SubscriptionPlan = {
  id: "logocut_unlimited",
  name: "LogoCut Unlimited",
  amountCents: 1900,
  interval: "month",
  label: "$19/month",
  monthlyConversionLimit: 25,
};

export function getCutPrice(cutType: CutType) {
  return prices[cutType];
}

export function getOneTimeProductPrice(productType: OneTimeProductType) {
  return oneTimePrices[productType];
}

export function getProductPrice(productType: ProductType) {
  if (productType === "unlimited_subscription") {
    return {
      amountCents: LOGOCUT_UNLIMITED_PLAN.amountCents,
      label: LOGOCUT_UNLIMITED_PLAN.label,
      productName: LOGOCUT_UNLIMITED_PLAN.name,
    };
  }

  return getOneTimeProductPrice(productType);
}

export function getOneTimeProductPriceForOutput(cutType: CutType) {
  return getOneTimeProductPrice(getDefaultProductTypeForOutput(cutType));
}
