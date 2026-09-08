# Dashboard de Leads de WhatsApp — MVP

Dashboard interno para ordenar los leads que llegan por WhatsApp y registrar las ventas
que se cierran por ese canal. Pensado para **un vendedor** hoy, con el modelo de datos
listo para escalar a varios.

## Qué hace

- **Leads**: lista de todos los leads, filtro por estado, buscador, orden por "hace cuánto
  no se toca" y resaltado de los que se están enfriando (7+ días sin novedad). Cambio de
  estado en 1 click desde la tabla.
- **Marcar como Ganado**: al pasar un lead a *Ganado* se abre un formulario (producto —
  con alta rápida inline —, precio editable, fecha, tipo de entrega). Al guardar se crea la
  venta con nombre y precio "congelados" y se generan los recordatorios de remarketing.
- **Catálogo**: alta/edición de productos, precio base, categorías/tags, activar/desactivar.
- **Remarketing**: pantalla tipo to-do con los recordatorios vencidos / de hoy. Muestra el
  mensaje sugerido con botón de copiar y "abrir en WhatsApp". **Nunca envía mensajes solo.**
  Reglas configurables desde `/remarketing/reglas`.
- **Métricas**: facturación del mes vs. mes anterior, ventas ganadas, ticket promedio,
  facturación por vendedor (agrupado), ranking de productos y gráfico de barras por día.
  Selector de mes (últimos 12).

## Stack

Next.js 14 (App Router) · TypeScript · Prisma · Tailwind + componentes estilo shadcn/ui ·
Auth.js (NextAuth v4, credenciales) · Recharts · Server Components + Server Actions (sin
librerías de estado).

### Base de datos: SQLite en local, Postgres en producción

Para que `npm run dev` funcione **sin instalar nada**, el MVP usa **SQLite** localmente.
El schema es portable: no usa enums nativos ni columnas array. Los "enums" son strings
validados en la app (`src/lib/enums.ts`) y las categorías de producto son un string
separado por comas.

Para pasar a Postgres (Neon / Supabase) ver [Desplegar la base](#2-base-de-datos-postgres-gestionado).

---

## Correr en local

Requisitos: Node 20+.

```bash
cp .env.example .env
# editá .env: al menos poné un NEXTAUTH_SECRET (openssl rand -base64 32)

npm install
npm run db:reset      # crea la DB SQLite + carga datos de ejemplo (seed)
npm run dev
```

Abrí http://localhost:3000 e ingresá con los usuarios del seed:

| Rol      | Email                  | Contraseña  |
|----------|------------------------|-------------|
| Admin    | `admin@local.test`     | `admin1234` |
| Vendedor | `vendedor@local.test`  | `vende1234` |

(Se pueden cambiar en `.env` antes de correr el seed.)

El seed carga: 6 leads en distintos estados, 5 productos (con categorías), 2 ventas ya
registradas (una genera una tarea de remarketing de sublimación **ya vencida**, visible en
`/remarketing`) y 2 reglas de remarketing (sublimación → 20 días, láser → 30 días).

### Scripts

| Script             | Qué hace                                                   |
|--------------------|-----------------------------------------------------------|
| `npm run dev`      | Servidor de desarrollo                                     |
| `npm run build`    | Elige schema + `prisma generate` + build de producción     |
| `npm run db:push`  | Aplica el schema a la DB (sin migración formal)            |
| `npm run db:seed`  | Carga datos de ejemplo                                     |
| `npm run db:reset` | Recrea la DB desde cero + seed                             |
| `npm run db:studio`| Prisma Studio (ver/editar datos)                           |

### Variables de entorno

| Variable                  | Para qué                                                       |
|---------------------------|--------------------------------------------------------------|
| `DATABASE_URL`            | Conexión a la DB. **Define el motor**: `file:` → SQLite, `mysql://` → MySQL |
| `NEXTAUTH_SECRET`         | Firma de sesiones. **Obligatoria** (texto largo al azar)      |
| `NEXTAUTH_URL`            | URL pública de la app (local: `http://localhost:3000`)        |
| `EVOLUTION_WEBHOOK_TOKEN` | Token que valida el webhook de Evolution API                  |
| `SEED_*`                  | Email/clave de los usuarios que crea el seed                  |

### SQLite / MySQL: se elige solo

No hay que editar `prisma/schema.prisma` (de hecho es un archivo generado). El script
`scripts/pick-schema.mjs` corre antes de `dev` / `build` / `db:*` y arma el schema a partir
de:

- `prisma/schema.sqlite.prisma` — si `DATABASE_URL` empieza con `file:`
- `prisma/schema.mysql.prisma` — si empieza con `mysql://`

O sea: **local con SQLite, Hostinger con MySQL, mismo repo, sin tocar código.**

---

## Subir a GitHub

El repo ya está inicializado con un primer commit. Para publicarlo:

1. Creá un repo **vacío** en [github.com/new](https://github.com/new) (sin README ni
   `.gitignore`), por ejemplo `qualify-leads`. **Privado** está bien.
2. En la carpeta del proyecto:

   ```bash
   git remote add origin https://github.com/TU_USUARIO/qualify-leads.git
   git branch -M main
   git push -u origin main
   ```

Listo. El `.env` no se sube (está en `.gitignore`); `.env.example` sí, como plantilla.

---

## Desplegar en Hostinger (Node + MySQL) — paso a paso

### 1. Crear la base de datos MySQL

1. hPanel → **Bases de datos** → **MySQL** → *Crear nueva base de datos*.
2. Anotá: **nombre de la base**, **usuario**, **contraseña**, **host** (suele ser
   `localhost` si la app corre en el mismo hosting, o el que indique el panel).
3. Armá la URL:
   `mysql://USUARIO:CONTRASEÑA@HOST:3306/NOMBRE_DB`
   (si la contraseña tiene caracteres raros como `@` `#` `/`, cambialos por su código:
   `@`→`%40`, `#`→`%23`, `/`→`%2F`).

### 2. Conectar el repo de GitHub

1. hPanel → tu sitio → **Node.js** (o **Avanzado → GitHub**) → conectá el repositorio y la
   rama `main`.
2. Versión de Node: **20** o superior.
3. **Build command:** `npm install && npm run build`
4. **Start command:** `npm start`

### 3. Variables de entorno (en el panel de Node.js de Hostinger)

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `mysql://USUARIO:CONTRASEÑA@HOST:3306/NOMBRE_DB` (paso 1) |
| `NEXTAUTH_SECRET` | un texto largo al azar (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `https://TU-DOMINIO` (el dominio real del sitio) |
| `EVOLUTION_WEBHOOK_TOKEN` | un texto largo al azar (lo vas a usar al conectar WhatsApp) |

### 4. Crear las tablas y el usuario del vendedor (una sola vez)

Desde **tu computadora**, apuntando a la base de Hostinger:

```bash
# 1. poné temporalmente la URL de Hostinger en tu .env (o exportala):
#    DATABASE_URL="mysql://USUARIO:CONTRASEÑA@HOST:3306/NOMBRE_DB"

npm run db:push     # crea las tablas en la DB de Hostinger
npm run db:seed     # crea usuarios + datos de ejemplo

# 2. volvé tu .env a  file:./dev.db  para seguir laburando local
```

> Si Hostinger no permite conexiones MySQL externas, activá *Remote MySQL* en hPanel
> agregando tu IP, o corré esos comandos desde la consola SSH del plan.

Después **cambiá las contraseñas** de los usuarios (entrá al dashboard, o `npm run db:studio`).

### 5. Deploy

Hostinger hace el build y levanta la app. Cada `git push` a `main` vuelve a desplegar.
Entrá a `https://TU-DOMINIO`, login con el usuario del vendedor.

> **Alternativa Vercel:** mismo flujo — importás el repo, cargás las 4 variables, y para las
> tablas corrés el paso 4 igual. Con `DATABASE_URL` tipo `mysql://` (Hostinger) o de un
> Postgres gestionado (Neon/Supabase) — en ese caso poné la URL `postgresql://...` y agregá
> un `prisma/schema.postgres.prisma`; para MySQL no hace falta nada.

---

## Evolution API (conexión real con WhatsApp)

> Evolution API mantiene una conexión persistente con WhatsApp Web, así que **necesita un
> servidor propio corriendo 24/7** (un VPS). No se puede en hosting "sin servidor". El
> dashboard puede seguir en Vercel/Hostinger: son cosas separadas.

### Levantar Evolution API en un VPS de Hostinger

1. Contratá un **VPS KVM 1** (el más chico alcanza).
2. Al crearlo, elegí la **plantilla de aplicación → "Evolution API"** (Hostinger la instala
   con Docker, Postgres y Redis). Si preferís a mano:

   ```bash
   # en el VPS
   mkdir evolution && cd evolution
   # docker-compose.yml de ejemplo (ver docs oficiales para la última versión)
   docker compose up -d
   ```

   Variables clave de Evolution (`.env` del contenedor):
   - `AUTHENTICATION_API_KEY` → una API key fuerte (la vas a usar para todo).
   - `SERVER_URL` → `https://tu-vps-o-dominio`.

3. Poné un dominio/subdominio apuntando al VPS y SSL (Hostinger permite gestionarlo; o
   Caddy/Nginx + Let's Encrypt).

### Vincular el número del vendedor (QR)

1. Crear la instancia:

   ```bash
   curl -X POST https://TU-EVOLUTION/instance/create \
     -H "apikey: TU_API_KEY" -H "Content-Type: application/json" \
     -d '{"instanceName":"vendedor","integration":"WHATSAPP-BAILEYS"}'
   ```

2. Pedir el QR y escanearlo desde el WhatsApp del vendedor
   (*Dispositivos vinculados → Vincular dispositivo*):

   ```bash
   curl https://TU-EVOLUTION/instance/connect/vendedor -H "apikey: TU_API_KEY"
   ```

   Devuelve el QR (base64 / string). El panel web de Evolution también lo muestra como
   imagen. Cuando el estado pasa a `open`, quedó vinculado.

### Apuntar el webhook al dashboard

Configurá el webhook de la instancia hacia este endpoint del dashboard:

```bash
curl -X POST https://TU-EVOLUTION/webhook/set/vendedor \
  -H "apikey: TU_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://TU-DASHBOARD/api/webhooks/evolution",
      "headers": { "Authorization": "Bearer TU_EVOLUTION_WEBHOOK_TOKEN" },
      "events": ["MESSAGES_UPSERT"]
    }
  }'
```

- `TU_EVOLUTION_WEBHOOK_TOKEN` = el mismo valor que `EVOLUTION_WEBHOOK_TOKEN` del dashboard.
- El endpoint: si el teléfono no existe como lead lo **crea** (estado *Nuevo*); si existe,
  actualiza *último contacto* y agrega el mensaje al historial.

### Probar el webhook sin Evolution (mock)

```bash
curl -X POST http://localhost:3000/api/webhooks/evolution \
  -H "Authorization: Bearer <EVOLUTION_WEBHOOK_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"data":{"key":{"remoteJid":"5491199998888@s.whatsapp.net","fromMe":false,"pushName":"Cliente Test"},"message":{"conversation":"Hola, quiero precio de una estampadora"}}}'
```

Recargá `/leads`: aparece el lead nuevo.

---

## Motor de remarketing

Al confirmar una venta se generan **tareas sugeridas** (nunca se envía nada):

1. **Regla fija por tipo de entrega** (siempre, a los 3 días):
   - *Envío* → "¿Te llegó todo bien?"
   - *Local* → "¿Cómo te está yendo?" + 1-2 mensajes de acompañamiento opcionales.
   - Vive en código (`src/lib/remarketing.ts`) porque es parte del proceso, no un caso de negocio.
2. **Reglas por categoría del producto** (`RemarketingRule`, editable desde el dashboard):
   por cada regla activa cuya categoría matchee `Product.category`, se crea una tarea extra
   a los N días. Ej. precargado: `sublimacion → 20 días → "insumos de sublimación"`.
   Para agregar "impresora láser → 30 días → tóner" no se toca código: se carga en
   `/remarketing/reglas`.

Los textos admiten `{nombre}` y `{producto}` (también `[nombre]` / `[producto]`).

---

## Fuera de alcance (modelo de datos ya preparado)

Multi-vendedor con permisos separados · envío automático de mensajes · respuestas con IA ·
reportes exportables · app mobile.

## Estructura

```
prisma/
  schema.prisma          modelo de datos
  seed.ts                datos de ejemplo
src/
  app/
    (app)/               páginas protegidas: leads, catalog, remarketing, metrics
    login/               login
    api/auth/            NextAuth
    api/webhooks/evolution/  webhook de WhatsApp
  actions/               Server Actions (leads, sales, products, remarketing)
  lib/                   prisma, auth, enums, remarketing engine, utils
  components/            UI (estilo shadcn) + vistas por pantalla
  middleware.ts          protege todo salvo login / webhook
```
