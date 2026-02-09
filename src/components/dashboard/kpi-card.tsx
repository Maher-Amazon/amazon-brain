"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatPercent } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KpiCardProps {
  title: string;
  value: string;
  change: number;
  changeLabel?: string;
  tooltip?: string;
  icon?: React.ReactNode;
  inverse?: boolean; // For metrics where down is good (like TACoS)
}

export function KpiCard({
  title,
  value,
  change,
  changeLabel = "vs last week",
  tooltip,
  icon,
  inverse = false,
}: KpiCardProps) {
  const isPositive = inverse ? change < 0 : change > 0;
  const isNegative = inverse ? change > 0 : change < 0;
  const isNeutral = change === 0;

  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  const content = (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <TrendIcon
            className={cn(
              "h-4 w-4",
              isPositive && "text-success",
              isNegative && "text-destructive",
              isNeutral && "text-muted-foreground"
            )}
          />
          <span
            className={cn(
              "text-sm font-medium",
              isPositive && "text-success",
              isNegative && "text-destructive",
              isNeutral && "text-muted-foreground"
            )}
          >
            {formatPercent(Math.abs(change))}
          </span>
          <span className="text-sm text-muted-foreground">{changeLabel}</span>
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
