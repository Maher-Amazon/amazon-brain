"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { EventUae } from "@/lib/supabase";

interface WeekData {
  week: string;
  revenue: number;
  adSpend: number;
  events?: EventUae[];
}

interface WeekComparisonChartProps {
  data: WeekData[];
  title?: string;
  events?: EventUae[];
}

// Custom tick component to show event badges
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomXAxisTick(props: any) {
  const { x, y, payload, dataWithEvents } = props as {
    x: number;
    y: number;
    payload: { value: string };
    dataWithEvents?: WeekData[];
  };
  const weekData = dataWithEvents?.find((d) => d.week === payload.value);
  const events = weekData?.events || [];
  const hasHighImpact = events.some((e) => e.impact_level === "high");

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize={12}
      >
        {payload.value}
      </text>
      {events.length > 0 && (
        <circle
          cx={0}
          cy={28}
          r={4}
          fill={hasHighImpact ? "hsl(var(--destructive))" : "hsl(var(--warning))"}
        />
      )}
    </g>
  );
}

// Custom tooltip to show events
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string; payload?: WeekData }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const weekData = payload[0]?.payload;
  const events = weekData?.events || [];

  return (
    <div
      className="rounded-lg border bg-card p-3 shadow-lg"
      style={{ minWidth: "180px" }}
    >
      <p className="font-medium mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex justify-between text-sm">
          <span style={{ color: entry.color }}>{entry.name}:</span>
          <span className="font-mono">{formatCurrency(entry.value)}</span>
        </div>
      ))}
      {events.length > 0 && (
        <div className="mt-2 pt-2 border-t space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Events:</p>
          {events.map((event) => (
            <div key={event.id} className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  event.impact_level === "high"
                    ? "bg-red-500"
                    : event.impact_level === "medium"
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
              />
              <span className="text-xs">{event.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to get week start date from week label
function getWeekStartFromLabel(weekLabel: string): Date | null {
  // Try to parse labels like "Jan 6" or "Week 1"
  const monthDayMatch = weekLabel.match(/^([A-Za-z]+)\s+(\d+)$/);
  if (monthDayMatch) {
    const [, month, day] = monthDayMatch;
    const monthIndex = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ].indexOf(month);
    if (monthIndex >= 0) {
      const date = new Date();
      date.setMonth(monthIndex);
      date.setDate(parseInt(day, 10));
      date.setHours(0, 0, 0, 0);
      return date;
    }
  }
  return null;
}

// Helper to check if an event overlaps with a week
function eventOverlapsWeek(event: EventUae, weekStart: Date): boolean {
  const eventStart = new Date(event.start_date);
  const eventEnd = new Date(event.end_date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return eventStart <= weekEnd && eventEnd >= weekStart;
}

export function WeekComparisonChart({
  data,
  title = "Weekly Performance",
  events = [],
}: WeekComparisonChartProps) {
  // Enrich data with events
  const dataWithEvents: WeekData[] = data.map((week) => {
    const weekStart = getWeekStartFromLabel(week.week);
    const weekEvents = weekStart
      ? events.filter((e) => eventOverlapsWeek(e, weekStart))
      : [];
    return { ...week, events: weekEvents };
  });

  // Get weeks with events for legend
  const weeksWithEvents = dataWithEvents.filter((d) => d.events && d.events.length > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {weeksWithEvents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Events:</span>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs">High</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-xs">Medium</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataWithEvents} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="week"
                tick={(props) => (
                  <CustomXAxisTick {...props} dataWithEvents={dataWithEvents} />
                )}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                height={40}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="adSpend"
                name="Ad Spend"
                fill="hsl(var(--warning))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Event badges below chart */}
        {weeksWithEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Events this period:</p>
            <div className="flex flex-wrap gap-2">
              {events.map((event) => (
                <Badge
                  key={event.id}
                  variant="outline"
                  className={
                    event.impact_level === "high"
                      ? "border-red-500/50 text-red-500"
                      : event.impact_level === "medium"
                      ? "border-yellow-500/50 text-yellow-500"
                      : "border-green-500/50 text-green-500"
                  }
                >
                  {event.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
