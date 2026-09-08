import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Seed de PRODUCCIÓN — idempotente y seguro de correr en cada deploy.
 *
 * - Si ya existe algún usuario, NO hace nada (no pisa datos).
 * - Si la base está vacía, crea el/los usuario(s) de login a partir de las
 *   variables SEED_* del entorno. NO carga datos de ejemplo (leads/productos).
 *
 * Se usa en el build command de Hostinger:
 *   npm install && npm run db:push && npm run db:seed:prod && npm run build
 */

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log(`[seed-prod] Ya hay ${count} usuario(s). No hago nada.`);
    return;
  }

  const vendedorEmail = (process.env.SEED_VENDEDOR_EMAIL ?? "").toLowerCase().trim();
  const vendedorPass = process.env.SEED_VENDEDOR_PASSWORD ?? "";
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase().trim();
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "";

  if (!vendedorEmail || !vendedorPass) {
    console.warn(
      "[seed-prod] Base vacía pero faltan SEED_VENDEDOR_EMAIL / SEED_VENDEDOR_PASSWORD. " +
        "Cargá esas variables en el panel y volvé a deployar.",
    );
    return;
  }

  await prisma.user.create({
    data: {
      name: "Vendedor",
      email: vendedorEmail,
      password: await bcrypt.hash(vendedorPass, 10),
      role: "vendedor",
    },
  });
  console.log(`[seed-prod] Usuario vendedor creado: ${vendedorEmail}`);

  if (adminEmail && adminPass && adminEmail !== vendedorEmail) {
    await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        password: await bcrypt.hash(adminPass, 10),
        role: "admin",
      },
    });
    console.log(`[seed-prod] Usuario admin creado: ${adminEmail}`);
  }
}

main()
  .catch((e) => {
    console.error("[seed-prod]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
