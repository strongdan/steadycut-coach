import { Router } from "express";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { logger } from "../config/logger.js";
import { sendSmsMessage } from "../lib/sms.js";
import { taskQueueProvider, type ReminderDeliveryTaskPayload } from "../lib/task-queue.js";
import { requireInternalJobAuth } from "../middleware/internal-auth.js";

const router = Router();

router.use(requireInternalJobAuth);

router.post("/reminders/orchestrate", async (req, res, next) => {
  try {
    const now = typeof req.body?.now === "string" ? new Date(req.body.now) : new Date();
    const minuteWindow = Number.isFinite(req.body?.minuteWindow) ? Number(req.body.minuteWindow) : 15;

    const reminders = await prisma.reminderPreference.findMany({
      where: {
        enabled: true,
        channel: "sms",
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            timezone: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const duePayloads: ReminderDeliveryTaskPayload[] = reminders
      .filter((reminder) => reminder.user.phoneNumber)
      .filter((reminder) => isReminderDue(reminder.timeOfDay, now, minuteWindow))
      .map((reminder) => {
        const dedupeKey = buildDedupeKey({
          userId: reminder.userId,
          reminderId: reminder.id,
          type: reminder.type,
          date: now,
        });

        return {
          reminderId: reminder.id,
          userId: reminder.userId,
          type: reminder.type,
          toNumber: reminder.user.phoneNumber as string,
          dedupeKey,
          body: renderReminderTemplate(reminder.messageTemplate, now),
        };
      });

    const queued = await Promise.all(
      duePayloads.map(async (payload) => ({
        payload,
        enqueue: await taskQueueProvider.enqueueReminderDelivery(payload),
      })),
    );

    logger.info(
      { queuedCount: queued.length, taskQueueDriver: env.TASK_QUEUE_DRIVER },
      "Reminder orchestration window evaluated and enqueued.",
    );

    if (env.TASK_QUEUE_DRIVER === "inline") {
      await Promise.all(
        duePayloads.map((payload) =>
          sendSmsMessage({
            userId: payload.userId,
            toNumber: payload.toNumber,
            body: payload.body,
            dedupeKey: payload.dedupeKey,
          }),
        ),
      );
    }

    res.status(202).json({
      now: now.toISOString(),
      minuteWindow,
      queuedCount: queued.length,
      taskQueueDriver: env.TASK_QUEUE_DRIVER,
      queued,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/reminders/deliver", async (req, res, next) => {
  try {
    const reminderId = String(req.body?.reminderId ?? "");
    const userId = String(req.body?.userId ?? "");
    const toNumber = String(req.body?.toNumber ?? "");
    const body = String(req.body?.body ?? "");
    const dedupeKey = String(req.body?.dedupeKey ?? "");

    if (!reminderId || !userId || !toNumber || !body || !dedupeKey) {
      return res.status(400).json({
        message: "reminderId, userId, toNumber, body, and dedupeKey are required.",
      });
    }

    const result =
      env.TASK_QUEUE_DRIVER === "inline"
        ? {
            skipped: false,
            reason: "inline-already-processed",
            smsMessage: null,
          }
        : await sendSmsMessage({
            userId,
            toNumber,
            body,
            dedupeKey,
          });

    res.status(result.skipped ? 200 : 201).json({
      reminderId,
      dedupeKey,
      status: result.reason,
      smsMessage: result.smsMessage,
    });
  } catch (error) {
    next(error);
  }
});

function isReminderDue(timeOfDay: string, now: Date, minuteWindow: number) {
  const [hoursString, minutesString] = timeOfDay.split(":");
  const hours = Number(hoursString);
  const minutes = Number(minutesString);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return false;
  }

  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  const deltaMinutes = Math.abs(target.getTime() - now.getTime()) / (1000 * 60);

  return deltaMinutes <= minuteWindow;
}

function buildDedupeKey(params: {
  userId: string;
  reminderId: string;
  type: string;
  date: Date;
}) {
  const day = params.date.toISOString().slice(0, 10);
  return `${params.userId}:${params.reminderId}:${params.type}:${day}`;
}

function renderReminderTemplate(template: string, now: Date) {
  const hour = now.getHours();
  const mealSuggestion =
    hour >= 16 && hour < 19
      ? "Dinner idea: chili, taco bowl, or sardines with hummus and salad."
      : hour >= 20
        ? "Tomorrow idea: chia pudding for breakfast or chili/taco bowl for lunch."
        : "";

  return [template.replace("{{link}}", env.SMS_BASE_URL), mealSuggestion].filter(Boolean).join(" ");
}

export const internalJobsRouter = router;
