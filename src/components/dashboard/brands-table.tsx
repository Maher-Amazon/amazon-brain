"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatCurrency, formatPercent, MODES } from "@/lib/utils";
import type { BrandSummary } from "@/lib/supabase";

interface BrandsTableProps {
  brands: BrandSummary[];
}

export function BrandsTable({ brands }: BrandsTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Brand</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Ad Spend</TableHead>
            <TableHead className="text-right">TACoS</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.map((brand) => {
            const mode = MODES.find((m) => m.id === brand.mode);
            const currentWeek = brand.currentWeek;
            const previousWeek = brand.previousWeek;

            const revenueChange = previousWeek?.revenue
              ? ((currentWeek?.revenue || 0) - previousWeek.revenue) /
                previousWeek.revenue *
                100
              : 0;

            const tacosOverTarget =
              currentWeek && currentWeek.tacos > brand.tacos_target;

            return (
              <TableRow key={brand.id}>
                <TableCell>
                  <Link
                    href={`/brands/${brand.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {brand.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-none text-white",
                          mode?.color || "bg-gray-500"
                        )}
                      >
                        {mode?.name || brand.mode}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{mode?.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span>
                      {formatCurrency(currentWeek?.revenue_ex_vat || 0)}
                    </span>
                    {revenueChange !== 0 && (
                      <span
                        className={cn(
                          "flex items-center text-xs",
                          revenueChange > 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {revenueChange > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {formatPercent(Math.abs(revenueChange), 0)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(currentWeek?.ad_spend || 0)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span
                      className={cn(tacosOverTarget && "text-destructive font-medium")}
                    >
                      {formatPercent(currentWeek?.tacos || 0)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {formatPercent(brand.tacos_target)}
                    </span>
                    {tacosOverTarget && (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {currentWeek?.orders || 0}
                </TableCell>
                <TableCell className="text-center">
                  {brand.alerts.length > 0 ? (
                    <Badge variant="destructive">{brand.alerts.length} alerts</Badge>
                  ) : (
                    <Badge variant="success">Healthy</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href={`/brands/${brand.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
