import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { RulesView } from "@/components/remarketing/rules-view";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const rules = await prisma.remarketingRule.findMany({ orderBy: { daysAfter: "asc" } });
  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href="/remarketing">
          <ArrowLeft className="h-4 w-4" /> Volver a recordatorios
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold">Reglas de remarketing</h1>
        <p className="text-sm text-muted-foreground">
          “Si el producto tiene la categoría X → a los N días → sugerí este mensaje.” Se aplican
          automáticamente al registrar una venta. Usá <code>{"{nombre}"}</code> y{" "}
          <code>{"{producto}"}</code> en el texto.
        </p>
      </div>
      <RulesView
        rules={rules.map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          daysAfter: r.daysAfter,
          messageTemplate: r.messageTemplate,
          active: r.active,
        }))}
      />
    </div>
  );
}
