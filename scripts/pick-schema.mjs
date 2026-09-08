// Genera prisma/schema.prisma a partir del schema correcto según DATABASE_URL.
//   mysql://... | mysql2://...  -> prisma/schema.mysql.prisma
//   cualquier otra cosa         -> prisma/schema.sqlite.prisma  (file:./dev.db)
//
// Se corre solo en postinstall, dev, build y los scripts db:*.
// No hace falta ejecutarlo a mano ni tocar prisma/schema.prisma.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Lee DATABASE_URL de process.env o de un .env simple si existe.
let url = process.env.DATABASE_URL ?? "";
if (!url && existsSync(join(root, ".env"))) {
  const env = readFileSync(join(root, ".env"), "utf8");
  const m = env.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\n]+)/m);
  if (m) url = m[1];
}

const isMysql = /^mysql/i.test(url.trim());
const source = isMysql ? "prisma/schema.mysql.prisma" : "prisma/schema.sqlite.prisma";

const content = readFileSync(join(root, source), "utf8");
const header = `// ⚠️  ARCHIVO GENERADO por scripts/pick-schema.mjs — NO EDITAR.\n// Editá ${source} en su lugar.\n\n`;
writeFileSync(join(root, "prisma/schema.prisma"), header + content);

console.log(`[pick-schema] ${isMysql ? "MySQL" : "SQLite"}  ->  prisma/schema.prisma  (fuente: ${source})`);
