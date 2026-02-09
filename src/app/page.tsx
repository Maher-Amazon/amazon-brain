"use client";

import { DollarSign, TrendingUp, ShoppingCart, Percent } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AlertsSection } from "@/components/dashboard/alerts-section";
import { BrandsTable } from "@/components/dashboard/brands-table";
import { WeekComparisonChart } from "@/components/charts/week-comparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { Alert, BrandSummary } from "@/lib/supabase";

// Sample data - will be replaced with real data from Supabase
const sampleAlerts: Alert[] = [
  {
    id: "1",
    type: "stock",
    entity_type: "sku",
    entity_id: "sku-1",
    message: "WP-VAC-02 has only 5 days of stock remaining at current sales velocity",
    level: "critical",
    sent_at: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    type: "tacos",
    entity_type: "brand",
    entity_id: "brand-1",
    message: "Waterpik TACoS at 18.5% - exceeds 15% target by 3.5%",
    level: "warning",
    sent_at: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    type: "budget",
    entity_type: "campaign",
    entity_id: "campaign-1",
    message: "Budget capped on 3 campaigns - consider increasing daily budget",
    level: "info",
    sent_at: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
  },
];

const sampleBrands: BrandSummary[] = [
  {
    id: "1",
    name: "Waterpik",
    mode: "growth",
    tacos_target: 15,
    acos_target: 25,
    min_stock_days: 14,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    currentWeek: {
      id: "1",
      brand_id: "1",
      week_start: "2024-02-05",
      revenue: 28500,
      revenue_ex_vat: 27143,
      units: 142,
      orders: 138,
      ad_spend: 5025,
      ad_sales: 18500,
      tacos: 18.5,
      acos: 27.2,
      impressions: 450000,
      clicks: 8500,
      created_at: new Date().toISOString(),
    },
    previousWeek: {
      id: "2",
      brand_id: "1",
      week_start: "2024-01-29",
      revenue: 25200,
      revenue_ex_vat: 24000,
      units: 126,
      orders: 122,
      ad_spend: 4500,
      ad_sales: 16200,
      tacos: 17.8,
      acos: 27.8,
      impressions: 410000,
      clicks: 7800,
      created_at: new Date().toISOString(),
    },
    alerts: [sampleAlerts[0], sampleAlerts[1]],
  },
  {
    id: "2",
    name: "Jabra",
    mode: "profit",
    tacos_target: 12,
    acos_target: 20,
    min_stock_days: 14,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    currentWeek: {
      id: "3",
      brand_id: "2",
      week_start: "2024-02-05",
      revenue: 45200,
      revenue_ex_vat: 43048,
      units: 89,
      orders: 85,
      ad_spend: 4820,
      ad_sales: 38500,
      tacos: 10.7,
      acos: 12.5,
      impressions: 380000,
      clicks: 12500,
      created_at: new Date().toISOString(),
    },
    previousWeek: {
      id: "4",
      brand_id: "2",
      week_start: "2024-01-29",
      revenue: 42800,
      revenue_ex_vat: 40762,
      units: 84,
      orders: 81,
      ad_spend: 4650,
      ad_sales: 36800,
      tacos: 10.9,
      acos: 12.6,
      impressions: 365000,
      clicks: 11800,
      created_at: new Date().toISOString(),
    },
    alerts: [],
  },
  {
    id: "3",
    name: "JCT",
    mode: "launch",
    tacos_target: 25,
    acos_target: 35,
    min_stock_days: 21,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    currentWeek: {
      id: "5",
      brand_id: "3",
      week_start: "2024-02-05",
      revenue: 12800,
      revenue_ex_vat: 12190,
      units: 64,
      orders: 58,
      ad_spend: 3200,
      ad_sales: 10500,
      tacos: 25.0,
      acos: 30.5,
      impressions: 280000,
      clicks: 5200,
      created_at: new Date().toISOString(),
    },
    previousWeek: {
      id: "6",
      brand_id: "3",
      week_start: "2024-01-29",
      revenue: 8500,
      revenue_ex_vat: 8095,
      units: 42,
      orders: 38,
      ad_spend: 2800,
      ad_sales: 7200,
      tacos: 32.9,
      acos: 38.9,
      impressions: 220000,
      clicks: 4100,
      created_at: new Date().toISOString(),
    },
    alerts: [],
  },
];

const weeklyData = [
  { week: "Jan 8", revenue: 72500, adSpend: 11200 },
  { week: "Jan 15", revenue: 78200, adSpend: 11800 },
  { week: "Jan 22", revenue: 74800, adSpend: 11500 },
  { week: "Jan 29", revenue: 76500, adSpend: 11950 },
  { week: "Feb 5", revenue: 86500, adSpend: 13045 },
];

export default function DashboardPage() {
  // Calculate totals from brands
  const totalRevenue = sampleBrands.reduce(
    (sum, b) => sum + (b.currentWeek?.revenue_ex_vat || 0),
    0
  );
  const totalPrevRevenue = sampleBrands.reduce(
    (sum, b) => sum + (b.previousWeek?.revenue_ex_vat || 0),
    0
  );
  const revenueChange =
    totalPrevRevenue > 0
      ? ((totalRevenue - totalPrevRevenue) / totalPrevRevenue) * 100
      : 0;

  const totalAdSpend = sampleBrands.reduce(
    (sum, b) => sum + (b.currentWeek?.ad_spend || 0),
    0
  );
  const totalPrevAdSpend = sampleBrands.reduce(
    (sum, b) => sum + (b.previousWeek?.ad_spend || 0),
    0
  );
  const adSpendChange =
    totalPrevAdSpend > 0
      ? ((totalAdSpend - totalPrevAdSpend) / totalPrevAdSpend) * 100
      : 0;

  const totalOrders = sampleBrands.reduce(
    (sum, b) => sum + (b.currentWeek?.orders || 0),
    0
  );
  const totalPrevOrders = sampleBrands.reduce(
    (sum, b) => sum + (b.previousWeek?.orders || 0),
    0
  );
  const ordersChange =
    totalPrevOrders > 0
      ? ((totalOrders - totalPrevOrders) / totalPrevOrders) * 100
      : 0;

  const avgTacos = totalRevenue > 0 ? (totalAdSpend / totalRevenue) * 100 : 0;
  const prevAvgTacos =
    totalPrevRevenue > 0 ? (totalPrevAdSpend / totalPrevRevenue) * 100 : 0;
  const tacosChange = prevAvgTacos > 0 ? avgTacos - prevAvgTacos : 0;

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      <AlertsSection alerts={sampleAlerts} />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Revenue (ex. VAT)"
          value={formatCurrency(totalRevenue)}
          change={revenueChange}
          tooltip="Total revenue excluding 5% VAT"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Ad Spend"
          value={formatCurrency(totalAdSpend)}
          change={adSpendChange}
          tooltip="Total advertising spend across all campaigns"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title="TACoS"
          value={formatPercent(avgTacos)}
          change={tacosChange}
          tooltip="Total Advertising Cost of Sales (Ad Spend / Total Revenue)"
          icon={<Percent className="h-4 w-4" />}
          inverse
        />
        <KpiCard
          title="Orders"
          value={totalOrders.toString()}
          change={ordersChange}
          tooltip="Total number of orders"
          icon={<ShoppingCart className="h-4 w-4" />}
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WeekComparisonChart data={weeklyData} />
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalRevenue / (totalOrders || 1))}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">24</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total SKUs</p>
                <p className="text-2xl font-bold">47</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold text-destructive">3</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brands Table */}
      <Card>
        <CardHeader>
          <CardTitle>Brands at a Glance</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandsTable brands={sampleBrands} />
        </CardContent>
      </Card>
    </div>
  );
}
