import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { prisma } from "../db/prisma.js";

type SendSmsInput = {
  userId: string;
  toNumber: string;
  body: string;
  dedupeKey: string;
};

export async function sendSmsMessage(input: SendSmsInput) {
  const providerMessageId = `mock-${input.dedupeKey}`;

  const existing = await prisma.smsMessage.findFirst({
    where: {
      userId: input.userId,
      direction: "outbound",
      providerMessageId,
    },
  });

  if (existing) {
    return {
      skipped: true,
      reason: "duplicate",
      smsMessage: existing,
    };
  }

  logger.info(
    {
      userId: input.userId,
      toNumber: input.toNumber,
      dedupeKey: input.dedupeKey,
    },
    "Dispatching SMS through placeholder sender.",
  );

  const smsMessage = await prisma.smsMessage.create({
    data: {
      userId: input.userId,
      direction: "outbound",
      fromNumber: env.TWILIO_PHONE_NUMBER ?? "mock-sender",
      toNumber: input.toNumber,
      body: input.body,
      providerMessageId,
    },
  });

  return {
    skipped: false,
    reason: "sent",
    smsMessage,
  };
}
