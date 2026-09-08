import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";

/**
 * Webhook de Evolution API (mensajes entrantes de WhatsApp).
 *
 * MVP: recibe el evento, y
 *   - si el teléfono no existe como Lead -> lo crea con estado "nuevo"
 *   - si existe -> actualiza lastContactAt y agrega el mensaje al historial
 *
 * NO responde mensajes ni automatiza nada de salida (intencional).
 *
 * Configuración en Evolution:
 *   Webhook URL  : https://TU-DASHBOARD/api/webhooks/evolution
 *   Header       : Authorization: Bearer <EVOLUTION_WEBHOOK_TOKEN>
 *   Eventos      : MESSAGES_UPSERT
 *
 * Probar a mano:
 *   curl -X POST http://localhost:3000/api/webhooks/evolution \
 *     -H "Authorization: Bearer <EVOLUTION_WEBHOOK_TOKEN>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"data":{"key":{"remoteJid":"5491133334444@s.whatsapp.net","fromMe":false,"pushName":"Test"},"message":{"conversation":"Hola, quiero info"}}}'
 */

function extractInbound(payload: any): {
  phone: string;
  name: string;
  text: string;
  fromMe: boolean;
} | null {
  const data = payload?.data ?? payload;
  const key = data?.key ?? {};
  const remoteJid: string = key.remoteJid ?? data?.remoteJid ?? "";
  if (!remoteJid || remoteJid.includes("@g.us")) return null; // ignorar grupos
  const phone = normalizePhone(remoteJid.split("@")[0] ?? "");
  if (!phone) return null;

  const msg = data?.message ?? {};
  const text: string =
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??
    msg.videoMessage?.caption ??
    data?.body ??
    "(mensaje sin texto)";

  return {
    phone,
    name: key.pushName ?? data?.pushName ?? data?.notifyName ?? `WhatsApp ${phone}`,
    text: String(text).slice(0, 1000),
    fromMe: Boolean(key.fromMe ?? data?.fromMe),
  };
}

export async function POST(req: Request) {
  const token = process.env.EVOLUTION_WEBHOOK_TOKEN;
  if (token) {
    const auth = req.headers.get("authorization") ?? "";
    const provided = auth.replace(/^Bearer\s+/i, "").trim();
    if (provided !== token) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const evt = extractInbound(payload);
  if (!evt) return NextResponse.json({ ok: true, ignored: true });
  if (evt.fromMe) return NextResponse.json({ ok: true, ignored: "fromMe" });

  const existing = await prisma.lead.findUnique({ where: { phone: evt.phone } });

  if (!existing) {
    const lead = await prisma.lead.create({
      data: {
        name: evt.name,
        phone: evt.phone,
        status: "nuevo",
        source: "whatsapp",
        notes: `[${new Date().toLocaleDateString("es-AR")}] ${evt.text}`,
        events: {
          create: { type: "inbound_message", body: evt.text },
        },
      },
    });
    return NextResponse.json({ ok: true, created: true, leadId: lead.id });
  }

  await prisma.lead.update({
    where: { id: existing.id },
    data: {
      lastContactAt: new Date(),
      name: existing.name.startsWith("WhatsApp ") ? evt.name : existing.name,
      notes: `[${new Date().toLocaleDateString("es-AR")}] ${evt.text}\n${existing.notes}`.trim(),
      events: { create: { type: "inbound_message", body: evt.text } },
    },
  });
  return NextResponse.json({ ok: true, updated: true, leadId: existing.id });
}
