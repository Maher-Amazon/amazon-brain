import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "AED"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function calculateTacos(adSpend: number, revenue: number): number {
  if (revenue === 0) return 0;
  return (adSpend / revenue) * 100;
}

export function calculateAcos(adSpend: number, adSales: number): number {
  if (adSales === 0) return 0;
  return (adSpend / adSales) * 100;
}

export function removeVat(amount: number, vatRate: number = 5): number {
  return amount / (1 + vatRate / 100);
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekLabel(date: Date): string {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
}

export function getChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function getSellerCentralUrl(
  type: "product" | "campaign" | "order",
  id: string
): string {
  const baseUrl = "https://sellercentral.amazon.ae";

  switch (type) {
    case "product":
      return `${baseUrl}/inventory/ref=xx_invfbayx_dnav_xx?asin=${id}`;
    case "campaign":
      return `${baseUrl}/advertising/campaign-management/campaigns/${id}`;
    case "order":
      return `${baseUrl}/orders-v3/order/${id}`;
    default:
      return baseUrl;
  }
}

export function simplifySkuName(sku: string): string {
  return sku;
}

export function simplifyCampaignName(name: string): string {
  return name
    .replace(/^SPDO-SMT-/i, "")
    .replace(/^SPDO-/i, "")
    .replace(/^SP-/i, "")
    .replace(/^SMT-/i, "");
}

export const MODES = [
  {
    id: "launch",
    name: "Launch",
    description: "New product launch - aggressive spending",
    color: "bg-purple-500",
  },
  {
    id: "growth",
    name: "Growth",
    description: "Scaling phase - balanced spending",
    color: "bg-blue-500",
  },
  {
    id: "profit",
    name: "Profit",
    description: "Optimize for profitability",
    color: "bg-green-500",
  },
  {
    id: "defend",
    name: "Defend",
    description: "Protect market position from competition",
    color: "bg-orange-500",
  },
  {
    id: "seasonal",
    name: "Seasonal",
    description: "Event-driven spending adjustment",
    color: "bg-yellow-500",
  },
  {
    id: "liquidate",
    name: "Liquidate",
    description: "Clear inventory quickly",
    color: "bg-red-500",
  },
  {
    id: "pause",
    name: "Pause",
    description: "Minimal or no advertising",
    color: "bg-gray-500",
  },
] as const;

export type Mode = (typeof MODES)[number]["id"];
