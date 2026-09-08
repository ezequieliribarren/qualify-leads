import { prisma } from "@/lib/prisma";
import { LeadsView } from "@/components/leads/leads-view";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const [leads, products] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { lastContactAt: "asc" }, // más "frío" primero
      include: {
        assignedTo: { select: { name: true } },
        events: { orderBy: { createdAt: "desc" }, take: 30 },
        _count: { select: { sales: true } },
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, basePrice: true, category: true },
    }),
  ]);

  const rows = leads.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    status: l.status,
    source: l.source,
    notes: l.notes,
    createdAt: l.createdAt.toISOString(),
    lastContactAt: l.lastContactAt.toISOString(),
    assignedTo: l.assignedTo?.name ?? null,
    salesCount: l._count.sales,
    events: l.events.map((e) => ({
      id: e.id,
      type: e.type,
      body: e.body,
      createdAt: e.createdAt.toISOString(),
    })),
  }));

  return <LeadsView rows={rows} products={products} />;
}
