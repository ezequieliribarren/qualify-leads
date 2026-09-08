"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, isLeadStatus, type LeadStatus } from "@/lib/enums";
import { normalizePhone } from "@/lib/utils";

async function requireUser() {
  const session = await auth();
  if (!session) throw new Error("No autenticado");
  return session.user;
}

/**
 * Cambia el estado de un lead. NO maneja el caso "ganado": ese pasa por
 * registerSale() para que además cargue la venta. Si acá llega "ganado"
 * sin venta, lo rechazamos.
 */
export async function updateLeadStatus(leadId: string, status: string) {
  await requireUser();
  if (!isLeadStatus(status)) throw new Error("Estado inválido");
  if (status === "ganado") {
    return { ok: false as const, needsSale: true as const };
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead no encontrado");
  if (lead.status === status) return { ok: true as const };

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status,
      lastContactAt: new Date(),
      events: {
        create: {
          type: "status_change",
          body: `Estado: ${LEAD_STATUS_LABEL[lead.status as LeadStatus] ?? lead.status} → ${
            LEAD_STATUS_LABEL[status as LeadStatus]
          }`,
        },
      },
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { ok: true as const };
}

const noteSchema = z.object({ leadId: z.string().min(1), body: z.string().trim().min(1).max(2000) });

export async function addLeadNote(input: z.infer<typeof noteSchema>) {
  await requireUser();
  const { leadId, body } = noteSchema.parse(input);

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead no encontrado");

  const stamp = new Date().toLocaleDateString("es-AR");
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      lastContactAt: new Date(),
      // campo libre: texto plano, más reciente arriba
      notes: `[${stamp}] ${body}\n${lead.notes}`.trim(),
      events: { create: { type: "note", body } },
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { ok: true as const };
}

const createLeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(3).max(40),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function createLead(input: z.infer<typeof createLeadSchema>) {
  const user = await requireUser();
  const data = createLeadSchema.parse(input);
  const status = data.status ?? "nuevo";
  const phone = normalizePhone(data.phone) || data.phone;

  const existing = await prisma.lead.findUnique({ where: { phone } });
  if (existing) return { ok: false as const, error: "Ya existe un lead con ese teléfono." };

  const lead = await prisma.lead.create({
    data: {
      name: data.name,
      phone,
      status,
      source: "manual",
      notes: data.notes ?? "",
      assignedToId: user.id,
      events: { create: { type: "note", body: "Lead creado manualmente." } },
    },
  });

  revalidatePath("/leads");
  return { ok: true as const, id: lead.id };
}
