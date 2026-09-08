import { prisma } from "@/lib/prisma";
import { CatalogView } from "@/components/catalog/catalog-view";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { sales: true } } },
  });

  return (
    <CatalogView
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        basePrice: p.basePrice,
        category: p.category,
        active: p.active,
        salesCount: p._count.sales,
      }))}
    />
  );
}
