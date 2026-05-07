import twilio from "twilio";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { prisma } from "../db/prisma.js";

const twilioClient = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
  ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  : null;

type SendSmsInput = {
  userId: string;
  toNumber: string;
  body: string;
  dedupeKey: string;
  channel?: "sms" | "whatsapp";
};

export async function sendSmsMessage(input: SendSmsInput) {
  const channel = input.channel ?? "sms";
  // Use the dedupeKey as the basis for our provider ID to ensure idempotency
  const providerMessageId = `sc-${channel}-${input.dedupeKey}`;

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

  if (!twilioClient) {
    logger.warn(
      { userId: input.userId, dedupeKey: input.dedupeKey },
      "Twilio credentials missing. Logging SMS to console only."
    );
    console.log(`[MOCK SMS to ${input.toNumber}]: ${input.body}`);
    
    const smsMessage = await prisma.smsMessage.create({
      data: {
        userId: input.userId,
        direction: "outbound",
        fromNumber: "MOCK",
        toNumber: input.toNumber,
        body: input.body,
        providerMessageId,
      },
    });

    return { skipped: false, reason: "mock_sent", smsMessage };
  }

  try {
    const isWhatsApp = channel === "whatsapp";
    const from = isWhatsApp
      ? `whatsapp:${env.TWILIO_WHATSAPP_NUMBER || env.TWILIO_PHONE_NUMBER}`
      : env.TWILIO_PHONE_NUMBER;
    const to = isWhatsApp ? `whatsapp:${input.toNumber}` : input.toNumber;

    const message = await twilioClient.messages.create({
      body: input.body,
      from,
      to,
    });

    const smsMessage = await prisma.smsMessage.create({
      data: {
        userId: input.userId,
        direction: "outbound",
        fromNumber: from ?? "unknown",
        toNumber: input.toNumber,
        body: input.body,
        providerMessageId: message.sid || providerMessageId,
        status: message.status,
      },
    });

    return {
      skipped: false,
      reason: "sent",
      smsMessage,
    };
  } catch (error) {
    logger.error({ error, userId: input.userId }, "Failed to send Twilio SMS.");
    throw error;
  }
}
