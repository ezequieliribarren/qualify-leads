import Link from "next/link";
import { Settings2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { RemarketingView } from "@/components/remarketing/remarketing-view";

export const dynamic = "force-dynamic";

export default async function RemarketingPage() {
  const now = new Date();
  const tasks = await prisma.remarketingTask.findMany({
    where: { contactedAt: null },
    orderBy: { dueAt: "asc" },
    include: {
      sale: { include: { lead: true, seller: { select: { name: true } } } },
    },
  });

  const dueOrOverdue = tasks.filter((t) => t.dueAt <= now);
  const upcoming = tasks.filter((t) => t.dueAt > now).slice(0, 20);

  const recentDone = await prisma.remarketingTask.findMany({
    where: { contactedAt: { not: null } },
    orderBy: { contactedAt: "desc" },
    take: 10,
    include: { sale: { include: { lead: true } } },
  });

  const map = (t: (typeof tasks)[number]) => ({
    id: t.id,
    kind: t.kind,
    dueAt: t.dueAt.toISOString(),
    suggestedMessage: t.suggestedMessage,
    altMessages: t.altMessages ? t.altMessages.split("||").filter(Boolean) : [],
    contactedAt: t.contactedAt ? t.contactedAt.toISOString() : null,
    leadName: t.sale.lead?.name ?? t.sale.customerName ?? "Cliente",
    leadPhone: t.sale.lead?.phone ?? "",
    productName: t.sale.productName,
    seller: t.sale.seller.name,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Remarketing</h1>
          <p className="text-sm text-muted-foreground">
            Recordatorios para contactar clientes. El sistema <strong>no envía nada</strong>: copiás
            el mensaje y lo pegás en WhatsApp.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/remarketing/reglas">
            <Settings2 className="h-4 w-4" /> Reglas
          </Link>
        </Button>
      </div>

      <RemarketingView
        due={dueOrOverdue.map(map)}
        upcoming={upcoming.map(map)}
        recentDone={recentDone.map((t) => ({
          id: t.id,
          leadName: t.sale.lead?.name ?? t.sale.customerName ?? "Cliente",
          productName: t.sale.productName,
          contactedAt: t.contactedAt!.toISOString(),
        }))}
      />
    </div>
  );
}
