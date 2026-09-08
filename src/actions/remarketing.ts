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

export async function markTaskContacted(taskId: string, done: boolean) {
  await requireUser();
  await prisma.remarketingTask.update({
    where: { id: taskId },
    data: { contactedAt: done ? new Date() : null },
  });
  revalidatePath("/remarketing");
  revalidatePath("/leads");
  return { ok: true as const };
}

const ruleSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  daysAfter: z.coerce.number().int().min(1).max(365),
  messageTemplate: z.string().trim().min(1).max(1000),
  active: z.boolean().optional().default(true),
});

export async function createRule(input: z.infer<typeof ruleSchema>) {
  await requireUser();
  const data = ruleSchema.parse(input);
  await prisma.remarketingRule.create({
    data: { ...data, category: data.category.toLowerCase() },
  });
  revalidatePath("/remarketing/reglas");
  return { ok: true as const };
}

export async function updateRule(id: string, input: z.infer<typeof ruleSchema>) {
  await requireUser();
  const data = ruleSchema.parse(input);
  await prisma.remarketingRule.update({
    where: { id },
    data: { ...data, category: data.category.toLowerCase() },
  });
  revalidatePath("/remarketing/reglas");
  return { ok: true as const };
}

export async function toggleRule(id: string, active: boolean) {
  await requireUser();
  await prisma.remarketingRule.update({ where: { id }, data: { active } });
  revalidatePath("/remarketing/reglas");
  return { ok: true as const };
}
