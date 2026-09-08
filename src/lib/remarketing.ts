import type { PrismaClient } from "@prisma/client";
import type { DeliveryType } from "./enums";

/**
 * Motor de remarketing.
 *
 * Al confirmar una venta se generan tareas SUGERIDAS (nunca se envía nada solo):
 *
 *  1) Regla fija por tipo de entrega (siempre): tarea a los 3 días.
 *  2) Reglas por categoría/tag del producto (RemarketingRule, dato editable):
 *     por cada regla activa cuyo `category` esté contenido en Product.category,
 *     se crea una tarea adicional a los `daysAfter` días.
 *
 * Las reglas fijas viven acá (son parte del producto), las de producto viven
 * en la tabla RemarketingRule y se cargan/editan desde /remarketing/reglas.
 */

export function fillTemplate(tpl: string, vars: { nombre: string; producto: string }) {
  return tpl
    .replaceAll("{nombre}", vars.nombre)
    .replaceAll("[nombre]", vars.nombre)
    .replaceAll("{producto}", vars.producto)
    .replaceAll("[producto]", vars.producto);
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const DELIVERY_RULE: Record<
  DeliveryType,
  { days: number; message: string; alts: string[] }
> = {
  envio: {
    days: 3,
    message:
      "Hola {nombre}! Quería confirmar que te haya llegado todo bien el {producto}. ¿Está todo ok?",
    alts: [],
  },
  local: {
    days: 3,
    message:
      "Hola {nombre}! ¿Cómo te está yendo con {producto}? Cualquier duda estoy para ayudarte.",
    alts: [
      "Hola {nombre}! Te dejo un par de tips para arrancar con {producto} sin dramas. ¿Querés que te los pase?",
      "Hola {nombre}! Si ya lo probaste y te gustó, nos ayuda un montón una reseña 🙌 ¿Te animás?",
    ],
  },
};

type Tx = Pick<PrismaClient, "remarketingRule" | "remarketingTask">;

export async function generateRemarketingTasks(
  tx: Tx,
  args: {
    saleId: string;
    soldAt: Date;
    leadName: string;
    productName: string;
    productCategory: string;
    deliveryType: DeliveryType;
  },
) {
  const vars = { nombre: args.leadName, producto: args.productName };
  const created: { kind: string; dueAt: Date }[] = [];

  // 1) Regla fija por tipo de entrega
  const dr = DELIVERY_RULE[args.deliveryType];
  await tx.remarketingTask.create({
    data: {
      saleId: args.saleId,
      kind: "delivery",
      dueAt: addDays(args.soldAt, dr.days),
      suggestedMessage: fillTemplate(dr.message, vars),
      altMessages: dr.alts.map((a) => fillTemplate(a, vars)).join("||"),
    },
  });
  created.push({ kind: "delivery", dueAt: addDays(args.soldAt, dr.days) });

  // 2) Reglas por categoría del producto
  const cat = (args.productCategory || "").toLowerCase();
  if (cat.trim()) {
    const rules = await tx.remarketingRule.findMany({ where: { active: true } });
    for (const rule of rules) {
      const needle = rule.category.toLowerCase().trim();
      if (!needle) continue;
      const match = cat
        .split(",")
        .map((t) => t.trim())
        .some((t) => t === needle || t.includes(needle));
      if (!match) continue;
      await tx.remarketingTask.create({
        data: {
          saleId: args.saleId,
          kind: "rule",
          ruleId: rule.id,
          dueAt: addDays(args.soldAt, rule.daysAfter),
          suggestedMessage: fillTemplate(rule.messageTemplate, vars),
        },
      });
      created.push({ kind: "rule", dueAt: addDays(args.soldAt, rule.daysAfter) });
    }
  }

  return created;
}
