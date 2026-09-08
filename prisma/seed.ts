import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateRemarketingTasks } from "../src/lib/remarketing";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("🌱 Seed…");

  // ── Limpieza (orden por FKs) ──────────────────────────────
  await prisma.remarketingTask.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.leadEvent.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.product.deleteMany();
  await prisma.remarketingRule.deleteMany();
  await prisma.user.deleteMany();

  // ── Usuarios ─────────────────────────────────────────────
  const adminUser = (process.env.SEED_ADMIN_USUARIO ?? "admin").toLowerCase();
  const vendedorUser = (process.env.SEED_VENDEDOR_USUARIO ?? "vendedor").toLowerCase();

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: adminUser,
      password: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "admin1234", 10),
      role: "admin",
    },
  });
  const vendedor = await prisma.user.create({
    data: {
      name: "Vendedor",
      email: vendedorUser,
      password: await bcrypt.hash(process.env.SEED_VENDEDOR_PASSWORD ?? "vende1234", 10),
      role: "vendedor",
    },
  });

  // ── Catálogo ─────────────────────────────────────────────
  const estampadora = await prisma.product.create({
    data: { name: "Estampadora / plancha 38x38", basePrice: 185000, category: "sublimacion,estampado" },
  });
  const impresoraSubli = await prisma.product.create({
    data: { name: "Impresora de sublimación A4", basePrice: 240000, category: "sublimacion" },
  });
  const tazas = await prisma.product.create({
    data: { name: "Pack 50 tazas para sublimar", basePrice: 62000, category: "insumos,sublimacion" },
  });
  const laser = await prisma.product.create({
    data: { name: "Impresora láser monocromática", basePrice: 320000, category: "laser,impresion" },
  });
  await prisma.product.create({
    data: { name: "Guillotina A3 (descontinuada)", basePrice: 45000, category: "corte", active: false },
  });

  // ── Reglas de remarketing (dato, no código) ──────────────
  await prisma.remarketingRule.create({
    data: {
      name: "Sublimación → insumos a los 20 días",
      category: "sublimacion",
      daysAfter: 20,
      messageTemplate:
        "Hola {nombre}! ¿Cómo veniste con la {producto}? Te cuento que tenemos insumos de sublimación (papel, tinta, planchas) por si te hacen falta reponer.",
    },
  });
  await prisma.remarketingRule.create({
    data: {
      name: "Láser → tóner a los 30 días",
      category: "laser",
      daysAfter: 30,
      messageTemplate:
        "Hola {nombre}! ¿Cómo anda la {producto}? Si estás por quedarte sin tóner tenemos repuesto original y alternativo.",
      active: true,
    },
  });

  // ── Leads ────────────────────────────────────────────────
  const leadsData = [
    { name: "María López", phone: "5491133334444", status: "nuevo", days: 0 },
    { name: "Juan Pérez", phone: "5491155556666", status: "en_conversacion", days: 2 },
    { name: "Comercial Andes", phone: "5492614445555", status: "cotizado", days: 9 },
    { name: "Carla Giménez", phone: "5491166667777", status: "en_conversacion", days: 14 },
    { name: "Kiosco El Sol", phone: "5493514448888", status: "cotizado", days: 21 },
    { name: "Diego Fernández", phone: "5491188889999", status: "perdido", days: 30 },
  ];

  const leads: Record<string, string> = {};
  for (const l of leadsData) {
    const lead = await prisma.lead.create({
      data: {
        name: l.name,
        phone: l.phone,
        status: l.status,
        source: "whatsapp",
        assignedToId: vendedor.id,
        createdAt: daysAgo(l.days + 3),
        lastContactAt: daysAgo(l.days),
        notes: `[${daysAgo(l.days).toLocaleDateString("es-AR")}] Último contacto por WhatsApp.`,
        events: {
          create: [
            { type: "inbound_message", body: "Hola! Quería consultar precios.", createdAt: daysAgo(l.days + 3) },
            { type: "status_change", body: `Estado → ${l.status}`, createdAt: daysAgo(l.days) },
          ],
        },
      },
    });
    leads[l.name] = lead.id;
  }

  // ── Ventas ya cargadas (2) + sus tareas de remarketing ───
  async function registrarVenta(opts: {
    leadName: string;
    productId: string;
    productName: string;
    productCategory: string;
    finalPrice: number;
    deliveryType: "envio" | "local";
    days: number;
  }) {
    const leadId = leads[opts.leadName];
    const soldAt = daysAgo(opts.days);
    const sale = await prisma.sale.create({
      data: {
        leadId,
        productId: opts.productId,
        productName: opts.productName,
        finalPrice: opts.finalPrice,
        deliveryType: opts.deliveryType,
        soldAt,
        sellerId: vendedor.id,
      },
    });
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "ganado",
        lastContactAt: soldAt,
        events: { create: { type: "sale", body: `Venta registrada: ${opts.productName}`, createdAt: soldAt } },
      },
    });
    await generateRemarketingTasks(prisma, {
      saleId: sale.id,
      soldAt,
      leadName: opts.leadName,
      productName: opts.productName,
      productCategory: opts.productCategory,
      deliveryType: opts.deliveryType,
    });
  }

  await registrarVenta({
    leadName: "Comercial Andes",
    productId: estampadora.id,
    productName: estampadora.name,
    productCategory: estampadora.category,
    finalPrice: 175000,
    deliveryType: "envio",
    days: 22, // -> tarea de sublimación (20d) YA vencida, aparece en /remarketing
  });
  await registrarVenta({
    leadName: "Kiosco El Sol",
    productId: tazas.id,
    productName: tazas.name,
    productCategory: tazas.category,
    finalPrice: 62000,
    deliveryType: "local",
    days: 1, // -> tarea "todo ok?" (3d) próxima
  });

  console.log("✅ Seed listo.");
  console.log(`   Admin:    usuario "${admin.email}" / ${process.env.SEED_ADMIN_PASSWORD ?? "admin1234"}`);
  console.log(`   Vendedor: usuario "${vendedor.email}" / ${process.env.SEED_VENDEDOR_PASSWORD ?? "vende1234"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
