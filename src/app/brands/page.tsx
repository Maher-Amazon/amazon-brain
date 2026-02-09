"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandsTable } from "@/components/dashboard/brands-table";
import type { BrandSummary } from "@/lib/supabase";

// Sample data - will be replaced with real data from Supabase
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
    alerts: [],
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
    previousWeek: null,
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
    previousWeek: null,
    alerts: [],
  },
];

export default function BrandsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
          <p className="text-muted-foreground">
            Manage your brand portfolio and performance targets
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Brand
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Brands</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandsTable brands={sampleBrands} />
        </CardContent>
      </Card>
    </div>
  );
}
