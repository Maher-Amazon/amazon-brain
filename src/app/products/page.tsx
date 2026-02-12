import { getProducts } from "@/lib/data";
import { ProductsClient } from "./products-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductsPage() {
  const products = await getProducts();

  return <ProductsClient products={products} />;
}
