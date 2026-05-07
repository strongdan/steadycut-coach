import { Router } from "express";
import { loginSchema, registerSchema } from "@steadycut/shared";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { signToken } from "../lib/jwt.js";
import { comparePassword, hashPassword } from "../lib/password.js";
import { sendSmsMessage } from "../lib/sms.js";
import { requireAuth } from "../middleware/auth.js";
import type { AuthedRequest } from "../middleware/auth.js";

const router = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24 * 7,
};

async function validateRecaptcha(token: string) {
  if (!env.RECAPTCHA_SECRET_KEY) return true;
  
  const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${env.RECAPTCHA_SECRET_KEY}&response=${token}`, {
    method: "POST",
  });
  const data: any = await response.json();
  return data.success && data.score >= 0.5;
}

router.post("/register", async (req, res, next) => {
  try {
    const { recaptchaToken, ...inputData } = req.body;
    
    if (env.RECAPTCHA_SECRET_KEY && !recaptchaToken) {
      throw new HttpError(400, "reCAPTCHA token is required.");
    }
    
    if (recaptchaToken && !(await validateRecaptcha(recaptchaToken))) {
      throw new HttpError(403, "Bot detection failed. Please try again.");
    }

    const input = registerSchema.parse(inputData);
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

    if (existingUser) {
      throw new HttpError(409, "An account already exists for that email.");
    }

    const passwordHash = await hashPassword(input.password);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        phoneNumber: input.phoneNumber || null,
        timezone: input.timezone,
        units: input.units,
        otpCode: otp,
        otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
      },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
      },
    });

    if (user.phoneNumber) {
      await sendSmsMessage({
        userId: user.id,
        toNumber: user.phoneNumber,
        body: `Your SteadyCut verification code is: ${otp}`,
        dedupeKey: `otp-${user.id}-${Date.now()}`,
      });
    }

    const token = signToken({ sub: user.id, email: user.email });
    res.cookie("token", token, cookieOptions);

    res.status(201).json({ user, token, requiresVerification: !!user.phoneNumber });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-otp", requireAuth, async (req, res, next) => {
  try {
    const { otp } = req.body;
    const { id } = (req as AuthedRequest).user;

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user || user.otpCode !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new HttpError(400, "Invalid or expired verification code.");
    }

    await prisma.user.update({
      where: { id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        smsConsent: true,
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const validPassword = await comparePassword(input.password, user.passwordHash);
    if (!validPassword) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const token = signToken({ sub: user.id, email: user.email });
    res.cookie("token", token, cookieOptions);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        units: user.units,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", cookieOptions);
  res.status(204).send();
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    const user = await prisma.user.findUnique({
      where: { id: authedReq.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        timezone: true,
        height: true,
        startingWeight: true,
        goalWeight: true,
        targetStartDate: true,
        targetEndDate: true,
        coachingTone: true,
        planStrictness: true,
        units: true,
        smsConsent: true,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export const authRouter = router;
