"use client";

import { useState } from "react";
import { Search, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrency, formatPercent, formatNumber } from "@/lib/utils";

const searchTerms = [
  {
    id: "1",
    term: "water flosser",
    campaign: "Waterpik - Category",
    brand: "Waterpik",
    impressions: 45000,
    clicks: 1250,
    orders: 65,
    spend: 580,
    sales: 3250,
    acos: 17.8,
    trend: "up",
  },
  {
    id: "2",
    term: "waterpik",
    campaign: "Waterpik - Brand Defense",
    brand: "Waterpik",
    impressions: 32000,
    clicks: 1800,
    orders: 85,
    spend: 420,
    sales: 4250,
    acos: 9.9,
    trend: "up",
  },
  {
    id: "3",
    term: "cordless water flosser",
    campaign: "Waterpik - Category",
    brand: "Waterpik",
    impressions: 28000,
    clicks: 850,
    orders: 42,
    spend: 380,
    sales: 2100,
    acos: 18.1,
    trend: "stable",
  },
  {
    id: "4",
    term: "dental water jet",
    campaign: "Waterpik - Auto",
    brand: "Waterpik",
    impressions: 15000,
    clicks: 420,
    orders: 18,
    spend: 210,
    sales: 900,
    acos: 23.3,
    trend: "down",
  },
  {
    id: "5",
    term: "jabra earbuds",
    campaign: "Jabra - Brand",
    brand: "Jabra",
    impressions: 38000,
    clicks: 2100,
    orders: 48,
    spend: 650,
    sales: 9600,
    acos: 6.8,
    trend: "up",
  },
  {
    id: "6",
    term: "wireless earbuds",
    campaign: "Jabra - Competitor",
    brand: "Jabra",
    impressions: 85000,
    clicks: 3200,
    orders: 52,
    spend: 1200,
    sales: 10400,
    acos: 11.5,
    trend: "stable",
  },
  {
    id: "7",
    term: "jabra elite 85t",
    campaign: "Jabra - Brand",
    brand: "Jabra",
    impressions: 22000,
    clicks: 1500,
    orders: 35,
    spend: 380,
    sales: 7000,
    acos: 5.4,
    trend: "up",
  },
  {
    id: "8",
    term: "noise cancelling earbuds",
    campaign: "Jabra - Competitor",
    brand: "Jabra",
    impressions: 62000,
    clicks: 2400,
    orders: 38,
    spend: 920,
    sales: 7600,
    acos: 12.1,
    trend: "down",
  },
  {
    id: "9",
    term: "vacuum bags",
    campaign: "JCT Launch - Auto",
    brand: "JCT",
    impressions: 48000,
    clicks: 1200,
    orders: 42,
    spend: 480,
    sales: 1680,
    acos: 28.6,
    trend: "up",
  },
  {
    id: "10",
    term: "hepa filter replacement",
    campaign: "JCT Launch - Category",
    brand: "JCT",
    impressions: 25000,
    clicks: 620,
    orders: 18,
    spend: 310,
    sales: 720,
    acos: 43.1,
    trend: "down",
  },
];

export default function SearchTermsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [performanceFilter, setPerformanceFilter] = useState<string>("all");

  const filteredTerms = searchTerms.filter((term) => {
    const matchesSearch = term.term
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesBrand = brandFilter === "all" || term.brand === brandFilter;
    const matchesPerformance =
      performanceFilter === "all" ||
      (performanceFilter === "profitable" && term.acos < 20) ||
      (performanceFilter === "unprofitable" && term.acos >= 20);
    return matchesSearch && matchesBrand && matchesPerformance;
  });

  const brands = [...new Set(searchTerms.map((t) => t.brand))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search Terms</h1>
          <p className="text-muted-foreground">
            Analyze search term performance across all campaigns
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search terms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={performanceFilter}
              onValueChange={setPerformanceFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Performance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Performance</SelectItem>
                <SelectItem value="profitable">Profitable (&lt;20%)</SelectItem>
                <SelectItem value="unprofitable">
                  Needs Work (&gt;20%)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Search Terms Table */}
      <Card>
        <CardHeader>
          <CardTitle>Search Terms ({filteredTerms.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Search Term</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">ACoS</TableHead>
                <TableHead className="text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTerms.map((term) => {
                const ctr = (term.clicks / term.impressions) * 100;
                const cvr = (term.orders / term.clicks) * 100;
                const isUnprofitable = term.acos > 20;

                return (
                  <TableRow key={term.id}>
                    <TableCell className="font-medium">{term.term}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {term.campaign}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{term.brand}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(term.impressions)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        {formatNumber(term.clicks)}
                        <p className="text-xs text-muted-foreground">
                          {formatPercent(ctr)} CTR
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        {term.orders}
                        <p className="text-xs text-muted-foreground">
                          {formatPercent(cvr)} CVR
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(term.spend)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(term.sales)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-medium",
                          isUnprofitable && "text-destructive",
                          !isUnprofitable && "text-success"
                        )}
                      >
                        {formatPercent(term.acos)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {term.trend === "up" && (
                        <TrendingUp className="h-4 w-4 text-success mx-auto" />
                      )}
                      {term.trend === "down" && (
                        <TrendingDown className="h-4 w-4 text-destructive mx-auto" />
                      )}
                      {term.trend === "stable" && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
