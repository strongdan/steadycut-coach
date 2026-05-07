import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

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
    logger.info(
      {
        queue: env.TASK_QUEUE_NAME,
        location: env.TASK_QUEUE_LOCATION,
        targetUrl: env.TASK_QUEUE_TARGET_URL,
        reminderId: payload.reminderId,
        userId: payload.userId,
        dedupeKey: payload.dedupeKey,
      },
      "Prepared reminder delivery for GCP task queue.",
    );

    return {
      mode: "gcp",
      taskName: `gcp-${payload.dedupeKey}`,
      targetUrl: env.TASK_QUEUE_TARGET_URL,
    };
  }
}

export const taskQueueProvider: TaskQueueProvider =
  env.TASK_QUEUE_DRIVER === "gcp" ? new GcpTaskQueueProvider() : new InlineTaskQueueProvider();
