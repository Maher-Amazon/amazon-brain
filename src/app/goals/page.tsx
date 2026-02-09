"use client";

import { useState } from "react";
import { Save, History, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, MODES, formatPercent } from "@/lib/utils";

const brands = [
  { id: "1", name: "Waterpik", mode: "growth", tacosTarget: 15, acosTarget: 25, minStockDays: 14 },
  { id: "2", name: "Jabra", mode: "profit", tacosTarget: 12, acosTarget: 20, minStockDays: 14 },
  { id: "3", name: "JCT", mode: "launch", tacosTarget: 25, acosTarget: 35, minStockDays: 21 },
];

export default function GoalsPage() {
  const [accountDefaults, setAccountDefaults] = useState({
    tacosTarget: 15,
    acosTarget: 25,
    tacosHighThreshold: 25,
    minStockDays: 14,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals & Targets</h1>
          <p className="text-muted-foreground">
            Set account defaults and brand-specific performance targets
          </p>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Account Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Account Defaults</CardTitle>
          <CardDescription>
            Default targets applied to all new brands. Individual brands can override these.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="default-tacos">Default TACoS Target (%)</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total Advertising Cost of Sales</p>
                    <p className="text-xs text-muted-foreground">
                      Ad Spend / Total Revenue
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="default-tacos"
                type="number"
                value={accountDefaults.tacosTarget}
                onChange={(e) =>
                  setAccountDefaults({
                    ...accountDefaults,
                    tacosTarget: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="tacos-high">TACoS High Threshold (%)</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>TACoS above this is considered "high"</p>
                    <p className="text-xs text-muted-foreground">
                      Used for alerts and highlighting
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="tacos-high"
                type="number"
                value={accountDefaults.tacosHighThreshold}
                onChange={(e) =>
                  setAccountDefaults({
                    ...accountDefaults,
                    tacosHighThreshold: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="default-acos">Default ACoS Target (%)</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Advertising Cost of Sales</p>
                    <p className="text-xs text-muted-foreground">
                      Ad Spend / Ad Sales
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="default-acos"
                type="number"
                value={accountDefaults.acosTarget}
                onChange={(e) =>
                  setAccountDefaults({
                    ...accountDefaults,
                    acosTarget: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="default-stock">Min Stock Days Alert</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Alert when stock falls below this many days</p>
                    <p className="text-xs text-muted-foreground">
                      Based on current sales velocity
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="default-stock"
                type="number"
                value={accountDefaults.minStockDays}
                onChange={(e) =>
                  setAccountDefaults({
                    ...accountDefaults,
                    minStockDays: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Brand Goals</CardTitle>
              <CardDescription>
                Set individual targets and modes for each brand
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <History className="mr-2 h-4 w-4" />
              View History
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>TACoS Target</TableHead>
                <TableHead>ACoS Target</TableHead>
                <TableHead>Stock Alert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => {
                const mode = MODES.find((m) => m.id === brand.mode);
                return (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>
                      <Select defaultValue={brand.mode}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODES.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn("h-2 w-2 rounded-full", m.color)}
                                />
                                {m.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20"
                          defaultValue={brand.tacosTarget}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20"
                          defaultValue={brand.acosTarget}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20"
                          defaultValue={brand.minStockDays}
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mode Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Mode Reference</CardTitle>
          <CardDescription>
            Understanding the different operating modes for your brands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {MODES.map((mode) => (
              <div
                key={mode.id}
                className="rounded-lg border p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("h-3 w-3 rounded-full", mode.color)} />
                  <h4 className="font-semibold">{mode.name}</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {mode.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
