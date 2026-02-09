"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Package,
  Megaphone,
  Edit,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WeekComparisonChart } from "@/components/charts/week-comparison";
import { cn, formatCurrency, formatPercent, MODES } from "@/lib/utils";

// Sample data
const brandData = {
  id: "1",
  name: "Waterpik",
  mode: "growth",
  tacos_target: 15,
  acos_target: 25,
  min_stock_days: 14,
};

const weeklyPerformance = [
  { week: "Jan 8", revenue: 24500, adSpend: 4200 },
  { week: "Jan 15", revenue: 26200, adSpend: 4500 },
  { week: "Jan 22", revenue: 25800, adSpend: 4400 },
  { week: "Jan 29", revenue: 25200, adSpend: 4500 },
  { week: "Feb 5", revenue: 28500, adSpend: 5025 },
];

const skus = [
  {
    id: "1",
    sku: "WP-VAC-02",
    title: "Waterpik Cordless Advanced Water Flosser, Classic Blue",
    asin: "B01GNVF2AC",
    revenue: 12500,
    units: 62,
    stockLevel: 45,
    stockDays: 5,
    tacos: 19.2,
  },
  {
    id: "2",
    sku: "WP-ION-01",
    title: "Waterpik ION Professional Cordless Water Flosser",
    asin: "B07GVJHM2D",
    revenue: 8200,
    units: 41,
    stockLevel: 120,
    stockDays: 22,
    tacos: 16.8,
  },
  {
    id: "3",
    sku: "WP-TIP-6",
    title: "Waterpik Replacement Tips (6 Pack)",
    asin: "B00HBQQ3M6",
    revenue: 4800,
    units: 240,
    stockLevel: 850,
    stockDays: 35,
    tacos: 12.5,
  },
];

const campaigns = [
  {
    id: "1",
    name: "Waterpik - Brand Defense",
    type: "SP",
    state: "enabled",
    spend: 1200,
    sales: 4800,
    acos: 25.0,
  },
  {
    id: "2",
    name: "Waterpik - Category",
    type: "SP",
    state: "enabled",
    spend: 1800,
    sales: 6200,
    acos: 29.0,
  },
  {
    id: "3",
    name: "Waterpik - Auto",
    type: "SP",
    state: "enabled",
    spend: 2025,
    sales: 7500,
    acos: 27.0,
  },
];

export default function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const mode = MODES.find((m) => m.id === brandData.mode);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/brands">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {brandData.name}
              </h1>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className={cn("border-none text-white", mode?.color)}
                  >
                    {mode?.name}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{mode?.description}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-muted-foreground">
              TACoS Target: {formatPercent(brandData.tacos_target)} | ACoS
              Target: {formatPercent(brandData.acos_target)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Goals
          </Button>
          <Button variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Seller Central
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Weekly Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(27143)}</p>
            <div className="mt-1 flex items-center text-sm text-success">
              <TrendingUp className="mr-1 h-3 w-3" />
              13.1% vs last week
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Ad Spend</p>
            <p className="text-2xl font-bold">{formatCurrency(5025)}</p>
            <div className="mt-1 flex items-center text-sm text-destructive">
              <TrendingUp className="mr-1 h-3 w-3" />
              11.7% vs last week
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">TACoS</p>
            <p className="text-2xl font-bold text-destructive">
              {formatPercent(18.5)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Target: {formatPercent(15)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Orders</p>
            <p className="text-2xl font-bold">138</p>
            <div className="mt-1 flex items-center text-sm text-success">
              <TrendingUp className="mr-1 h-3 w-3" />
              13.1% vs last week
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <WeekComparisonChart data={weeklyPerformance} title="Weekly Performance" />

      {/* Tabs for SKUs and Campaigns */}
      <Tabs defaultValue="skus" className="space-y-4">
        <TabsList>
          <TabsTrigger value="skus" className="gap-2">
            <Package className="h-4 w-4" />
            SKUs ({skus.length})
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Campaigns ({campaigns.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skus">
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">TACoS</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skus.map((sku) => (
                    <TableRow key={sku.id}>
                      <TableCell className="font-mono text-sm">
                        {sku.sku}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger className="max-w-[300px] truncate text-left">
                            {sku.title}
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[400px]">
                            <p>{sku.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              ASIN: {sku.asin}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sku.revenue)}
                      </TableCell>
                      <TableCell className="text-right">{sku.units}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={cn(
                              sku.stockDays < 14 && "font-medium text-destructive"
                            )}
                          >
                            {sku.stockLevel}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({sku.stockDays}d)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            sku.tacos > brandData.tacos_target &&
                              "font-medium text-destructive"
                          )}
                        >
                          {formatPercent(sku.tacos)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Advertising Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">ACoS</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{campaign.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            campaign.state === "enabled" ? "success" : "secondary"
                          }
                        >
                          {campaign.state}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(campaign.spend)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(campaign.sales)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            campaign.acos > brandData.acos_target &&
                              "font-medium text-destructive"
                          )}
                        >
                          {formatPercent(campaign.acos)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
