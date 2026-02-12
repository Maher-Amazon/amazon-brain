import { getSupabaseServer } from "./supabase";
import type { Alert, BrandSummary } from "./supabase";

// Fetch all brands with their current and previous week data
export async function getBrandsWithWeeklyData(): Promise<BrandSummary[]> {
  const supabase = getSupabaseServer();

  // Fetch brands
  const { data: brands, error: brandsError } = await supabase
    .from("brands")
    .select("*")
    .order("name");

  if (brandsError || !brands) {
    console.error("Error fetching brands:", brandsError);
    return [];
  }

  // Fetch all brand_week data ordered by week_start descending
  const { data: allWeekData } = await supabase
    .from("brand_week")
    .select("*")
    .order("week_start", { ascending: false });

  // Fetch active alerts for all brands
  const { data: alerts } = await supabase
    .from("alerts")
    .select("*")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });

  // Combine the data - get the two most recent weeks for each brand
  return brands.map((brand) => {
    const brandWeeks = allWeekData?.filter((w) => w.brand_id === brand.id) || [];
    return {
      ...brand,
      currentWeek: brandWeeks[0] || null,
      previousWeek: brandWeeks[1] || null,
      alerts: alerts?.filter((a) => a.entity_id === brand.id && a.entity_type === "brand") || [],
    };
  });
}

// Fetch active alerts
export async function getActiveAlerts(): Promise<Alert[]> {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .is("resolved_at", null)
    .order("level", { ascending: true }) // critical first
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching alerts:", error);
    return [];
  }

  return data || [];
}

// Fetch weekly chart data (last 5 weeks)
export async function getWeeklyChartData(): Promise<
  { week: string; revenue: number; adSpend: number }[]
> {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("brand_week")
    .select("week_start, revenue_ex_vat, ad_spend")
    .order("week_start", { ascending: true })
    .limit(50);

  if (error || !data) {
    console.error("Error fetching weekly data:", error);
    return [];
  }

  // Aggregate by week across all brands
  const weeklyTotals = data.reduce(
    (acc, row) => {
      const week = row.week_start;
      if (!acc[week]) {
        acc[week] = { revenue: 0, adSpend: 0 };
      }
      acc[week].revenue += Number(row.revenue_ex_vat) || 0;
      acc[week].adSpend += Number(row.ad_spend) || 0;
      return acc;
    },
    {} as Record<string, { revenue: number; adSpend: number }>
  );

  // Convert to array and format week labels
  return Object.entries(weeklyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-5)
    .map(([weekStart, totals]) => {
      const date = new Date(weekStart);
      const month = date.toLocaleDateString("en-US", { month: "short" });
      const day = date.getDate();
      return {
        week: `${month} ${day}`,
        revenue: totals.revenue,
        adSpend: totals.adSpend,
      };
    });
}

// Fetch dashboard stats
export async function getDashboardStats() {
  const supabase = getSupabaseServer();

  const brands = await getBrandsWithWeeklyData();
  const alerts = await getActiveAlerts();
  const weeklyData = await getWeeklyChartData();

  // Count campaigns (check for both ENABLED and enabled)
  const { count: campaignCount } = await supabase
    .from("campaigns")
    .select("*", { count: "exact", head: true })
    .or("state.eq.enabled,state.eq.ENABLED");

  // Count SKUs
  const { count: skuCount } = await supabase
    .from("skus")
    .select("*", { count: "exact", head: true });

  // Count low stock alerts
  const lowStockCount = alerts.filter((a) => a.type === "stock").length;

  return {
    brands,
    alerts,
    weeklyData,
    activeCampaigns: campaignCount || 0,
    totalSkus: skuCount || 0,
    lowStockItems: lowStockCount,
  };
}

// Campaign type for the UI
export type CampaignDisplay = {
  id: string;
  campaign_id: string;
  name: string;
  brand: string;
  brand_id: string;
  type: string;
  targeting: string;
  state: string;
  budget: number;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos: number;
  acosTarget: number;
};

// Fetch campaigns with brand info
export async function getCampaigns(): Promise<CampaignDisplay[]> {
  const supabase = getSupabaseServer();

  // Fetch campaigns
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("name");

  if (error || !campaigns) {
    console.error("Error fetching campaigns:", error);
    return [];
  }

  // Fetch brands for mapping
  const { data: brands } = await supabase.from("brands").select("id, name, acos_target");

  const brandMap = new Map(brands?.map((b) => [b.id, b]) || []);

  return campaigns.map((campaign) => {
    const brand = brandMap.get(campaign.brand_id);
    return {
      id: campaign.id,
      campaign_id: campaign.campaign_id,
      name: campaign.name,
      brand: brand?.name || "Unknown",
      brand_id: campaign.brand_id,
      type: campaign.type || "SP",
      targeting: campaign.targeting_type || "Auto",
      state: campaign.state,
      budget: Number(campaign.budget) || 0,
      impressions: 0, // Would come from campaign_week if we had data
      clicks: 0,
      spend: 0,
      sales: 0,
      orders: 0,
      acos: 0,
      acosTarget: brand?.acos_target || 25,
    };
  });
}

// Product type for the UI
export type ProductDisplay = {
  id: string;
  sku: string;
  title: string;
  asin: string;
  brand: string;
  brand_id: string;
  revenue: number;
  units: number;
  stockLevel: number;
  stockDays: number;
  tacos: number;
  tacosTarget: number;
};

// Fetch products (SKUs) with their metrics
export async function getProducts(): Promise<ProductDisplay[]> {
  const supabase = getSupabaseServer();

  // Fetch SKUs
  const { data: skus, error } = await supabase
    .from("skus")
    .select("*")
    .order("sku");

  if (error || !skus) {
    console.error("Error fetching SKUs:", error);
    return [];
  }

  // Fetch brands
  const { data: brands } = await supabase.from("brands").select("id, name, tacos_target");
  const brandMap = new Map(brands?.map((b) => [b.id, b]) || []);

  // Fetch most recent week data for each SKU
  const { data: skuWeekData } = await supabase
    .from("sku_week")
    .select("*")
    .order("week_start", { ascending: false });

  // Group by sku_id and take the most recent
  type SkuWeekRow = NonNullable<typeof skuWeekData>[number];
  const skuWeekMap = new Map<string, SkuWeekRow>();
  skuWeekData?.forEach((s) => {
    if (!skuWeekMap.has(s.sku_id)) {
      skuWeekMap.set(s.sku_id, s);
    }
  });

  return skus.map((sku) => {
    const brand = brandMap.get(sku.brand_id);
    const weekData = skuWeekMap.get(sku.id);

    return {
      id: sku.id,
      sku: sku.sku,
      title: sku.title,
      asin: sku.asin,
      brand: brand?.name || "Unknown",
      brand_id: sku.brand_id,
      revenue: Number(weekData?.revenue_ex_vat) || 0,
      units: Number(weekData?.units) || 0,
      stockLevel: Number(weekData?.stock_level) || 0,
      stockDays: Number(weekData?.stock_days) || 0,
      tacos: Number(weekData?.tacos) || 0,
      tacosTarget: sku.tacos_override || brand?.tacos_target || 15,
    };
  });
}

// Fetch a single brand by ID with details
export async function getBrandById(id: string) {
  const supabase = getSupabaseServer();

  // Fetch brand
  const { data: brand, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !brand) {
    console.error("Error fetching brand:", error);
    return null;
  }

  // Fetch weekly data
  const { data: weekData } = await supabase
    .from("brand_week")
    .select("*")
    .eq("brand_id", id)
    .order("week_start", { ascending: false })
    .limit(10);

  // Fetch SKUs for this brand
  const { data: skus } = await supabase
    .from("skus")
    .select("*")
    .eq("brand_id", id);

  // Fetch campaigns for this brand
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("brand_id", id);

  return {
    ...brand,
    currentWeek: weekData?.[0] || null,
    previousWeek: weekData?.[1] || null,
    weeklyPerformance: weekData || [],
    skus: skus || [],
    campaigns: campaigns || [],
  };
}
