#!/bin/bash

# setup-gcp.sh - Initializes infrastructure for steadycut-coach-prod
# Usage: ./setup-gcp.sh [PROJECT_ID]

set -e # Exit on error

# Configuration
PROJECT_ID=${1:-"steadycut-coach-prod"}
REGION="us-central1"
REPOSITORY_NAME="app"
SERVICE_ACCOUNT_NAME="api-runtime"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
QUEUE_NAME="reminder-delivery"
BUCKET_NAME="steadycut-photos-steadycut-coach-prod"
DB_INSTANCE_NAME="steadycut-db"
DB_NAME="steadycut_prod"

echo "Starting infrastructure setup for project: $PROJECT_ID"

# 1. Enable APIs
echo "Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudtasks.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project "$PROJECT_ID" --quiet

echo "Waiting for APIs to propagate..."
sleep 10

# 2. Create Artifact Registry
echo "Creating Artifact Registry repository..."
gcloud artifacts repositories create "$REPOSITORY_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Docker repository for steadycut-coach" \
    --project "$PROJECT_ID" --quiet || echo "Repository already exists"

# 3. Create Service Account and grant roles
echo "Setting up service account: $SERVICE_ACCOUNT_NAME"
if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project "$PROJECT_ID" > /dev/null 2>&1; then
    gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
        --display-name="API Runtime Service Account" \
        --project "$PROJECT_ID"
else
    echo "Service account already exists"
fi

ROLES=(
    "roles/secretmanager.secretAccessor"
    "roles/cloudsql.client"
    "roles/storage.objectAdmin"
    "roles/cloudtasks.enqueuer"
)

for ROLE in "${ROLES[@]}"; do
    echo "Granting $ROLE..."
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="$ROLE" \
        --quiet > /dev/null
done

# 4. Create Cloud Tasks queue
echo "Creating Cloud Tasks queue: $QUEUE_NAME"
gcloud tasks queues create "$QUEUE_NAME" \
    --location="$REGION" \
    --project "$PROJECT_ID" --quiet || echo "Queue already exists"

# 5. Create Storage bucket
echo "Creating Storage bucket: gs://$BUCKET_NAME"
gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://${BUCKET_NAME}" || echo "Bucket already exists"

# 6. Provision Cloud SQL instance and database
echo "Provisioning Cloud SQL instance: $DB_INSTANCE_NAME (this may take several minutes)..."
if ! gcloud sql instances describe "$DB_INSTANCE_NAME" --project "$PROJECT_ID" > /dev/null 2>&1; then
    gcloud sql instances create "$DB_INSTANCE_NAME" \
        --database-version=POSTGRES_15 \
        --tier=db-custom-1-3840 \
        --region="$REGION" \
        --project "$PROJECT_ID" --quiet
else
    echo "Instance already exists"
fi

echo "Creating database: $DB_NAME"
gcloud sql databases create "$DB_NAME" \
    --instance="$DB_INSTANCE_NAME" \
    --project "$PROJECT_ID" --quiet || echo "Database already exists"

# 7. Output placeholders for Secret Manager
echo ""
echo "========================================================"
echo "Infrastructure initialization complete!"
echo "========================================================"
echo ""
echo "MANUAL STEPS REQUIRED"
echo "--------------------------------------------------------"
echo "Secret Manager secrets:"
echo "1. DATABASE_URL"
echo "   Suggested value: postgresql://[USER]:[PASSWORD]@localhost/${DB_NAME}?host=/cloudsql/${PROJECT_ID}:${REGION}:${DB_INSTANCE_NAME}"
echo ""
echo "2. JWT_SECRET"
echo "   Suggested value: [Generate a long random string]"
echo ""
echo "3. INTERNAL_JOB_TOKEN"
echo "   Suggested value: [Generate a secure bearer token]"
echo ""
echo "4. RECAPTCHA_SECRET_KEY"
echo "   Suggested value: [Your server-side reCAPTCHA secret]"
echo ""
echo "5. OPENAI_API_KEY"
echo "   Required only if AI_PROVIDER is not vertex"
echo ""
echo "6. TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER"
echo "   Required if MESSAGING_DRIVER=twilio"
echo ""
echo "7. TWILIO_WHATSAPP_NUMBER"
echo "   Required if WhatsApp delivery is enabled through Twilio"
echo ""
echo "8. META_WHATSAPP_TOKEN / META_PHONE_NUMBER_ID"
echo "   Required if MESSAGING_DRIVER=meta"
echo ""
echo "Cloud Run / Cloud Build plain env values:"
echo "9. TASK_QUEUE_DRIVER=gcp"
echo "10. TASK_QUEUE_NAME=${QUEUE_NAME}"
echo "11. TASK_QUEUE_LOCATION=${REGION}"
echo "12. TASK_QUEUE_TARGET_URL=[The URL of your deployed Cloud Run service]/api/internal/jobs/reminders/deliver"
echo "13. STORAGE_DRIVER=gcs"
echo "14. GCS_BUCKET_NAME=${BUCKET_NAME}"
echo "15. AI_PROVIDER=vertex"
echo "16. MESSAGING_DRIVER=twilio (or mock/meta as appropriate)"
echo "--------------------------------------------------------"
