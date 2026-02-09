"use client";

import { useState } from "react";
import { ExternalLink, Filter, Search } from "lucide-react";
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
import { cn, formatCurrency, formatPercent, formatNumber, simplifyCampaignName } from "@/lib/utils";

const campaigns = [
  {
    id: "1",
    name: "SPDO-SMT-Waterpik - Brand Defense",
    brand: "Waterpik",
    type: "SP",
    targeting: "Manual",
    state: "enabled",
    budget: 50,
    impressions: 125000,
    clicks: 2800,
    spend: 1200,
    sales: 4800,
    orders: 24,
    acos: 25.0,
    acosTarget: 25,
  },
  {
    id: "2",
    name: "SPDO-SMT-Waterpik - Category",
    brand: "Waterpik",
    type: "SP",
    targeting: "Manual",
    state: "enabled",
    budget: 75,
    impressions: 185000,
    clicks: 3500,
    spend: 1800,
    sales: 6200,
    orders: 31,
    acos: 29.0,
    acosTarget: 25,
  },
  {
    id: "3",
    name: "Waterpik - Auto Discovery",
    brand: "Waterpik",
    type: "SP",
    targeting: "Auto",
    state: "enabled",
    budget: 100,
    impressions: 140000,
    clicks: 2200,
    spend: 2025,
    sales: 7500,
    orders: 38,
    acos: 27.0,
    acosTarget: 25,
  },
  {
    id: "4",
    name: "Jabra - Brand",
    brand: "Jabra",
    type: "SP",
    targeting: "Manual",
    state: "enabled",
    budget: 80,
    impressions: 95000,
    clicks: 4200,
    spend: 1600,
    sales: 14500,
    orders: 29,
    acos: 11.0,
    acosTarget: 20,
  },
  {
    id: "5",
    name: "Jabra - Competitor Targeting",
    brand: "Jabra",
    type: "SP",
    targeting: "Manual",
    state: "enabled",
    budget: 60,
    impressions: 180000,
    clicks: 5500,
    spend: 2200,
    sales: 16500,
    orders: 33,
    acos: 13.3,
    acosTarget: 20,
  },
  {
    id: "6",
    name: "Jabra - Auto",
    brand: "Jabra",
    type: "SP",
    targeting: "Auto",
    state: "enabled",
    budget: 40,
    impressions: 105000,
    clicks: 2800,
    spend: 1020,
    sales: 7500,
    orders: 15,
    acos: 13.6,
    acosTarget: 20,
  },
  {
    id: "7",
    name: "JCT Launch - Auto",
    brand: "JCT",
    type: "SP",
    targeting: "Auto",
    state: "enabled",
    budget: 100,
    impressions: 180000,
    clicks: 3200,
    spend: 2100,
    sales: 7500,
    orders: 38,
    acos: 28.0,
    acosTarget: 35,
  },
  {
    id: "8",
    name: "JCT Launch - Category",
    brand: "JCT",
    type: "SP",
    targeting: "Manual",
    state: "enabled",
    budget: 50,
    impressions: 100000,
    clicks: 2000,
    spend: 1100,
    sales: 3000,
    orders: 15,
    acos: 36.7,
    acosTarget: 35,
  },
];

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesBrand =
      brandFilter === "all" || campaign.brand === brandFilter;
    const matchesState =
      stateFilter === "all" || campaign.state === stateFilter;
    return matchesSearch && matchesBrand && matchesState;
  });

  const brands = [...new Set(campaigns.map((c) => c.brand))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Monitor and manage your advertising campaigns
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
                  placeholder="Search campaigns..."
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
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns ({filteredCampaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">ACoS</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => {
                const isOverAcos = campaign.acos > campaign.acosTarget;
                const ctr = (campaign.clicks / campaign.impressions) * 100;

                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {simplifyCampaignName(campaign.name)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {campaign.targeting}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{campaign.brand}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{campaign.type}</Badge>
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
                      {formatCurrency(campaign.budget)}/day
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(campaign.impressions)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        {formatNumber(campaign.clicks)}
                        <p className="text-xs text-muted-foreground">
                          {formatPercent(ctr)} CTR
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(campaign.spend)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        {formatCurrency(campaign.sales)}
                        <p className="text-xs text-muted-foreground">
                          {campaign.orders} orders
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span
                          className={cn(
                            "font-medium",
                            isOverAcos && "text-destructive"
                          )}
                        >
                          {formatPercent(campaign.acos)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {formatPercent(campaign.acosTarget)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
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
