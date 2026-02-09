"use client";

import * as React from "react";
import { AlertTriangle, AlertCircle, Info, X, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Alert } from "@/lib/supabase";

interface AlertsSectionProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

const alertIcons = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

const alertStyles = {
  critical: "border-destructive/50 bg-destructive/10",
  warning: "border-warning/50 bg-warning/10",
  info: "border-primary/50 bg-primary/10",
};

const alertBadgeVariants = {
  critical: "destructive" as const,
  warning: "warning" as const,
  info: "secondary" as const,
};

export function AlertsSection({ alerts, onDismiss }: AlertsSectionProps) {
  if (alerts.length === 0) {
    return null;
  }

  const criticalAlerts = alerts.filter((a) => a.level === "critical");
  const warningAlerts = alerts.filter((a) => a.level === "warning");
  const infoAlerts = alerts.filter((a) => a.level === "info");

  const sortedAlerts = [...criticalAlerts, ...warningAlerts, ...infoAlerts];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Needs Attention
            <Badge variant="secondary">{alerts.length}</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm">
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedAlerts.slice(0, 5).map((alert) => {
          const Icon = alertIcons[alert.level];
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3",
                alertStyles[alert.level]
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  alert.level === "critical" && "text-destructive",
                  alert.level === "warning" && "text-warning",
                  alert.level === "info" && "text-primary"
                )}
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={alertBadgeVariants[alert.level]}>
                    {alert.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm">{alert.message}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ExternalLink className="h-4 w-4" />
                </Button>
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDismiss(alert.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
