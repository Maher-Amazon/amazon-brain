import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Brand = {
  id: string;
  name: string;
  mode: string;
  tacos_target: number;
  acos_target: number;
  min_stock_days: number;
  created_at: string;
  updated_at: string;
};

export type Sku = {
  id: string;
  sku: string;
  asin: string;
  brand_id: string;
  title: string;
  mode_override: string | null;
  tacos_override: number | null;
  acos_override: number | null;
  min_stock_override: number | null;
  created_at: string;
  updated_at: string;
};

export type BrandWeek = {
  id: string;
  brand_id: string;
  week_start: string;
  revenue: number;
  revenue_ex_vat: number;
  units: number;
  orders: number;
  ad_spend: number;
  ad_sales: number;
  tacos: number;
  acos: number;
  impressions: number;
  clicks: number;
  created_at: string;
};

export type SkuWeek = {
  id: string;
  sku_id: string;
  week_start: string;
  revenue: number;
  revenue_ex_vat: number;
  units: number;
  ad_spend: number;
  ad_sales: number;
  tacos: number;
  acos: number;
  stock_level: number;
  stock_days: number;
  created_at: string;
};

export type CampaignWeek = {
  id: string;
  campaign_id: string;
  brand_id: string;
  week_start: string;
  name: string;
  type: string;
  state: string;
  budget: number;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos: number;
  created_at: string;
};

export type SearchTermWeek = {
  id: string;
  term: string;
  brand_id: string;
  campaign_id: string;
  week_start: string;
  impressions: number;
  clicks: number;
  orders: number;
  spend: number;
  sales: number;
  acos: number;
  created_at: string;
};

export type Decision = {
  id: string;
  entity_type: "brand" | "sku" | "campaign";
  entity_id: string;
  old_mode: string | null;
  new_mode: string;
  reason: string;
  created_by: string;
  created_at: string;
};

export type EventUae = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  impact_level: "high" | "medium" | "low";
  created_at: string;
};

export type GoalHistory = {
  id: string;
  entity_type: "account" | "brand" | "sku";
  entity_id: string | null;
  field: string;
  old_value: string | null;
  new_value: string;
  changed_by: string;
  changed_at: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "viewer";
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
};

export type Alert = {
  id: string;
  type: "stock" | "tacos" | "budget" | "general";
  entity_type: "brand" | "sku" | "campaign";
  entity_id: string;
  message: string;
  level: "critical" | "warning" | "info";
  sent_at: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type DashboardStats = {
  revenue: number;
  revenueChange: number;
  adSpend: number;
  adSpendChange: number;
  tacos: number;
  tacosChange: number;
  orders: number;
  ordersChange: number;
};

export type BrandSummary = Brand & {
  currentWeek: BrandWeek | null;
  previousWeek: BrandWeek | null;
  alerts: Alert[];
};
