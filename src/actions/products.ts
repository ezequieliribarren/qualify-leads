"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function requireUser() {
  const session = await auth();
  if (!session) throw new Error("No autenticado");
  return session.user;
}

const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  basePrice: z.coerce.number().min(0),
  category: z.string().trim().max(200).optional().default(""),
  active: z.boolean().optional().default(true),
});

export async function createProduct(input: z.infer<typeof productSchema>) {
  await requireUser();
  const data = productSchema.parse(input);
  const p = await prisma.product.create({
    data: {
      name: data.name,
      basePrice: data.basePrice,
      category: normalizeCategory(data.category),
      active: data.active,
    },
  });
  revalidatePath("/catalog");
  revalidatePath("/leads");
  return { ok: true as const, product: { id: p.id, name: p.name, basePrice: p.basePrice } };
}

export async function updateProduct(id: string, input: z.infer<typeof productSchema>) {
  await requireUser();
  const data = productSchema.parse(input);
  await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      basePrice: data.basePrice,
      category: normalizeCategory(data.category),
      active: data.active,
    },
  });
  revalidatePath("/catalog");
  return { ok: true as const };
}

export async function toggleProduct(id: string, active: boolean) {
  await requireUser();
  await prisma.product.update({ where: { id }, data: { active } });
  revalidatePath("/catalog");
  return { ok: true as const };
}

function normalizeCategory(raw: string) {
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .join(",");
}
