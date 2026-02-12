"use client";

import { useState } from "react";
import { ExternalLink, Search, AlertTriangle } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { ProductDisplay } from "@/lib/data";

interface ProductsClientProps {
  products: ProductDisplay[];
}

export function ProductsClient({ products }: ProductsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand =
      brandFilter === "all" || product.brand === brandFilter;
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "low" && product.stockDays < 14) ||
      (stockFilter === "ok" && product.stockDays >= 14);
    return matchesSearch && matchesBrand && matchesStock;
  });

  const brands = [...new Set(products.map((p) => p.brand))];
  const lowStockCount = products.filter((p) => p.stockDays < 14 && p.stockDays > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Track product performance and inventory levels
          </p>
        </div>
        {lowStockCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {lowStockCount} low stock items
          </Badge>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by SKU or product name..."
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
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="ok">In Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Products ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products found. Run the sync script with --inventory to import products.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">TACoS</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const isLowStock = product.stockDays < 14 && product.stockDays > 0;
                  const isOverTacos = product.tacos > product.tacosTarget;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <code className="rounded bg-muted px-1 py-0.5 text-sm">
                          {product.sku}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <Tooltip>
                          <TooltipTrigger className="truncate text-left block">
                            {product.title}
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[400px]">
                            <p>{product.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              ASIN: {product.asin}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.brand}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {product.revenue > 0 ? formatCurrency(product.revenue) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.units > 0 ? product.units : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.stockLevel > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            {isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            <span
                              className={cn(
                                isLowStock && "font-medium text-destructive"
                              )}
                            >
                              {product.stockLevel}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({product.stockDays}d)
                            </span>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {product.tacos > 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            <span
                              className={cn(
                                "font-medium",
                                isOverTacos && "text-destructive"
                              )}
                            >
                              {formatPercent(product.tacos)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              / {formatPercent(product.tacosTarget)}
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
