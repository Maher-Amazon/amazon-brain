import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export async function POST(request: NextRequest) {
  try {
    // Verify authorization (simple API key check)
    const authHeader = request.headers.get("authorization");
    const expectedKey = process.env.SYNC_API_KEY;

    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case "orders":
        return await syncOrders(supabase, data);
      case "inventory":
        return await syncInventory(supabase, data);
      case "ads":
        return await syncAds(supabase, data);
      case "campaigns":
        return await syncCampaigns(supabase, data);
      default:
        return NextResponse.json(
          { error: `Unknown sync type: ${type}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function syncOrders(supabase: AnySupabaseClient, data: unknown[]) {
  // Process orders and update brand_week / sku_week tables
  const weekStart = getWeekStart(new Date()).toISOString().split("T")[0];

  // Group orders by brand/SKU and aggregate
  const brandAggregates: Record<
    string,
    { revenue: number; units: number; orders: number }
  > = {};
  const skuAggregates: Record<
    string,
    { revenue: number; units: number }
  > = {};

  for (const order of data as Record<string, unknown>[]) {
    const brandId = order.brand_id as string;
    const skuId = order.sku_id as string;
    const total = order.total as number;
    const units = order.units as number;

    if (brandId) {
      if (!brandAggregates[brandId]) {
        brandAggregates[brandId] = { revenue: 0, units: 0, orders: 0 };
      }
      brandAggregates[brandId].revenue += total;
      brandAggregates[brandId].units += units;
      brandAggregates[brandId].orders += 1;
    }

    if (skuId) {
      if (!skuAggregates[skuId]) {
        skuAggregates[skuId] = { revenue: 0, units: 0 };
      }
      skuAggregates[skuId].revenue += total;
      skuAggregates[skuId].units += units;
    }
  }

  // Upsert brand weekly data
  for (const [brandId, agg] of Object.entries(brandAggregates)) {
    const revenueExVat = agg.revenue / 1.05; // Remove 5% VAT
    const { error } = await supabase.from("brand_week").upsert(
      {
        brand_id: brandId,
        week_start: weekStart,
        revenue: agg.revenue,
        revenue_ex_vat: revenueExVat,
        units: agg.units,
        orders: agg.orders,
      },
      { onConflict: "brand_id,week_start" }
    );
    if (error) console.error("Brand week upsert error:", error);
  }

  // Upsert SKU weekly data
  for (const [skuId, agg] of Object.entries(skuAggregates)) {
    const revenueExVat = agg.revenue / 1.05;
    const { error } = await supabase.from("sku_week").upsert(
      {
        sku_id: skuId,
        week_start: weekStart,
        revenue: agg.revenue,
        revenue_ex_vat: revenueExVat,
        units: agg.units,
      },
      { onConflict: "sku_id,week_start" }
    );
    if (error) console.error("SKU week upsert error:", error);
  }

  // Update last sync time
  await supabase
    .from("account_settings")
    .update({ last_sync_at: new Date().toISOString() })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  return NextResponse.json({
    success: true,
    processed: {
      brands: Object.keys(brandAggregates).length,
      skus: Object.keys(skuAggregates).length,
    },
  });
}

async function syncInventory(supabase: AnySupabaseClient, data: unknown[]) {
  const weekStart = getWeekStart(new Date()).toISOString().split("T")[0];

  for (const item of data as Record<string, unknown>[]) {
    const { sku, stock_level, sales_velocity } = item as {
      sku: string;
      stock_level: number;
      sales_velocity: number;
    };

    // Find SKU ID
    const { data: skuData } = await supabase
      .from("skus")
      .select("id")
      .eq("sku", sku)
      .single();

    if (skuData) {
      const stockDays =
        sales_velocity > 0 ? stock_level / sales_velocity : 999;

      await supabase.from("sku_week").upsert(
        {
          sku_id: skuData.id,
          week_start: weekStart,
          stock_level,
          stock_days: stockDays,
        },
        { onConflict: "sku_id,week_start" }
      );

      // Check for low stock alert
      const { data: skuInfo } = await supabase
        .from("skus")
        .select("min_stock_override, brand_id")
        .eq("id", skuData.id)
        .single();

      const { data: brandInfo } = await supabase
        .from("brands")
        .select("min_stock_days")
        .eq("id", skuInfo?.brand_id)
        .single();

      const threshold =
        skuInfo?.min_stock_override || brandInfo?.min_stock_days || 14;

      if (stockDays < threshold) {
        // Create stock alert
        await supabase.from("alerts").insert({
          type: "stock",
          entity_type: "sku",
          entity_id: skuData.id,
          message: `${sku} has ${Math.round(stockDays)} days of stock remaining`,
          level: stockDays < 7 ? "critical" : "warning",
        });
      }
    }
  }

  return NextResponse.json({ success: true, processed: data.length });
}

async function syncAds(supabase: AnySupabaseClient, data: unknown[]) {
  const weekStart = getWeekStart(new Date()).toISOString().split("T")[0];

  // Group by campaign
  const campaignAggregates: Record<
    string,
    {
      impressions: number;
      clicks: number;
      spend: number;
      sales: number;
      orders: number;
    }
  > = {};

  for (const row of data as Record<string, unknown>[]) {
    const campaignId = row.campaign_id as string;
    if (!campaignAggregates[campaignId]) {
      campaignAggregates[campaignId] = {
        impressions: 0,
        clicks: 0,
        spend: 0,
        sales: 0,
        orders: 0,
      };
    }
    campaignAggregates[campaignId].impressions += row.impressions as number || 0;
    campaignAggregates[campaignId].clicks += row.clicks as number || 0;
    campaignAggregates[campaignId].spend += row.spend as number || 0;
    campaignAggregates[campaignId].sales += row.sales as number || 0;
    campaignAggregates[campaignId].orders += row.orders as number || 0;
  }

  // Upsert campaign weekly data
  for (const [campaignId, agg] of Object.entries(campaignAggregates)) {
    const acos = agg.sales > 0 ? (agg.spend / agg.sales) * 100 : 0;

    await supabase.from("campaign_week").upsert(
      {
        campaign_id: campaignId,
        week_start: weekStart,
        impressions: agg.impressions,
        clicks: agg.clicks,
        spend: agg.spend,
        sales: agg.sales,
        orders: agg.orders,
        acos,
      },
      { onConflict: "campaign_id,week_start" }
    );
  }

  // Calculate brand-level ad metrics
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, brand_id");

  const brandAdSpend: Record<string, { spend: number; sales: number }> = {};

  for (const campaign of campaigns || []) {
    const agg = campaignAggregates[campaign.id];
    if (agg && campaign.brand_id) {
      if (!brandAdSpend[campaign.brand_id]) {
        brandAdSpend[campaign.brand_id] = { spend: 0, sales: 0 };
      }
      brandAdSpend[campaign.brand_id].spend += agg.spend;
      brandAdSpend[campaign.brand_id].sales += agg.sales;
    }
  }

  // Update brand_week with ad metrics
  for (const [brandId, metrics] of Object.entries(brandAdSpend)) {
    const { data: existing } = await supabase
      .from("brand_week")
      .select("revenue")
      .eq("brand_id", brandId)
      .eq("week_start", weekStart)
      .single();

    const revenue = existing?.revenue || 0;
    const tacos = revenue > 0 ? (metrics.spend / revenue) * 100 : 0;
    const acos = metrics.sales > 0 ? (metrics.spend / metrics.sales) * 100 : 0;

    await supabase.from("brand_week").upsert(
      {
        brand_id: brandId,
        week_start: weekStart,
        ad_spend: metrics.spend,
        ad_sales: metrics.sales,
        tacos,
        acos,
      },
      { onConflict: "brand_id,week_start" }
    );
  }

  return NextResponse.json({
    success: true,
    processed: Object.keys(campaignAggregates).length,
  });
}

async function syncCampaigns(supabase: AnySupabaseClient, data: unknown[]) {
  for (const campaign of data as Record<string, unknown>[]) {
    await supabase.from("campaigns").upsert(
      {
        campaign_id: campaign.campaign_id,
        brand_id: campaign.brand_id,
        name: campaign.name,
        type: campaign.type || "SP",
        state: campaign.state,
        budget: campaign.budget,
        targeting_type: campaign.targeting_type,
      },
      { onConflict: "campaign_id" }
    );
  }

  return NextResponse.json({ success: true, processed: data.length });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
