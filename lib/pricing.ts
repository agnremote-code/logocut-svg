import { CutType } from "@/lib/job-types";

export type CutPrice = {
  amountCents: number;
  label: string;
  productName: string;
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

export function getCutPrice(cutType: CutType) {
  return prices[cutType];
}
