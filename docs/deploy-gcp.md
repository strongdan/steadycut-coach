# Google Cloud Deployment Runbook: steadycut-coach

This document outlines the production-ready deployment strategy for the steadycut-coach monorepo on Google Cloud Platform (GCP).

## 1. Architecture Overview

- **Frontend:** React Vite PWA on **Firebase Hosting**.
- **Backend:** Express API on **Cloud Run**.
- **Database:** PostgreSQL on **Cloud SQL**.
- **Secrets:** **Secret Manager**.
- **CI/CD:** **Cloud Build**.
- **Storage:** **Cloud Storage** (GCS) for progress photos.
- **Jobs:** **Cloud Scheduler** + **Cloud Tasks** for reminders.

---

## 1.1 Current Repo Assumptions

- `apps/web` is a static Vite build and should deploy independently from the API.
- `apps/api` is a standalone Express container for Cloud Run.
- The repo does **not** currently commit a `pnpm-lock.yaml`. The deployment artifacts here therefore use `--no-frozen-lockfile`. Before the first real production launch, commit a lockfile and switch build steps back to `--frozen-lockfile`.
- The API currently contains internal reminder job endpoints protected by `INTERNAL_JOB_TOKEN`. That is a first internal seam, not the final OIDC-based production setup.

---

## 2. Infrastructure Setup

### Automated Setup
You can use the provided setup script to automate API enablement, service account creation, and resource provisioning:
```bash
chmod +x setup-gcp.sh
./setup-gcp.sh [PROJECT_ID]
```

### Manual Configuration
If you prefer manual setup or need to verify steps:

#### Enable APIs
```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  firebase.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudtasks.googleapis.com \
  storage.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com
```

### Artifact Registry
Create a repository for Docker images:
```bash
gcloud artifacts repositories create app \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for steadycut-coach"
```

### Cloud SQL (PostgreSQL)
Create a PostgreSQL instance. Choose the smallest currently-supported tier that fits your environment rather than relying on historical machine names from old examples:
```bash
gcloud sql instances create steadycut-db \
    --database-version=POSTGRES_15 \
    --tier=db-custom-1-3840 \
    --region=us-central1
```
Create the database and user:
```bash
gcloud sql databases create steadycut_prod --instance=steadycut-db
gcloud sql users create api_user --instance=steadycut-db --password=REPLACE_ME
```

### Secret Manager
Store sensitive values. At a minimum:
- `DATABASE_URL`: `postgresql://api_user:PASSWORD@localhost/steadycut_prod?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`
- `JWT_SECRET`: A long random string.
- `INTERNAL_JOB_TOKEN`: A secure bearer token for internal jobs.
- `TASK_QUEUE_DRIVER`: `gcp`
- `STORAGE_DRIVER`: `gcs`
- `GCS_BUCKET_NAME`: `steadycut-photos-[PROJECT_ID]`
- `OPENAI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` as features come online.

---

## 3. Service Accounts & IAM

| Name | ID | Roles |
| :--- | :--- | :--- |
| **Cloud Build SA** | `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` | `roles/run.admin`, `roles/iam.serviceAccountUser`, `roles/artifactregistry.writer` |
| **API Runtime SA** | `api-runtime@PROJECT_ID.iam.gserviceaccount.com` | `roles/secretmanager.secretAccessor`, `roles/cloudsql.client`, `roles/storage.objectAdmin`, `roles/cloudtasks.enqueuer` |
| **Scheduler Caller SA** | `scheduler-invoker@PROJECT_ID.iam.gserviceaccount.com` | `roles/run.invoker` |

If Firebase Hosting deploys are performed from Cloud Build, also grant the minimum Firebase/GCP roles required for Hosting deploys to the build identity after validating the exact project setup.

---

## 4. CI/CD with Cloud Build

The `cloudbuild.yaml` in the root handles:
1. Building and pushing the API image.
2. Deploying to Cloud Run.
3. Building the Web App.
4. Deploying to Firebase Hosting.

Important notes:
- The current `cloudbuild.yaml` keeps API and web deployment in one file for convenience, but you may decide to split them into `cloudbuild.api.yaml` and `cloudbuild.web.yaml` later.
- Substitute placeholder values such as `_CLOUDSQL_CONNECTION_NAME`, `_RUNTIME_SA`, and `_VITE_API_URL` before first use.
- The Firebase deploy step uses `firebase-tools` on top of a Node image rather than assuming a custom Firebase builder image exists.

**To trigger manually:**
```bash
gcloud builds submit --config cloudbuild.yaml .
```

For trigger strategy and CI/CD rollout details, see [CI/CD Setup for Google Cloud](ci-cd-gcp.md).

---

## 5. Database Migrations

Use `prisma migrate deploy` to apply migrations to production. Do **not** use `prisma migrate dev` against Cloud SQL. This should be run as part of the deployment pipeline or manually from a secure environment with access to the DB.

**Manual migration from local (using Cloud SQL Proxy):**
1. Start proxy: `./cloud-sql-proxy PROJECT_ID:REGION:INSTANCE_NAME`
2. Run: `DATABASE_URL="..." npx prisma migrate deploy`

---

## 6. Reminders (Scheduler + Tasks)

### Architecture
1. **Cloud Scheduler** hits `POST /api/internal/jobs/reminders/orchestrate`.
2. The orchestrator identifies due reminders and enqueues individual **Cloud Tasks**.
3. **Cloud Tasks** hits `POST /api/internal/jobs/reminders/deliver` for each message.
4. Each delivery request must carry a dedupe key so repeated attempts do not create duplicate sends.

Current repo status:
- The internal endpoints exist in `apps/api/src/routes/internal-jobs.ts`.
- They are protected by the `INTERNAL_JOB_TOKEN`.
- The `gcp` task queue mode is implemented in `apps/api/src/lib/task-queue.ts` using the `@google-cloud/tasks` SDK.

### Setup Task Queue
```bash
gcloud tasks queues create reminder-delivery --location=us-central1
```

---

## 7. Progress Photos (Cloud Storage)

1. Create a bucket: `gs://steadycut-photos-[PROJECT_ID]`.
2. The API is configured to use the `GcsStorageProvider` in `apps/api/src/lib/storage.ts` when `STORAGE_DRIVER=gcs`.
3. It uses **Signed URLs** for secure frontend access.

---

## 8. Monitoring & Cost Awareness

- **Logging:** View logs in Cloud Run console or Cloud Logging.
- **Monitoring:** Create alerts for Cloud Run 5xx rate, latency, and Cloud SQL CPU/storage pressure.
- **Cost:**
  - Cloud Run scales to zero (cheap for low traffic).
  - Cloud SQL is the primary fixed cost (approx. $10-30/mo for small instances).
  - Use `min-instances: 0` in Cloud Run to save money during development.
