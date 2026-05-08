import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../config/env.js";

const router = Router();

router.use(requireAuth);

router.get("/messages", async (req, res, next) => {
  try {
    const messages = await prisma.smsMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    res.json({
      messagingDriver: env.MESSAGING_DRIVER,
      twilioConfigured: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER),
      metaConfigured: !!(env.META_WHATSAPP_TOKEN && env.META_PHONE_NUMBER_ID),
      messages,
    });
  } catch (error) {
    next(error);
  }
});

export const adminRouter = router;
