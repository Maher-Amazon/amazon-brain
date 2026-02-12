import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrandsTable } from "@/components/dashboard/brands-table";
import { getBrandsWithWeeklyData } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BrandsPage() {
  const brands = await getBrandsWithWeeklyData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
          <p className="text-muted-foreground">
            Manage your brand portfolio and performance targets
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Brand
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Brands</CardTitle>
        </CardHeader>
        <CardContent>
          {brands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No brands found. Run the sync script to import data from Amazon.
            </div>
          ) : (
            <BrandsTable brands={brands} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
