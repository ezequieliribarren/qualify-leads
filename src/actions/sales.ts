"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DELIVERY_TYPES } from "@/lib/enums";
import { generateRemarketingTasks } from "@/lib/remarketing";

async function requireUser() {
  const session = await auth();
  if (!session) throw new Error("No autenticado");
  return session.user;
}

const saleSchema = z.object({
  leadId: z.string().min(1),
  // producto existente…
  productId: z.string().optional(),
  // …o alta rápida inline
  newProductName: z.string().trim().max(160).optional(),
  newProductPrice: z.coerce.number().min(0).optional(),
  finalPrice: z.coerce.number().min(0),
  soldAt: z.string().min(1), // yyyy-mm-dd
  deliveryType: z.enum(DELIVERY_TYPES),
});

/**
 * Flujo "Marcar como Ganado":
 *  - resuelve/crea el producto
 *  - crea la Sale con nombre y precio congelados
 *  - pasa el lead a "ganado"
 *  - genera las RemarketingTask (fijas + por regla de categoría)
 * Todo en una transacción.
 */
export async function registerSale(input: z.infer<typeof saleSchema>) {
  const user = await requireUser();
  const data = saleSchema.parse(input);

  const lead = await prisma.lead.findUnique({ where: { id: data.leadId } });
  if (!lead) return { ok: false as const, error: "Lead no encontrado." };

  const soldAt = new Date(data.soldAt + "T12:00:00");
  if (Number.isNaN(soldAt.getTime())) return { ok: false as const, error: "Fecha inválida." };

  const created = await prisma.$transaction(async (tx) => {
    let productId = data.productId || null;
    let productName = "";
    let productCategory = "";

    if (data.newProductName && data.newProductName.trim()) {
      const np = await tx.product.create({
        data: {
          name: data.newProductName.trim(),
          basePrice: data.newProductPrice ?? data.finalPrice,
          category: "",
        },
      });
      productId = np.id;
      productName = np.name;
      productCategory = np.category;
    } else if (productId) {
      const p = await tx.product.findUnique({ where: { id: productId } });
      if (!p) throw new Error("Producto no encontrado.");
      productName = p.name;
      productCategory = p.category;
    } else {
      throw new Error("Elegí un producto o cargá uno nuevo.");
    }

    const sale = await tx.sale.create({
      data: {
        leadId: lead.id,
        productId,
        productName,
        finalPrice: data.finalPrice,
        deliveryType: data.deliveryType,
        soldAt,
        sellerId: user.id,
      },
    });

    await tx.lead.update({
      where: { id: lead.id },
      data: {
        status: "ganado",
        lastContactAt: new Date(),
        events: {
          create: { type: "sale", body: `Venta registrada: ${productName} — ${data.finalPrice}` },
        },
      },
    });

    const tasks = await generateRemarketingTasks(tx, {
      saleId: sale.id,
      soldAt,
      leadName: lead.name,
      productName,
      productCategory,
      deliveryType: data.deliveryType,
    });

    return { saleId: sale.id, tasks: tasks.length };
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${data.leadId}`);
  revalidatePath("/remarketing");
  revalidatePath("/metrics");
  revalidatePath("/ventas");
  return { ok: true as const, ...created };
}

// ─────────────────────────────────────────────────────────────
// Venta directa (sin lead) — panel de ventas ya realizadas.
// ─────────────────────────────────────────────────────────────

const directSaleSchema = z.object({
  // el producto se identifica por nombre; si no existe en el catálogo se crea
  productName: z.string().trim().min(1).max(160),
  finalPrice: z.coerce.number().min(0),
  soldAt: z.string().optional(), // yyyy-mm-dd; si no viene, hoy
  deliveryType: z.enum(DELIVERY_TYPES).optional(),
  customerName: z.string().trim().max(160).optional(),
  saveToCatalog: z.boolean().optional(),
});

export async function createSale(input: z.infer<typeof directSaleSchema>) {
  const user = await requireUser();
  const data = directSaleSchema.parse(input);

  const soldAt = data.soldAt ? new Date(data.soldAt + "T12:00:00") : new Date();
  if (Number.isNaN(soldAt.getTime())) return { ok: false as const, error: "Fecha inválida." };

  // ¿el producto ya está en el catálogo? (match por nombre, sin distinguir may/min)
  const catalog = await prisma.product.findMany({ select: { id: true, name: true } });
  const match = catalog.find(
    (p) => p.name.toLowerCase() === data.productName.toLowerCase(),
  );

  let productId: string | null = match?.id ?? null;
  const productName = match?.name ?? data.productName;

  // alta rápida al catálogo si no existe y se pidió guardarlo (o siempre, para tenerlo)
  if (!productId && data.saveToCatalog !== false) {
    const np = await prisma.product.create({
      data: { name: data.productName, basePrice: data.finalPrice, category: "" },
    });
    productId = np.id;
  }

  const sale = await prisma.sale.create({
    data: {
      leadId: null,
      customerName: data.customerName || null,
      productId,
      productName,
      finalPrice: data.finalPrice,
      soldAt,
      deliveryType: data.deliveryType ?? "local",
      sellerId: user.id,
    },
  });

  revalidatePath("/ventas");
  revalidatePath("/metrics");
  revalidatePath("/catalog");
  return { ok: true as const, saleId: sale.id };
}

export async function deleteSale(saleId: string) {
  await requireUser();
  await prisma.sale.delete({ where: { id: saleId } });
  revalidatePath("/ventas");
  revalidatePath("/metrics");
  return { ok: true as const };
}
