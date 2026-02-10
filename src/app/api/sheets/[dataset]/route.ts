import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

// API key for authentication (set in Vercel environment variables)
const API_KEY = process.env.SHEETS_API_KEY;

// Helper to validate API key
function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const key = authHeader.replace("Bearer ", "");
  return key === API_KEY;
}

// Helper to get week range parameters
function getWeekRange(request: NextRequest): { weeks: number; startDate?: string } {
  const url = new URL(request.url);
  const weeks = parseInt(url.searchParams.get("weeks") || "12", 10);
  const startDate = url.searchParams.get("start_date") || undefined;
  return { weeks, startDate };
}

// Dataset handlers
async function getCampaignWeek(supabase: ReturnType<typeof getSupabaseServer>, weeks: number) {
  const { data, error } = await supabase
    .from("campaign_week")
    .select(`
      id,
      week_start,
      impressions,
      clicks,
      spend,
      sales,
      orders,
      acos,
      campaigns!inner(
        id,
        campaign_id,
        name,
        type,
        state,
        brand_id,
        brands!inner(name)
      )
    `)
    .order("week_start", { ascending: false })
    .limit(weeks * 100); // Approximate limit

  if (error) throw error;

  return data?.map((row) => ({
    week_start: row.week_start,
    campaign_id: row.campaigns.campaign_id,
    campaign_name: row.campaigns.name,
    type: row.campaigns.type,
    state: row.campaigns.state,
    brand_name: row.campaigns.brands.name,
    impressions: row.impressions,
    clicks: row.clicks,
    spend: row.spend,
    sales: row.sales,
    orders: row.orders,
    acos: row.acos,
    ctr: row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : 0,
    cpc: row.clicks > 0 ? (row.spend / row.clicks).toFixed(2) : 0,
  })) || [];
}

async function getSearchTermWeek(supabase: ReturnType<typeof getSupabaseServer>, weeks: number) {
  const { data, error } = await supabase
    .from("searchterm_week")
    .select(`
      id,
      term,
      week_start,
      impressions,
      clicks,
      orders,
      spend,
      sales,
      acos,
      brands(name),
      campaigns(name, campaign_id)
    `)
    .order("week_start", { ascending: false })
    .limit(weeks * 500);

  if (error) throw error;

  return data?.map((row) => ({
    week_start: row.week_start,
    term: row.term,
    brand_name: row.brands?.name || "",
    campaign_name: row.campaigns?.name || "",
    impressions: row.impressions,
    clicks: row.clicks,
    orders: row.orders,
    spend: row.spend,
    sales: row.sales,
    acos: row.acos,
    cvr: row.clicks > 0 ? ((row.orders / row.clicks) * 100).toFixed(2) : 0,
  })) || [];
}

async function getTargetAsinWeek(supabase: ReturnType<typeof getSupabaseServer>, weeks: number) {
  const { data, error } = await supabase
    .from("target_asin_week")
    .select(`
      id,
      target_asin,
      ad_type,
      week_start,
      impressions,
      clicks,
      spend,
      sales,
      orders,
      acos,
      brands(name),
      campaigns(name, campaign_id)
    `)
    .order("week_start", { ascending: false })
    .limit(weeks * 200);

  if (error) throw error;

  return data?.map((row) => ({
    week_start: row.week_start,
    target_asin: row.target_asin,
    ad_type: row.ad_type,
    brand_name: row.brands?.name || "",
    campaign_name: row.campaigns?.name || "",
    impressions: row.impressions,
    clicks: row.clicks,
    orders: row.orders,
    spend: row.spend,
    sales: row.sales,
    acos: row.acos,
  })) || [];
}

async function getAsinWeek(supabase: ReturnType<typeof getSupabaseServer>, weeks: number) {
  const { data, error } = await supabase
    .from("sku_week")
    .select(`
      id,
      week_start,
      revenue,
      revenue_ex_vat,
      units,
      ad_spend,
      ad_sales,
      tacos,
      acos,
      stock_level,
      stock_days,
      skus!inner(
        sku,
        asin,
        title,
        brands!inner(name)
      )
    `)
    .order("week_start", { ascending: false })
    .limit(weeks * 100);

  if (error) throw error;

  return data?.map((row) => ({
    week_start: row.week_start,
    asin: row.skus.asin,
    sku: row.skus.sku,
    title: row.skus.title,
    brand_name: row.skus.brands.name,
    revenue: row.revenue,
    revenue_ex_vat: row.revenue_ex_vat,
    units: row.units,
    ad_spend: row.ad_spend,
    ad_sales: row.ad_sales,
    tacos: row.tacos,
    acos: row.acos,
    stock_level: row.stock_level,
    stock_days: row.stock_days,
  })) || [];
}

async function getBrandWeek(supabase: ReturnType<typeof getSupabaseServer>, weeks: number) {
  const { data, error } = await supabase
    .from("brand_week")
    .select(`
      id,
      week_start,
      revenue,
      revenue_ex_vat,
      units,
      orders,
      ad_spend,
      ad_sales,
      tacos,
      acos,
      impressions,
      clicks,
      brands!inner(name, mode, tacos_target, acos_target)
    `)
    .order("week_start", { ascending: false })
    .limit(weeks * 20);

  if (error) throw error;

  return data?.map((row) => ({
    week_start: row.week_start,
    brand_name: row.brands.name,
    mode: row.brands.mode,
    tacos_target: row.brands.tacos_target,
    acos_target: row.brands.acos_target,
    revenue: row.revenue,
    revenue_ex_vat: row.revenue_ex_vat,
    units: row.units,
    orders: row.orders,
    ad_spend: row.ad_spend,
    ad_sales: row.ad_sales,
    tacos: row.tacos,
    acos: row.acos,
    impressions: row.impressions,
    clicks: row.clicks,
  })) || [];
}

async function getConfig(supabase: ReturnType<typeof getSupabaseServer>) {
  const { data, error } = await supabase
    .from("account_settings")
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function getBrands(supabase: ReturnType<typeof getSupabaseServer>) {
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, mode, tacos_target, acos_target, min_stock_days")
    .order("name");

  if (error) throw error;
  return data || [];
}

async function getCampaigns(supabase: ReturnType<typeof getSupabaseServer>) {
  const { data, error } = await supabase
    .from("campaigns")
    .select(`
      id,
      campaign_id,
      name,
      type,
      state,
      budget,
      targeting_type,
      brands!inner(name)
    `)
    .order("name");

  if (error) throw error;

  return data?.map((row) => ({
    id: row.id,
    campaign_id: row.campaign_id,
    name: row.name,
    type: row.type,
    state: row.state,
    budget: row.budget,
    targeting_type: row.targeting_type,
    brand_name: row.brands.name,
  })) || [];
}

async function getCampaignFlags(supabase: ReturnType<typeof getSupabaseServer>) {
  const { data, error } = await supabase
    .from("campaign_flags")
    .select(`
      id,
      flag,
      reason,
      created_at,
      campaigns!inner(campaign_id, name)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data?.map((row) => ({
    campaign_id: row.campaigns.campaign_id,
    campaign_name: row.campaigns.name,
    flag: row.flag,
    reason: row.reason,
    created_at: row.created_at,
  })) || [];
}

async function getEvents(supabase: ReturnType<typeof getSupabaseServer>) {
  const { data, error } = await supabase
    .from("events_uae")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getPromos(supabase: ReturnType<typeof getSupabaseServer>) {
  const { data, error } = await supabase
    .from("promos_tracker")
    .select(`
      id,
      asin,
      promo_type,
      discount_percent,
      discount_amount,
      start_date,
      end_date,
      status,
      notes,
      skus(sku, title, brands(name))
    `)
    .order("start_date", { ascending: false });

  if (error) throw error;

  return data?.map((row) => ({
    asin: row.asin,
    sku: row.skus?.sku || "",
    title: row.skus?.title || "",
    brand_name: row.skus?.brands?.name || "",
    promo_type: row.promo_type,
    discount_percent: row.discount_percent,
    discount_amount: row.discount_amount,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    notes: row.notes,
  })) || [];
}

async function getWeeklyNotes(supabase: ReturnType<typeof getSupabaseServer>, weeks: number) {
  const { data, error } = await supabase
    .from("weekly_notes")
    .select(`
      id,
      week_start,
      note,
      category,
      created_at,
      brands(name)
    `)
    .order("week_start", { ascending: false })
    .limit(weeks * 10);

  if (error) throw error;

  return data?.map((row) => ({
    week_start: row.week_start,
    brand_name: row.brands?.name || "Account",
    note: row.note,
    category: row.category,
    created_at: row.created_at,
  })) || [];
}

async function getDecisions(supabase: ReturnType<typeof getSupabaseServer>, weeks: number) {
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(weeks * 20);

  if (error) throw error;
  return data || [];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset: string }> }
) {
  // Validate API key
  if (API_KEY && !validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dataset } = await params;
  const { weeks } = getWeekRange(request);
  const supabase = getSupabaseServer();

  try {
    let data: unknown;

    switch (dataset) {
      case "campaign-week":
        data = await getCampaignWeek(supabase, weeks);
        break;
      case "searchterm-week":
        data = await getSearchTermWeek(supabase, weeks);
        break;
      case "target-asin-week":
        data = await getTargetAsinWeek(supabase, weeks);
        break;
      case "asin-week":
        data = await getAsinWeek(supabase, weeks);
        break;
      case "brand-week":
        data = await getBrandWeek(supabase, weeks);
        break;
      case "config":
        data = await getConfig(supabase);
        break;
      case "brands":
        data = await getBrands(supabase);
        break;
      case "campaigns":
        data = await getCampaigns(supabase);
        break;
      case "campaign-flags":
        data = await getCampaignFlags(supabase);
        break;
      case "events":
        data = await getEvents(supabase);
        break;
      case "promos":
        data = await getPromos(supabase);
        break;
      case "weekly-notes":
        data = await getWeeklyNotes(supabase, weeks);
        break;
      case "decisions":
        data = await getDecisions(supabase, weeks);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown dataset: ${dataset}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      dataset,
      updated_at: new Date().toISOString(),
      count: Array.isArray(data) ? data.length : 1,
      data,
    });
  } catch (error) {
    console.error(`Error fetching ${dataset}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
