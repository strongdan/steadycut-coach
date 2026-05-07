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

## 2. Infrastructure Setup

### Enable APIs
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
  storage.googleapis.com
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
Create a PostgreSQL instance (start with `db-f1-micro` for staging or `db-custom-1-3840` for prod):
```bash
gcloud sql instances create steadycut-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
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

---

## 3. Service Accounts & IAM

| Name | ID | Roles |
| :--- | :--- | :--- |
| **Cloud Build SA** | `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` | `roles/run.admin`, `roles/firebase.admin`, `roles/iam.serviceAccountUser`, `roles/artifactregistry.writer` |
| **API Runtime SA** | `api-runtime@PROJECT_ID.iam.gserviceaccount.com` | `roles/secretmanager.secretAccessor`, `roles/cloudsql.client`, `roles/storage.objectAdmin`, `roles/cloudtasks.enqueuer` |

---

## 4. CI/CD with Cloud Build

The `cloudbuild.yaml` in the root handles:
1. Building and pushing the API image.
2. Deploying to Cloud Run.
3. Building the Web App.
4. Deploying to Firebase Hosting.

**To trigger manually:**
```bash
gcloud builds submit --config cloudbuild.yaml .
```

---

## 5. Database Migrations

Use `prisma migrate deploy` to apply migrations to production. This should be run as part of the deployment pipeline or manually from a secure environment with access to the DB.

**Manual migration from local (using Cloud SQL Proxy):**
1. Start proxy: `./cloud-sql-proxy PROJECT_ID:REGION:INSTANCE_NAME`
2. Run: `DATABASE_URL="..." npx prisma migrate deploy`

---

## 6. Reminders (Scheduler + Tasks)

### Architecture
1. **Cloud Scheduler** hits `POST /api/internal/jobs/reminders/orchestrate` (protected by OIDC).
2. The orchestrator identifies due reminders and enqueues individual **Cloud Tasks**.
3. **Cloud Tasks** hits `POST /api/internal/jobs/reminders/deliver` for each message.

### Setup Task Queue
```bash
gcloud tasks queues create reminder-delivery --location=us-central1
```

---

## 7. Progress Photos (Cloud Storage)

1. Create a bucket: `gs://steadycut-photos-[PROJECT_ID]`.
2. Update the API to use the GCS adapter for uploads.
3. Use **Signed URLs** for secure frontend access.

---

## 8. Monitoring & Cost Awareness

- **Logging:** View logs in Cloud Run console or Cloud Logging.
- **Cost:**
  - Cloud Run scales to zero (cheap for low traffic).
  - Cloud SQL is the primary fixed cost (approx. $10-30/mo for small instances).
  - Use `min-instances: 0` in Cloud Run to save money during development.
