import { CloudTasksClient } from "@google-cloud/tasks";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const client = new CloudTasksClient();

export type ReminderDeliveryTaskPayload = {
  reminderId: string;
  userId: string;
  type: string;
  toNumber: string;
  dedupeKey: string;
  body: string;
};

export type EnqueueResult = {
  mode: "inline" | "gcp";
  taskName: string;
  targetUrl: string;
};

export interface TaskQueueProvider {
  enqueueReminderDelivery(payload: ReminderDeliveryTaskPayload): Promise<EnqueueResult>;
}

class InlineTaskQueueProvider implements TaskQueueProvider {
  async enqueueReminderDelivery(payload: ReminderDeliveryTaskPayload): Promise<EnqueueResult> {
    logger.info(
      {
        reminderId: payload.reminderId,
        userId: payload.userId,
        dedupeKey: payload.dedupeKey,
      },
      "Queued reminder delivery in inline mode.",
    );

    return {
      mode: "inline",
      taskName: `inline-${payload.dedupeKey}`,
      targetUrl: env.TASK_QUEUE_TARGET_URL,
    };
  }
}

class GcpTaskQueueProvider implements TaskQueueProvider {
  async enqueueReminderDelivery(payload: ReminderDeliveryTaskPayload): Promise<EnqueueResult> {
    const parent = client.queuePath(
      process.env.GOOGLE_CLOUD_PROJECT || "steadycut-coach-prod",
      env.TASK_QUEUE_LOCATION,
      env.TASK_QUEUE_NAME,
    );

    const body = JSON.stringify(payload);
    const task = {
      httpRequest: {
        httpMethod: "POST" as const,
        url: env.TASK_QUEUE_TARGET_URL,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.INTERNAL_JOB_TOKEN}`,
        },
        body: Buffer.from(body).toString("base64"),
      },
    };

    logger.info(
      {
        queue: parent,
        targetUrl: env.TASK_QUEUE_TARGET_URL,
        reminderId: payload.reminderId,
        userId: payload.userId,
        dedupeKey: payload.dedupeKey,
      },
      "Enqueuing reminder delivery to GCP Cloud Tasks.",
    );

    const [response] = await client.createTask({ parent, task });

    return {
      mode: "gcp",
      taskName: response.name || "unknown",
      targetUrl: env.TASK_QUEUE_TARGET_URL,
    };
  }
}

export const taskQueueProvider: TaskQueueProvider =
  env.TASK_QUEUE_DRIVER === "gcp" ? new GcpTaskQueueProvider() : new InlineTaskQueueProvider();
