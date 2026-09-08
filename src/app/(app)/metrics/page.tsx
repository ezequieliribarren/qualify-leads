import { prisma } from "@/lib/prisma";
import { MetricsView } from "@/components/metrics/metrics-view";

export const dynamic = "force-dynamic";

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0);
  const end = new Date(y, m, 1, 0, 0, 0);
  const prevStart = new Date(y, m - 2, 1, 0, 0, 0);
  return { start, end, prevStart, prevEnd: start };
}

function currentYm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: { m?: string };
}) {
  const ym = /^\d{4}-\d{2}$/.test(searchParams.m ?? "") ? searchParams.m! : currentYm();
  const { start, end, prevStart, prevEnd } = monthRange(ym);

  const [monthSales, prevSales, sellers] = await Promise.all([
    prisma.sale.findMany({
      where: { soldAt: { gte: start, lt: end } },
      include: { seller: { select: { id: true, name: true } } },
      orderBy: { soldAt: "asc" },
    }),
    prisma.sale.findMany({ where: { soldAt: { gte: prevStart, lt: prevEnd } } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const total = monthSales.reduce((s, x) => s + x.finalPrice, 0);
  const prevTotal = prevSales.reduce((s, x) => s + x.finalPrice, 0);
  const count = monthSales.length;
  const avgTicket = count ? total / count : 0;

  // por vendedor (agrupado; escala a varios vendedores)
  const bySellerMap = new Map<string, { name: string; total: number; count: number }>();
  for (const s of sellers) bySellerMap.set(s.id, { name: s.name, total: 0, count: 0 });
  for (const sale of monthSales) {
    const row = bySellerMap.get(sale.sellerId) ?? { name: sale.seller.name, total: 0, count: 0 };
    row.total += sale.finalPrice;
    row.count += 1;
    bySellerMap.set(sale.sellerId, row);
  }
  const bySeller = [...bySellerMap.values()]
    .filter((r) => r.count > 0 || sellers.length <= 3)
    .sort((a, b) => b.total - a.total);

  // top productos
  const byProductMap = new Map<string, { name: string; total: number; count: number }>();
  for (const sale of monthSales) {
    const row = byProductMap.get(sale.productName) ?? { name: sale.productName, total: 0, count: 0 };
    row.total += sale.finalPrice;
    row.count += 1;
    byProductMap.set(sale.productName, row);
  }
  const topProducts = [...byProductMap.values()].sort((a, b) => b.count - a.count).slice(0, 8);

  // facturación por día
  const daysInMonth = new Date(end.getTime() - 1).getDate();
  const byDay = Array.from({ length: daysInMonth }, (_, i) => ({
    label: String(i + 1).padStart(2, "0"),
    total: 0,
  }));
  for (const sale of monthSales) {
    byDay[sale.soldAt.getDate() - 1].total += sale.finalPrice;
  }

  // opciones de meses (últimos 12)
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      value: v,
      label: d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
    });
  }

  return (
    <MetricsView
      ym={ym}
      months={months}
      total={total}
      prevTotal={prevTotal}
      count={count}
      avgTicket={avgTicket}
      bySeller={bySeller}
      topProducts={topProducts}
      byDay={byDay}
    />
  );
}
