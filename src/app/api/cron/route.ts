import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Vercel Cron configuration
export const runtime = "edge";
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  // Verify cron secret (for Vercel Cron)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check for strategic report (every 5 days)
    await checkStrategicReport(supabase);

    // 2. Check for stock alerts
    await checkStockAlerts(supabase);

    // 3. Check for TACoS alerts
    await checkTacosAlerts(supabase);

    // 4. Clean up old resolved alerts (older than 30 days)
    await cleanupOldAlerts(supabase);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

async function checkStrategicReport(supabase: AnySupabaseClient) {
  // Get account settings
  const { data: settings } = await supabase
    .from("account_settings")
    .select("*")
    .single();

  if (!settings) return;

  // Check if it's time for a strategic report (every 5 days)
  const lastReportDate = settings.last_strategic_report;
  const daysSinceReport = lastReportDate
    ? Math.floor(
        (Date.now() - new Date(lastReportDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 999;

  if (daysSinceReport >= 5) {
    // Generate and send strategic report
    await generateStrategicReport(supabase);

    // Update last report date
    await supabase
      .from("account_settings")
      .update({ last_strategic_report: new Date().toISOString() })
      .eq("id", settings.id);
  }
}

async function generateStrategicReport(supabase: AnySupabaseClient) {
  // Get current and previous week data
  const weekStart = getWeekStart(new Date()).toISOString().split("T")[0];
  const prevWeekStart = getWeekStart(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  )
    .toISOString()
    .split("T")[0];

  const { data: currentWeek } = await supabase
    .from("brand_week")
    .select("*, brands(*)")
    .eq("week_start", weekStart);

  const { data: previousWeek } = await supabase
    .from("brand_week")
    .select("*, brands(*)")
    .eq("week_start", prevWeekStart);

  // Get upcoming UAE events
  const { data: upcomingEvents } = await supabase
    .from("events_uae")
    .select("*")
    .gte("start_date", new Date().toISOString().split("T")[0])
    .order("start_date", { ascending: true })
    .limit(3);

  // Get low stock items
  const { data: lowStockItems } = await supabase
    .from("sku_week")
    .select("*, skus(sku, title)")
    .eq("week_start", weekStart)
    .lt("stock_days", 14);

  // Build report content
  const report = {
    subject: `Amazon Brain Strategic Report - ${new Date().toLocaleDateString()}`,
    analysis: buildAnalysisSection(currentWeek || [], previousWeek || []),
    suggestions: buildSuggestionsSection(currentWeek || [], lowStockItems || []),
    tips: buildTipsSection(upcomingEvents || []),
  };

  // Send email via Resend
  if (process.env.RESEND_API_KEY) {
    await sendEmail(report);
  }
}

function buildAnalysisSection(
  currentWeek: Record<string, unknown>[],
  previousWeek: Record<string, unknown>[]
): string {
  let analysis = "## What Happened This Week\n\n";

  const totalRevenue = currentWeek.reduce(
    (sum, b) => sum + (b.revenue_ex_vat as number || 0),
    0
  );
  const prevRevenue = previousWeek.reduce(
    (sum, b) => sum + (b.revenue_ex_vat as number || 0),
    0
  );
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  const totalAdSpend = currentWeek.reduce(
    (sum, b) => sum + (b.ad_spend as number || 0),
    0
  );
  const prevAdSpend = previousWeek.reduce(
    (sum, b) => sum + (b.ad_spend as number || 0),
    0
  );
  const adSpendChange = prevAdSpend > 0 ? ((totalAdSpend - prevAdSpend) / prevAdSpend) * 100 : 0;

  analysis += `- **Revenue**: AED ${totalRevenue.toLocaleString()} (${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs last week)\n`;
  analysis += `- **Ad Spend**: AED ${totalAdSpend.toLocaleString()} (${adSpendChange >= 0 ? "+" : ""}${adSpendChange.toFixed(1)}% vs last week)\n`;

  return analysis;
}

function buildSuggestionsSection(
  currentWeek: Record<string, unknown>[],
  lowStockItems: Record<string, unknown>[]
): string {
  let suggestions = "## Suggestions\n\n";

  // Mode change suggestions based on performance
  for (const brand of currentWeek) {
    const brandInfo = brand.brands as Record<string, unknown>;
    const tacos = brand.tacos as number || 0;
    const tacosTarget = brandInfo?.tacos_target as number || 15;

    if (tacos > tacosTarget * 1.2) {
      suggestions += `- **${brandInfo?.name}**: TACoS at ${tacos.toFixed(1)}% (target: ${tacosTarget}%). Consider reducing ad spend or switching to Profit mode.\n`;
    }
  }

  // Stock alerts
  if (lowStockItems.length > 0) {
    suggestions += `- **Reorder Alert**: ${lowStockItems.length} SKU(s) need reordering soon.\n`;
  }

  return suggestions || "## Suggestions\n\nNo immediate actions needed.\n";
}

function buildTipsSection(upcomingEvents: Record<string, unknown>[]): string {
  let tips = "## Tips & Upcoming Events\n\n";

  for (const event of upcomingEvents) {
    const startDate = new Date(event.start_date as string).toLocaleDateString();
    tips += `- **${event.name}** (${startDate}): ${event.impact_level} impact expected. ${event.description || ""}\n`;
  }

  if (upcomingEvents.length === 0) {
    tips += "No major events in the next 30 days.\n";
  }

  return tips;
}

async function sendEmail(report: {
  subject: string;
  analysis: string;
  suggestions: string;
  tips: string;
}) {
  const emailBody = `
${report.analysis}

${report.suggestions}

${report.tips}

---
Amazon Brain - Your Seller Analytics Dashboard
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Amazon Brain <noreply@yourdomain.com>",
      to: process.env.EMAIL_TO?.split(",") || [],
      subject: report.subject,
      text: emailBody,
    }),
  });

  if (!response.ok) {
    console.error("Failed to send email:", await response.text());
  }
}

async function checkStockAlerts(supabase: AnySupabaseClient) {
  const weekStart = getWeekStart(new Date()).toISOString().split("T")[0];

  // Get SKUs with low stock
  const { data: lowStockItems } = await supabase
    .from("sku_week")
    .select("sku_id, stock_days, skus(sku, title, min_stock_override, brand_id)")
    .eq("week_start", weekStart)
    .lt("stock_days", 14);

  for (const item of lowStockItems || []) {
    const skuInfo = item.skus as unknown as Record<string, unknown>;
    const stockDays = item.stock_days as number;

    // Check if alert already exists
    const { data: existingAlert } = await supabase
      .from("alerts")
      .select("id")
      .eq("entity_type", "sku")
      .eq("entity_id", item.sku_id)
      .eq("type", "stock")
      .is("resolved_at", null)
      .single();

    if (!existingAlert) {
      await supabase.from("alerts").insert({
        type: "stock",
        entity_type: "sku",
        entity_id: item.sku_id,
        message: `${skuInfo?.sku} has ${Math.round(stockDays)} days of stock remaining`,
        level: stockDays < 7 ? "critical" : "warning",
      });
    }
  }
}

async function checkTacosAlerts(supabase: AnySupabaseClient) {
  const weekStart = getWeekStart(new Date()).toISOString().split("T")[0];

  // Get brands with TACoS over target
  const { data: brandWeeks } = await supabase
    .from("brand_week")
    .select("brand_id, tacos, brands(name, tacos_target)")
    .eq("week_start", weekStart);

  for (const brandWeek of brandWeeks || []) {
    const brandInfo = brandWeek.brands as unknown as Record<string, unknown>;
    const tacos = brandWeek.tacos as number || 0;
    const tacosTarget = brandInfo?.tacos_target as number || 15;

    if (tacos > tacosTarget) {
      // Check if alert already exists
      const { data: existingAlert } = await supabase
        .from("alerts")
        .select("id")
        .eq("entity_type", "brand")
        .eq("entity_id", brandWeek.brand_id)
        .eq("type", "tacos")
        .is("resolved_at", null)
        .single();

      if (!existingAlert) {
        const overBy = (tacos - tacosTarget).toFixed(1);
        await supabase.from("alerts").insert({
          type: "tacos",
          entity_type: "brand",
          entity_id: brandWeek.brand_id,
          message: `${brandInfo?.name} TACoS at ${tacos.toFixed(1)}% - exceeds ${tacosTarget}% target by ${overBy}%`,
          level: tacos > tacosTarget * 1.5 ? "critical" : "warning",
        });
      }
    }
  }
}

async function cleanupOldAlerts(supabase: AnySupabaseClient) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString();

  await supabase
    .from("alerts")
    .delete()
    .not("resolved_at", "is", null)
    .lt("resolved_at", thirtyDaysAgo);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
