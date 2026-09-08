import { prisma } from "@/lib/prisma";
import { VentasView } from "@/components/ventas/ventas-view";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [sales, products, monthAgg] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { soldAt: "desc" },
      take: 200,
      include: { seller: { select: { name: true } }, lead: { select: { name: true } } },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, basePrice: true },
    }),
    prisma.sale.aggregate({
      where: { soldAt: { gte: monthStart } },
      _sum: { finalPrice: true },
      _count: true,
    }),
  ]);

  return (
    <VentasView
      sales={sales.map((s) => ({
        id: s.id,
        soldAt: s.soldAt.toISOString(),
        productName: s.productName,
        finalPrice: s.finalPrice,
        deliveryType: s.deliveryType,
        customer: s.customerName ?? s.lead?.name ?? null,
        seller: s.seller.name,
      }))}
      products={products}
      monthTotal={monthAgg._sum.finalPrice ?? 0}
      monthCount={monthAgg._count}
    />
  );
}
