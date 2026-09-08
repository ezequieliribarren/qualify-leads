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

  const vendedorUser = (process.env.SEED_VENDEDOR_USUARIO ?? "").toLowerCase().trim();
  const vendedorPass = process.env.SEED_VENDEDOR_PASSWORD ?? "";
  const adminUser = (process.env.SEED_ADMIN_USUARIO ?? "").toLowerCase().trim();
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "";

  if (!vendedorUser || !vendedorPass) {
    console.warn(
      "[seed-prod] Base vacía pero faltan SEED_VENDEDOR_USUARIO / SEED_VENDEDOR_PASSWORD. " +
        "Cargá esas variables en el panel y volvé a deployar.",
    );
    return;
  }

  await prisma.user.create({
    data: {
      name: "Vendedor",
      email: vendedorUser,
      password: await bcrypt.hash(vendedorPass, 10),
      role: "vendedor",
    },
  });
  console.log(`[seed-prod] Usuario vendedor creado: ${vendedorUser}`);

  if (adminUser && adminPass && adminUser !== vendedorUser) {
    await prisma.user.create({
      data: {
        name: "Admin",
        email: adminUser,
        password: await bcrypt.hash(adminPass, 10),
        role: "admin",
      },
    });
    console.log(`[seed-prod] Usuario admin creado: ${adminUser}`);
  }
}

main()
  .catch((e) => {
    console.error("[seed-prod]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
