import { Router } from "express";

import { loginSchema, registerSchema } from "@steadycut/shared";

import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { signToken } from "../lib/jwt.js";
import { comparePassword, hashPassword } from "../lib/password.js";
import { requireAuth } from "../middleware/auth.js";
import type { AuthedRequest } from "../middleware/auth.js";

const router = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24 * 7,
};

router.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

    if (existingUser) {
      throw new HttpError(409, "An account already exists for that email.");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        phoneNumber: input.phoneNumber || null,
        timezone: input.timezone,
        units: input.units,
      },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        units: true,
      },
    });

    const token = signToken({ sub: user.id, email: user.email });
    res.cookie("token", token, cookieOptions);

    res.status(201).json({ user, token });
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
