"use client";

import { useState } from "react";
import { Plus, Filter, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn, MODES } from "@/lib/utils";

const decisions = [
  {
    id: "1",
    date: "2024-02-05",
    entityType: "brand",
    entityName: "Waterpik",
    oldMode: "launch",
    newMode: "growth",
    reason: "Product established with consistent sales. Moving to growth phase to scale revenue while managing TACoS.",
    createdBy: "Admin",
  },
  {
    id: "2",
    date: "2024-02-01",
    entityType: "sku",
    entityName: "WP-VAC-02",
    oldMode: null,
    newMode: "defend",
    reason: "Competitor launched similar product at lower price. Increasing ad spend to protect market share.",
    createdBy: "Admin",
  },
  {
    id: "3",
    date: "2024-01-28",
    entityType: "brand",
    entityName: "JCT",
    oldMode: null,
    newMode: "launch",
    reason: "New brand launch. Prioritizing visibility and reviews over profitability.",
    createdBy: "Admin",
  },
  {
    id: "4",
    date: "2024-01-25",
    entityType: "brand",
    entityName: "Jabra",
    oldMode: "growth",
    newMode: "profit",
    reason: "Strong organic ranking achieved. Reducing ad spend while maintaining sales.",
    createdBy: "Admin",
  },
  {
    id: "5",
    date: "2024-01-20",
    entityType: "sku",
    entityName: "WP-TIP-6",
    oldMode: "growth",
    newMode: "seasonal",
    reason: "Preparing for Ramadan sale. Increasing budget for promotional period.",
    createdBy: "Admin",
  },
];

export default function DecisionsPage() {
  const [filterType, setFilterType] = useState<string>("all");

  const filteredDecisions = filterType === "all"
    ? decisions
    : decisions.filter(d => d.entityType === filterType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Decision Log</h1>
          <p className="text-muted-foreground">
            Track mode changes and strategic decisions across your portfolio
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Log Decision
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Decisions</CardTitle>
              <CardDescription>
                Historical record of mode changes and their reasoning
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="brand">Brands</SelectItem>
                  <SelectItem value="sku">SKUs</SelectItem>
                  <SelectItem value="campaign">Campaigns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Change</TableHead>
                <TableHead className="max-w-[400px]">Reason</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDecisions.map((decision) => {
                const oldMode = MODES.find((m) => m.id === decision.oldMode);
                const newMode = MODES.find((m) => m.id === decision.newMode);

                return (
                  <TableRow key={decision.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(decision.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="capitalize">
                          {decision.entityType}
                        </Badge>
                        <p className="font-medium">{decision.entityName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {oldMode ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-none text-white opacity-60",
                              oldMode.color
                            )}
                          >
                            {oldMode.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            (new)
                          </span>
                        )}
                        <span className="text-muted-foreground">→</span>
                        <Badge
                          variant="outline"
                          className={cn("border-none text-white", newMode?.color)}
                        >
                          {newMode?.name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[400px]">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {decision.reason}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {decision.createdBy}
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
