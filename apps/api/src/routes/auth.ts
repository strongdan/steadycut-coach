import { Router } from "express";
import {
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerSchema,
} from "@steadycut/shared";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { signToken } from "../lib/jwt.js";
import { comparePassword, hashPassword } from "../lib/password.js";
import { sendSmsMessage } from "../lib/sms.js";
import { requireAuth } from "../middleware/auth.js";
import type { AuthedRequest } from "../middleware/auth.js";

const router = Router();
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
const PASSWORD_RESET_RESEND_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24 * 7,
};

const createOneTimeCode = () => Math.floor(100000 + Math.random() * 900000).toString();

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
    const otp = createOneTimeCode();

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

router.post("/password-reset/request", async (req, res, next) => {
  try {
    const input = passwordResetRequestSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        phoneNumber: true,
        passwordResetRequestedAt: true,
        reminderPreferences: {
          take: 1,
          select: { channel: true },
        },
      },
    });

    // Do not reveal whether an account exists or whether it has a phone number.
    if (!user?.phoneNumber) {
      return res.json({
        success: true,
        message: "If an account with SMS recovery exists, a code has been sent.",
      });
    }

    if (
      user.passwordResetRequestedAt &&
      user.passwordResetRequestedAt.getTime() > Date.now() - PASSWORD_RESET_RESEND_COOLDOWN_MS
    ) {
      return res.status(429).json({
        success: false,
        message: "Please wait a minute before requesting another password reset code.",
      });
    }

    const code = createOneTimeCode();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCode: code,
        passwordResetExpiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        passwordResetRequestedAt: new Date(),
        passwordResetFailedAttempts: 0,
      },
    });

    const channel = user.reminderPreferences?.[0]?.channel as "sms" | "whatsapp" | undefined;

    await sendSmsMessage({
      userId: user.id,
      toNumber: user.phoneNumber,
      body: `Your SteadyCut password reset code is: ${code}`,
      dedupeKey: `password-reset-${user.id}-${Date.now()}`,
      channel: channel === "whatsapp" ? "whatsapp" : "sms",
    });

    res.json({
      success: true,
      message: "If an account with SMS recovery exists, a code has been sent.",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/password-reset/confirm", async (req, res, next) => {
  try {
    const input = passwordResetConfirmSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.passwordResetCode || !user.passwordResetExpiresAt) {
      throw new HttpError(400, "Invalid or expired password reset code.");
    }

    if (user.passwordResetExpiresAt < new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetCode: null,
          passwordResetExpiresAt: null,
          passwordResetRequestedAt: null,
          passwordResetFailedAttempts: 0,
        },
      });
      throw new HttpError(400, "Invalid or expired password reset code.");
    }

    if (user.passwordResetFailedAttempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
      throw new HttpError(429, "Too many invalid attempts. Request a new password reset code.");
    }

    if (user.passwordResetCode !== input.code) {
      const nextAttemptCount = user.passwordResetFailedAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetFailedAttempts: nextAttemptCount,
          ...(nextAttemptCount >= PASSWORD_RESET_MAX_ATTEMPTS
            ? {
                passwordResetCode: null,
                passwordResetExpiresAt: null,
                passwordResetRequestedAt: null,
              }
            : {}),
        },
      });
      throw new HttpError(
        nextAttemptCount >= PASSWORD_RESET_MAX_ATTEMPTS
          ? 429
          : 400,
        nextAttemptCount >= PASSWORD_RESET_MAX_ATTEMPTS
          ? "Too many invalid attempts. Request a new password reset code."
          : "Invalid or expired password reset code.",
      );
    }

    const passwordHash = await hashPassword(input.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetCode: null,
        passwordResetExpiresAt: null,
        passwordResetRequestedAt: null,
        passwordResetFailedAttempts: 0,
      },
    });

    res.json({
      success: true,
      message: "Password updated. You can log in with the new password.",
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
