import twilio from "twilio";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { prisma } from "../db/prisma.js";

/**
 * Types & Interfaces
 */
export type SendMessageInput = {
  userId: string;
  toNumber: string;
  body: string;
  dedupeKey: string;
  channel?: "sms" | "whatsapp";
};

export type MessageResult = {
  skipped: boolean;
  reason: "sent" | "duplicate" | "mock_sent" | "error";
  smsMessage: any;
};

export interface MessagingProvider {
  send(input: SendMessageInput): Promise<MessageResult>;
}

/**
 * MOCK PROVIDER (Local Dev)
 */
class MockProvider implements MessagingProvider {
  async send(input: SendMessageInput): Promise<MessageResult> {
    const channel = input.channel ?? "sms";
    const providerMessageId = `mock-${channel}-${input.dedupeKey}`;

    const existing = await prisma.smsMessage.findFirst({
      where: { userId: input.userId, direction: "outbound", providerMessageId },
    });
    if (existing) return { skipped: true, reason: "duplicate", smsMessage: existing };

    logger.info({ userId: input.userId, dedupeKey: input.dedupeKey }, `[MOCK ${channel.toUpperCase()}] to ${input.toNumber}: ${input.body}`);

    // Ensure the user exists before trying to link the record
    const userExists = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });

    const smsMessage = await prisma.smsMessage.create({
      data: {
        userId: userExists ? input.userId : null,
        direction: "outbound",
        fromNumber: "MOCK",
        toNumber: input.toNumber,
        body: input.body,
        providerMessageId,
      },
    });

    return { skipped: false, reason: "mock_sent", smsMessage };
  }
}

/**
 * TWILIO PROVIDER (Backup/Production)
 */
class TwilioProvider implements MessagingProvider {
  async send(input: SendMessageInput): Promise<MessageResult> {
    const channel = input.channel ?? "sms";
    const providerMessageId = `tw-${channel}-${input.dedupeKey}`;

    const existing = await prisma.smsMessage.findFirst({
      where: { userId: input.userId, direction: "outbound", providerMessageId },
    });
    if (existing) return { skipped: true, reason: "duplicate", smsMessage: existing };

    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials missing but Twilio driver selected.");
    }

    if (!env.TWILIO_ACCOUNT_SID.startsWith("AC")) {
      throw new Error("Invalid TWILIO_ACCOUNT_SID. It must start with 'AC'.");
    }

    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    const isWhatsApp = channel === "whatsapp";
    const from = isWhatsApp
      ? `whatsapp:${env.TWILIO_WHATSAPP_NUMBER || env.TWILIO_PHONE_NUMBER}`
      : env.TWILIO_PHONE_NUMBER;
    const to = isWhatsApp ? `whatsapp:${input.toNumber}` : input.toNumber;

    const message = await client.messages.create({ body: input.body, from, to });

    // Ensure the user exists before trying to link the record
    const userExists = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });

    const smsMessage = await prisma.smsMessage.create({
      data: {
        userId: userExists ? input.userId : null,
        direction: "outbound",
        fromNumber: from ?? "unknown",
        toNumber: input.toNumber,
        body: input.body,
        providerMessageId: message.sid || providerMessageId,
        status: message.status,
      },
    });

    return { skipped: false, reason: "sent", smsMessage };
  }
}

/**
 * META PROVIDER (Direct WhatsApp API - No Twilio Fees)
 */
class MetaProvider implements MessagingProvider {
  async send(input: SendMessageInput): Promise<MessageResult> {
    const channel = input.channel ?? "sms";
    if (channel === "sms") {
        logger.warn("MetaProvider only supports WhatsApp. Falling back to Mock for SMS.");
        return new MockProvider().send(input);
    }

    const providerMessageId = `meta-wa-${input.dedupeKey}`;
    const existing = await prisma.smsMessage.findFirst({
      where: { userId: input.userId, direction: "outbound", providerMessageId },
    });
    if (existing) return { skipped: true, reason: "duplicate", smsMessage: existing };

    if (!env.META_WHATSAPP_TOKEN || !env.META_PHONE_NUMBER_ID) {
        throw new Error("Meta WhatsApp credentials missing.");
    }

    // Direct fetch call to Meta Graph API
    const response = await fetch(`https://graph.facebook.com/v21.0/${env.META_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.META_WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.toNumber.replace("+", ""),
        type: "text",
        text: { body: input.body },
      }),
    });

    const result: any = await response.json();
    if (!response.ok) {
        logger.error({ result }, "Meta WhatsApp API Error");
        throw new Error(`Meta API Error: ${result.error?.message || "Unknown"}`);
    }

    // Ensure the user exists before trying to link the record
    const userExists = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });

    const smsMessage = await prisma.smsMessage.create({
      data: {
        userId: userExists ? input.userId : null,
        direction: "outbound",
        fromNumber: env.META_PHONE_NUMBER_ID,
        toNumber: input.toNumber,
        body: input.body,
        providerMessageId: result.messages?.[0]?.id || providerMessageId,
        status: "sent",
      },
    });

    return { skipped: false, reason: "sent", smsMessage };
  }
}

/**
 * EXPORT SELECTED PROVIDER
 */
const providers: Record<string, MessagingProvider> = {
  mock: new MockProvider(),
  twilio: new TwilioProvider(),
  meta: new MetaProvider(),
};

const selectedProvider = providers[env.MESSAGING_DRIVER] || providers.mock;

export async function sendSmsMessage(input: SendMessageInput) {
  return selectedProvider.send(input);
}
