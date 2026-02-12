import { DollarSign, TrendingUp, ShoppingCart, Percent } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { AlertsSection } from "@/components/dashboard/alerts-section";
import { BrandsTable } from "@/components/dashboard/brands-table";
import { WeekComparisonChart } from "@/components/charts/week-comparison";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { getDashboardStats } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const { brands, alerts, weeklyData, activeCampaigns, totalSkus, lowStockItems } =
    await getDashboardStats();

  // Calculate totals from brands
  const totalRevenue = brands.reduce(
    (sum, b) => sum + (b.currentWeek?.revenue_ex_vat || 0),
    0
  );
  const totalPrevRevenue = brands.reduce(
    (sum, b) => sum + (b.previousWeek?.revenue_ex_vat || 0),
    0
  );
  const revenueChange =
    totalPrevRevenue > 0
      ? ((totalRevenue - totalPrevRevenue) / totalPrevRevenue) * 100
      : 0;

  const totalAdSpend = brands.reduce(
    (sum, b) => sum + (b.currentWeek?.ad_spend || 0),
    0
  );
  const totalPrevAdSpend = brands.reduce(
    (sum, b) => sum + (b.previousWeek?.ad_spend || 0),
    0
  );
  const adSpendChange =
    totalPrevAdSpend > 0
      ? ((totalAdSpend - totalPrevAdSpend) / totalPrevAdSpend) * 100
      : 0;

  const totalOrders = brands.reduce(
    (sum, b) => sum + (b.currentWeek?.orders || 0),
    0
  );
  const totalPrevOrders = brands.reduce(
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
      <AlertsSection alerts={alerts} />

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
                <p className="text-2xl font-bold">{activeCampaigns}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total SKUs</p>
                <p className="text-2xl font-bold">{totalSkus}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold text-destructive">{lowStockItems}</p>
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
          <BrandsTable brands={brands} />
        </CardContent>
      </Card>
    </div>
  );
}
