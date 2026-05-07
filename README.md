# SteadyCut Coach

SteadyCut Coach is a production-oriented monorepo scaffold for a mobile-first weight-loss coaching PWA. Phase 1 focuses on the foundations: authentication, plan setup, the daily dashboard, and daily check-ins.

The product is designed around simple rules rather than obsessive calorie tracking:

- Protein, fiber, and water before meals
- Daily walking
- Strength and cardio consistency
- Evening cutoff adherence
- Weekly pattern review instead of day-to-day guilt

This project provides general wellness tooling only. It is not medical advice.

## Stack

- `apps/web`: React, Vite, TypeScript, Tailwind, React Router, TanStack Query, `vite-plugin-pwa`
- `apps/api`: Express, TypeScript, Prisma, PostgreSQL, Zod, Pino, JWT auth, Helmet, CORS, rate limiting
- `packages/shared`: shared schemas, constants, and input types
- Local development database: PostgreSQL via Docker Compose

## Repository layout

```text
apps/
  api/
  web/
packages/
  shared/
docker-compose.yml
.env.example
README.md
```

## Implemented in Phase 1

- Monorepo scaffold with `pnpm` workspaces
- PostgreSQL Docker Compose setup
- Prisma schema covering core Phase 1 models plus future-facing placeholders
- Auth endpoints: `register`, `login`, `logout`, `me`
- Plan endpoints: current, create, update
- Dashboard endpoint for today’s checklist and coach nudge
- Daily check-in endpoints with mock coaching feedback
- Weekly review generation with green/yellow/red classification
- Reminder preference CRUD scaffold for SMS/push/email timing and templates
- Internal reminder job endpoints shaped for Cloud Scheduler and Cloud Tasks
- Storage abstraction with local and future GCS-oriented provider support
- Seed script for default meal templates
- Mobile-first PWA shell
- Public landing page
- Register and login screens
- Protected app shell
- Plan setup screen
- Dashboard screen
- Daily check-in screen
- Settings/reminders placeholder screen for future SMS and dashboard customization
- Basic profile/logout screen
- Vitest + Supertest harness for auth, plan, and check-in API flows

## Environment setup

1. Copy the env template:

```bash
cp .env.example .env
```

2. Start PostgreSQL:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
pnpm install
```

4. Generate Prisma client and run migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

5. Seed default meal templates:

```bash
pnpm db:seed
```

## Run the app

Start the API:

```bash
pnpm --filter @steadycut/api dev
```

Start the web app:

```bash
pnpm --filter @steadycut/web dev
```

Or run both workspace dev servers together:

```bash
pnpm dev
```

## Deployment

This project is designed to be deployed to **Google Cloud Platform**.

Refer to the [GCP Deployment Runbook](docs/deploy-gcp.md) for detailed instructions on:
- Setting up Cloud Run and Cloud SQL
- Configuring CI/CD with Cloud Build
- Deploying the frontend to Firebase Hosting
- Secret management and reminder job orchestration

Run API tests:

```bash
pnpm --filter @steadycut/api test
```

## API notes

- Base URL: `http://localhost:4000/api`
- Auth accepts bearer tokens and the HTTP-only cookie set during login/register.
- The current coaching response is a mock heuristic response. It is intentionally short, direct, and non-shaming.
- Weekly reviews are generated from recent check-ins and basic adherence/recovery heuristics.
- Reminder preferences are persisted, but there is no job scheduler or Twilio delivery worker yet.
- Internal reminder routes exist for orchestration and delivery, protected by an internal bearer token.

## Product notes

- The dashboard centers the daily checklist instead of calorie-counting UX.
- The check-in form supports optional weight and steps, simple adherence signals, and recovery markers.
- The seed templates match the plan assumptions in the prompt.
- Reminder logic, Twilio, scheduled jobs, in-app chat, weekly reviews, and photo uploads are intentionally deferred to later phases, but the Prisma schema leaves room for them.
- The reminder orchestration endpoint currently returns queued payloads for a scheduler/task layer and uses a placeholder SMS sender with dedupe keys recorded in `SmsMessage`.
- Dinner suggestions should be sent later in the afternoon via SMS, and occasional breakfast/lunch ideas later in the evening. That scheduling behavior is not implemented yet, but the reminder model is structured for it.

## Recommended next tasks

1. Add shared API response typing and a small frontend auth/session store.
2. Add coach provider abstraction and connect weekly review/check-in text generation through it.
3. Add a scheduler stub for Twilio message jobs, including late-afternoon dinner ideas and occasional late-evening breakfast/lunch suggestions.
4. Expand profile/settings to support real reminder persistence, SMS consent, units, tone, and dashboard customization.
5. Add API and UI tests for auth, plan creation, daily check-ins, and weekly review generation.
