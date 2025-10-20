![Vercel with Neon](./assets/home.png)

-> View demo: [vercel-marketplace-neon.vercel.app](https://vercel-marketplace-neon.vercel.app/)

# Neon Postgres

Una plataforma operativa completa para Inglés Rápido Manta construida con Next.js, Vercel y Neon. El proyecto combina páginas públicas, flujos de check-in, paneles administrativos y APIs internas que comparten un mismo conjunto tipado de consultas a Postgres.

## Application Overview

- **Bienvenida y marketing.** La página principal introduce la escuela, muestra llamados a la acción y responde a parámetros de URL para confirmar registros recientes.【F:app/page.tsx†L1-L149】
- **Check-in autónomo de estudiantes.** El flujo en `/registro` permite seleccionar niveles y lecciones disponibles, ver asistencias activas y volver rápidamente al panel administrativo.【F:app/registro/page.tsx†L1-L113】【F:features/student-checkin/data/queries.ts†L1-L160】
- **Centro administrativo.** Desde `/administracion` se navega a gestión de estudiantes, reportes de nómina, registro del personal, calendario, configuración y ayuda interna.【F:app/administracion/page.tsx†L1-L127】
- **Paneles gerenciales.** Las rutas `/management/engagement` y `/management/learning` presentan tableros con datos de actividad y progreso derivados de vistas `mgmt` en Neon.【F:app/management/engagement/page.tsx†L1-L11】【F:app/management/learning/page.tsx†L1-L12】
- **Informes ejecutivos.** `/reports/resumen-general` consolida encabezados, KPIs, bandas de progreso y estados por nivel reutilizando componentes especializados.【F:app/reports/resumen-general/page.tsx†L1-L32】【F:components/reports/resumen/ResumenHeaderTiles.tsx†L1-L121】
- **API interna.** Las rutas en `app/api` abastecen dashboards y automatizaciones, como la API de heatmap de engagement y los endpoints de nómina protegidos por PINs gerenciales.【F:app/api/engagement/heatmap/route.ts†L1-L36】【F:app/api/(administration)/payroll/reports/day-sessions/route.ts†L1-L99】

## Code Organization

- **`app/`** contiene las rutas de la App Router, incluidas experiencias públicas, paneles administrativos y endpoints serverless.【F:app/administracion/page.tsx†L1-L127】【F:app/api/(administration)/payroll/reports/day-sessions/route.ts†L1-L99】
- **`components/`** agrupa la UI reutilizable para dashboards, reportes y flujos de estudiantes, por ejemplo el tablero de engagement y los módulos del resumen general.【F:components/management/engagement/EngagementDashboard.tsx†L1-L68】【F:components/reports/resumen/LevelStateStacked.tsx†L1-L156】
- **`features/`** encapsula lógica de dominio para administración, seguridad, personal y check-in estudiantil; expone consultas fuertemente tipadas y componentes conectados a datos.【F:features/administration/data/students.ts†L1-L120】【F:features/security/components/PinGate.tsx†L1-L43】【F:features/staff/components/staff-check-in-form.tsx†L1-L200】
- **`src/features/`** aloja data loaders específicos de los tableros gerenciales y del informe resumen, reutilizados por componentes y APIs.【F:src/features/management/learning/data/learning.read.ts†L1-L140】【F:src/features/reports/resumen/data.ts†L1-L160】
- **`lib/`** centraliza la infraestructura de acceso a datos, normalización de filas, reglas de nómina y utilidades de tiempo y seguridad.【F:lib/db/client.ts†L1-L138】【F:lib/payroll/reports-service.ts†L1-L160】【F:lib/security/pin-session.ts†L1-L160】
- **`types/`** comparte contratos TypeScript entre APIs y UI, incluidos los modelos de reportes gerenciales.【F:types/reports.resumen.ts†L1-L45】【F:types/management.engagement.ts†L1-L87】
- **`scripts/` y `tests/`** contienen herramientas de soporte (SQL de referencia y cargador TypeScript) y la batería de pruebas que valida cálculos de nómina, fechas y autorizaciones.【F:scripts/ts-loader.mjs†L1-L79】【F:tests/payroll-reports-service.test.mjs†L1-L160】
- **`src/config/env.ts`** define el acceso tipado a variables de entorno, usadas por los clientes SQL y servicios que requieren tokens.【F:src/config/env.ts†L1-L38】【F:lib/db/client.ts†L1-L20】

## Getting Started

Click the "Deploy" button to clone this repo, create a new Vercel project, setup the Neon integration, and provision a new Neon database:

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fneondatabase-labs%2Fvercel-marketplace-neon%2Ftree%2Fmain&project-name=my-vercel-neon-app&repository-name=my-vercel-neon-app&products=[{%22type%22:%22integration%22,%22integrationSlug%22:%22neon%22,%22productSlug%22:%22neon%22,%22protocol%22:%22storage%22}])

Once the process is complete, you can clone the newly created GitHub repository and start making changes locally.

## Local Setup

### Installation

Install the dependencies:

```bash
npm install
```

You can use the package manager of your choice. For example, Vercel also supports `bun install` out of the box.

### Development

#### Create a .env file in the project root

```bash
cp .env.example .env
```

#### Get your database URL

Obtain the database connection string from the Connection Details widget on the [Neon Dashboard](https://console.neon.tech/).

#### Add the database URL to the .env file

Update the `.env` file with your database connection string:

```txt
# The connection string has the format `postgres://user:pass@host/db`
DATABASE_URL=<your-string-here>
```

#### Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Neon, check out the Neon documentation:

- [Neon Documentation](https://neon.tech/docs/introduction) - learn about Neon's features and SDKs.
- [Neon Discord](https://discord.gg/9kf3G4yUZk) - join the Neon Discord server to ask questions and join the community.
- [ORM Integrations](https://neon.tech/docs/get-started-with-neon/orms) - find Object-Relational Mappers (ORMs) that work with Neon.

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

Commit and push your code changes to your GitHub repository to automatically trigger a new deployment.

## Panel "Resumen general"

La pestaña **Resumen general** dentro de los informes de gestión consume vistas del esquema `mgmt` en Neon a través de endpoints JSON y agrega el estado actual de `student_management_v` para los estados por nivel.

- `/api/reports/resumen/header` → `mgmt.gen_header_v`
- `/api/reports/resumen/level/bands` → `mgmt.gen_level_progress_bands_v`
- `/api/reports/resumen/level/kpis` → `mgmt.gen_level_kpis_v`
- `/api/reports/resumen/level/states` → distribución de estados por nivel (agrupado desde `public.student_management_v`)

Los datos se tipan en `types/reports.resumen.ts` y se reutilizan tanto en la API como en la interfaz. El panel final se compone de los componentes siguientes:

- `components/reports/resumen/ResumenHeaderTiles.tsx`
- `components/reports/resumen/ProgressByLevelStacked.tsx`
- `components/reports/resumen/LevelStateStacked.tsx`
- `components/reports/resumen/LevelKpiMatrix.tsx`

Para ver el tablero completo de un vistazo, visita `/reports/resumen-general`.
