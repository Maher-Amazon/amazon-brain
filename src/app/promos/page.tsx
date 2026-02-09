"use client";

import { useState } from "react";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Percent,
  DollarSign,
  Calendar,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PromosTracker, PromoType, PromoStatus } from "@/lib/supabase";

// Sample data - in production this would come from Supabase
const samplePromos: PromosTracker[] = [
  {
    id: "1",
    asin: "B0EXAMPLE01",
    sku_id: null,
    promo_type: "discount",
    discount_percent: 15,
    discount_amount: null,
    start_date: "2025-02-01",
    end_date: "2025-02-14",
    status: "active",
    notes: "Valentine's Day promotion",
    created_at: "2025-01-20",
    updated_at: "2025-01-20",
  },
  {
    id: "2",
    asin: "B0EXAMPLE02",
    sku_id: null,
    promo_type: "coupon",
    discount_percent: 10,
    discount_amount: null,
    start_date: "2025-02-15",
    end_date: "2025-03-15",
    status: "scheduled",
    notes: "Ramadan pre-sale coupon",
    created_at: "2025-01-25",
    updated_at: "2025-01-25",
  },
  {
    id: "3",
    asin: "B0EXAMPLE03",
    sku_id: null,
    promo_type: "lightning_deal",
    discount_percent: 25,
    discount_amount: null,
    start_date: "2025-01-15",
    end_date: "2025-01-15",
    status: "ended",
    notes: "One-day lightning deal - performed well",
    created_at: "2025-01-10",
    updated_at: "2025-01-16",
  },
];

const promoTypeLabels: Record<PromoType, string> = {
  discount: "Price Discount",
  coupon: "Coupon",
  ped: "Prime Exclusive Deal",
  deal: "Deal",
  lightning_deal: "Lightning Deal",
};

const promoTypeIcons: Record<PromoType, typeof Percent> = {
  discount: Percent,
  coupon: Tag,
  ped: Package,
  deal: DollarSign,
  lightning_deal: DollarSign,
};

const statusColors: Record<PromoStatus, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  ended: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPromoStatus(startDate: string, endDate: string | null): PromoStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (start > today) return "scheduled";

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    if (end < today) return "ended";
  }

  return "active";
}

export default function PromosPage() {
  const [promos, setPromos] = useState<PromosTracker[]>(samplePromos);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromosTracker | null>(null);
  const [formData, setFormData] = useState({
    asin: "",
    promo_type: "discount" as PromoType,
    discount_percent: "",
    discount_amount: "",
    start_date: "",
    end_date: "",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      asin: "",
      promo_type: "discount",
      discount_percent: "",
      discount_amount: "",
      start_date: "",
      end_date: "",
      notes: "",
    });
    setEditingPromo(null);
  };

  const handleOpenDialog = (promo?: PromosTracker) => {
    if (promo) {
      setEditingPromo(promo);
      setFormData({
        asin: promo.asin,
        promo_type: promo.promo_type,
        discount_percent: promo.discount_percent?.toString() || "",
        discount_amount: promo.discount_amount?.toString() || "",
        start_date: promo.start_date,
        end_date: promo.end_date || "",
        notes: promo.notes || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const status = getPromoStatus(formData.start_date, formData.end_date || null);

    if (editingPromo) {
      setPromos(promos.map(p =>
        p.id === editingPromo.id
          ? {
              ...p,
              asin: formData.asin,
              promo_type: formData.promo_type,
              discount_percent: formData.discount_percent ? parseFloat(formData.discount_percent) : null,
              discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : null,
              start_date: formData.start_date,
              end_date: formData.end_date || null,
              status,
              notes: formData.notes || null,
              updated_at: new Date().toISOString(),
            }
          : p
      ));
    } else {
      const newPromo: PromosTracker = {
        id: String(Date.now()),
        asin: formData.asin,
        sku_id: null,
        promo_type: formData.promo_type,
        discount_percent: formData.discount_percent ? parseFloat(formData.discount_percent) : null,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        status,
        notes: formData.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPromos([...promos, newPromo]);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setPromos(promos.filter(p => p.id !== id));
  };

  // Sort promos: active first, then scheduled, then ended (by date)
  const sortedPromos = [...promos].sort((a, b) => {
    const statusOrder = { active: 0, scheduled: 1, ended: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
  });

  // Stats
  const activeCount = promos.filter(p => p.status === "active").length;
  const scheduledCount = promos.filter(p => p.status === "scheduled").length;
  const endedCount = promos.filter(p => p.status === "ended").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotions Tracker</h1>
          <p className="text-muted-foreground">
            Track discounts, coupons, and deals across your catalog
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPromo ? "Edit Promotion" : "Add New Promotion"}
              </DialogTitle>
              <DialogDescription>
                {editingPromo
                  ? "Update the promotion details below."
                  : "Enter the details for the new promotion."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="asin">ASIN</Label>
                  <Input
                    id="asin"
                    value={formData.asin}
                    onChange={(e) => setFormData({ ...formData, asin: e.target.value })}
                    placeholder="B0XXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Promo Type</Label>
                  <Select
                    value={formData.promo_type}
                    onValueChange={(v) => setFormData({ ...formData, promo_type: v as PromoType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(promoTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_percent">Discount %</Label>
                  <Input
                    id="discount_percent"
                    type="number"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                    placeholder="15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_amount">Or Fixed Amount (AED)</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                    placeholder="25.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this promotion..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.asin || !formData.start_date}>
                {editingPromo ? "Save Changes" : "Add Promotion"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Promotions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{scheduledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ended (Total)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{endedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Promos Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Promotions</CardTitle>
          <CardDescription>
            Track and manage all your promotional activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ASIN</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPromos.map((promo) => {
                const Icon = promoTypeIcons[promo.promo_type];
                return (
                  <TableRow key={promo.id}>
                    <TableCell className="font-mono text-sm">
                      {promo.asin}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {promoTypeLabels[promo.promo_type]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {promo.discount_percent && (
                        <span className="font-medium">{promo.discount_percent}% off</span>
                      )}
                      {promo.discount_amount && (
                        <span className="font-medium">AED {promo.discount_amount} off</span>
                      )}
                      {!promo.discount_percent && !promo.discount_amount && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(promo.start_date)}
                        {promo.end_date && (
                          <> - {formatDate(promo.end_date)}</>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[promo.status]}
                      >
                        {promo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {promo.notes || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(promo)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(promo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sortedPromos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No promotions yet. Click "Add Promotion" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Promo Types Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Promotion Types</CardTitle>
          <CardDescription>
            Different types of promotions available on Amazon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Price Discount</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Direct price reduction shown as strikethrough pricing
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Coupon</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Clippable coupon badge displayed on product listing
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Prime Exclusive Deal</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Special discount available only to Prime members
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Deal</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Featured deal placement with limited-time pricing
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Lightning Deal</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Time-limited deal with quantity caps and countdown timer
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
