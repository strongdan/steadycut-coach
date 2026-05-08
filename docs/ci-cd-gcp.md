# CI/CD Setup for Google Cloud

This document turns the current deployment artifacts into a practical Cloud Build CI/CD setup for `steadycut-coach`.

## Goal

Use GitHub as the source of truth and Google Cloud Build as the deployment runner.

Recommended pipeline shape:

1. Manual deploy once to prove the path works.
2. Add a production trigger on push to `main`.
3. Add a validation trigger for pull requests.
4. Add staging later if you want environment separation before broader usage.

## Before Enabling CI/CD

Do these first. CI/CD should automate a known-good deploy path, not discover one.

- Provision the GCP project and required APIs.
- Create Artifact Registry, Cloud SQL, Secret Manager secrets, and service accounts.
- Confirm `apps/api/Dockerfile` builds successfully.
- Confirm `cloudbuild.yaml` has real substitution values.
- Confirm Firebase Hosting is initialized for the target project.
- Confirm Cloud Run can connect to Cloud SQL.
- Confirm the API starts successfully with production secrets.
- Commit a `pnpm-lock.yaml`.
- Commit every Prisma migration before deploy. Cloud Build applies migrations; it does not generate them.

That last item matters. The current repo does not commit a lockfile, so the build uses `--no-frozen-lockfile`. That is acceptable only as a temporary bridge.

## Recommended Trigger Strategy

### Trigger 1: Production Deploy

Purpose:
- deploy API and web on every push to `main`

Source:
- GitHub repository `strongdan/steadycut-coach`

Event:
- push to branch `^main$`

Build config:
- `cloudbuild.yaml`

Expected behavior:
- build/push API image
- deploy API to Cloud Run
- deploy/update the Cloud Run migration job
- run `prisma migrate deploy` against Cloud SQL
- build web app
- deploy web app to Firebase Hosting

### Trigger 2: Pull Request Validation

Purpose:
- verify that changes build cleanly before merge

Source:
- same GitHub repository

Event:
- pull request against `main`

Recommended behavior:
- install dependencies
- build shared package
- typecheck web and API
- run API tests
- optionally build API container
- do not deploy

You can either:
- create a second build config like `cloudbuild.validate.yaml`, or
- add branch/PR conditionals later

For clarity, a separate validation config is better.

## Recommended Validation Build Config

Add `cloudbuild.validate.yaml` for pull request validation:

```yaml
steps:
  - name: 'node:22'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        corepack enable
        pnpm install --frozen-lockfile
        pnpm --filter @steadycut/shared build
        pnpm --filter @steadycut/api typecheck
        pnpm --filter @steadycut/web typecheck
        pnpm --filter @steadycut/api test

options:
  logging: CLOUD_LOGGING
```

The repo now includes `cloudbuild.validate.yaml`, but it currently uses `--no-frozen-lockfile` because `pnpm-lock.yaml` is still missing. Switch it to `--frozen-lockfile` once the lockfile is committed.

## Manual Deploy Checklist

Before creating triggers, run one manual build:

```bash
gcloud builds submit --config cloudbuild.yaml .
```

Only proceed to triggers after this succeeds.

Manual success criteria:
- API image pushed to Artifact Registry
- Cloud Run revision becomes healthy
- Cloud Run migration job completes successfully
- Web build succeeds
- Firebase Hosting deploy completes

## Cloud Build Trigger Setup

### Connect GitHub to Cloud Build

Use the official GitHub integration in Google Cloud:

1. Open Cloud Build in the Google Cloud console.
2. Open `Triggers`.
3. Choose `Create trigger`.
4. Connect the GitHub repository if not already connected.
5. Install or authorize the GitHub App if prompted.

### Production Trigger Settings

Use these settings:

- Name: `steadycut-prod-main`
- Event: `Push to a branch`
- Source repository: `strongdan/steadycut-coach`
- Branch: `^main$`
- Configuration: `Cloud Build configuration file`
- Location: `Repository`
- Config file path: `cloudbuild.yaml`

Set substitutions appropriate for production:

- `_REGION`
- `_REPOSITORY`
- `_SERVICE_NAME`
- `_RUNTIME_SA_NAME`
- `_CLOUDSQL_CONNECTION_NAME`
- `_WEB_ORIGIN`
- `_VITE_API_URL`
- `_AI_PROVIDER`
- `_DEFAULT_TIMEZONE`
- `_SMS_BASE_URL`
- `_STORAGE_DRIVER`
- `_GCS_BUCKET_NAME`

### PR Validation Trigger Settings

- Name: `steadycut-pr-validate`
- Event: `Pull request`
- Target branch: `^main$`
- Config file: `cloudbuild.validate.yaml`

## Secrets and Runtime Inputs

These should not be stored in source control:

- `DATABASE_URL`
- `JWT_SECRET`
- `INTERNAL_JOB_TOKEN`
- `OPENAI_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

Production schema guidance:

- Generate migrations locally against a dev database.
- Commit migration directories under `apps/api/prisma/migrations`.
- Do not switch production back to `prisma db push`.

These are suitable as non-secret substitutions or env vars:

- `_REGION`
- `_REPOSITORY`
- `_SERVICE_NAME`
- `_RUNTIME_SA_NAME`
- `_WEB_ORIGIN`
- `_VITE_API_URL`
- `_AI_PROVIDER`
- `_DEFAULT_TIMEZONE`
- `_SMS_BASE_URL`
- `_STORAGE_DRIVER`
- `_GCS_BUCKET_NAME`

## Recommended Environment Path

### Short term

- Production only
- Single `main` deploy trigger
- Manual staging/testing through local or one-off builds

### Medium term

- Add staging Cloud Run service and staging Hosting target
- Add `staging` branch trigger
- Split secrets by environment

## Firebase Hosting Notes

The current `cloudbuild.yaml` deploys Hosting using `firebase-tools`.

Before that works reliably:
- ensure Firebase is enabled for the project
- ensure Hosting is initialized
- verify the Cloud Build identity has the required Hosting deploy permissions

If Firebase deployment auth from Cloud Build becomes awkward, split web deployment into a separate pipeline and validate it independently.

## Cloud Run Notes

The current pipeline assumes:
- public ingress
- direct browser access from Hosting to Cloud Run
- Cloud SQL attached with `--add-cloudsql-instances`
- secrets injected from Secret Manager

Before enabling automatic deploys, manually verify:
- CORS origin
- database connectivity
- secret injection
- startup health

## Recommended Next CI/CD Tasks

1. Commit `pnpm-lock.yaml`.
2. Run one manual `gcloud builds submit`.
3. Create production push trigger.
4. Create PR validation trigger using `cloudbuild.validate.yaml`.
5. Switch both Cloud Build configs to `--frozen-lockfile` after committing `pnpm-lock.yaml`.
6. Add staging later if needed.
