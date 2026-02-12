"use client";

import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
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
import type { CampaignDisplay } from "@/lib/data";

interface CampaignsClientProps {
  campaigns: CampaignDisplay[];
}

export function CampaignsClient({ campaigns }: CampaignsClientProps) {
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
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No campaigns found. Run the sync script to import campaigns from Amazon Ads.
            </div>
          ) : (
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
                  const ctr = campaign.impressions > 0
                    ? (campaign.clicks / campaign.impressions) * 100
                    : 0;

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
                        {campaign.budget > 0 ? `${formatCurrency(campaign.budget)}/day` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.impressions > 0 ? formatNumber(campaign.impressions) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.clicks > 0 ? (
                          <div>
                            {formatNumber(campaign.clicks)}
                            <p className="text-xs text-muted-foreground">
                              {formatPercent(ctr)} CTR
                            </p>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.spend > 0 ? formatCurrency(campaign.spend) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.sales > 0 ? (
                          <div>
                            {formatCurrency(campaign.sales)}
                            <p className="text-xs text-muted-foreground">
                              {campaign.orders} orders
                            </p>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.acos > 0 ? (
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
                        ) : "-"}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
