import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: "../../.env" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(12),
  JWT_EXPIRES_IN: z.string().default("7d"),
  AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  SMS_BASE_URL: z.string().url().default("http://localhost:5173"),
  DEFAULT_TIMEZONE: z.string().default("America/Juneau"),
  STORAGE_DRIVER: z.enum(["local", "gcs"]).default("local"),
  UPLOADS_DIR: z.string().default("apps/api/uploads"),
  GCS_BUCKET_NAME: z.string().optional(),
  INTERNAL_JOB_TOKEN: z.string().min(12),
  TASK_QUEUE_DRIVER: z.enum(["inline", "gcp"]).default("inline"),
  TASK_QUEUE_LOCATION: z.string().default("us-central1"),
  TASK_QUEUE_NAME: z.string().default("reminder-delivery"),
  TASK_QUEUE_TARGET_URL: z.string().url().default("http://localhost:4000/api/internal/jobs/reminders/deliver"),
});

export const env = envSchema.parse(process.env);
