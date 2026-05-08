import { Router } from "express";

import { dailyCheckInSchema } from "@steadycut/shared";

import { prisma } from "../db/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { generateCoachFeedback } from "../lib/ai-coach.js";
import { requireAuth } from "../middleware/auth.js";

import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { id } = (req as any).user;
    const checkIns = await prisma.dailyCheckIn.findMany({
      where: { userId: id },
      orderBy: { date: "desc" },
      take: 30,
    });

    res.json({ checkIns });
  } catch (error) {
    next(error);
  }
});

router.get("/:date", async (req, res, next) => {
  try {
    const { id } = (req as any).user;
    const date = new Date(req.params.date);
    const checkIn = await prisma.dailyCheckIn.findFirst({
      where: { userId: id, date },
    });

    res.json({ checkIn });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const input = dailyCheckInSchema.parse(req.body);
    const { id } = (req as any).user;

    const [user, plan] = await Promise.all([
      prisma.user.findUnique({ where: { id } }),
      prisma.plan.findFirst({
        where: { userId: id, isActive: true, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const checkIn = await prisma.dailyCheckIn.upsert({
      where: {
        userId_date: {
          userId: id,
          date: new Date(input.date),
        },
      },
      update: {
        ...input,
        date: new Date(input.date),
        planId: plan?.id,
      },
      create: {
        userId: id,
        planId: plan?.id,
        ...input,
        date: new Date(input.date),
      },
    });

    // Calculate adherence score (0-10)
    let score = 0;
    if (input.proteinStatus === "yes") score += 3;
    if (input.fiberStatus === "yes") score += 2;
    if (input.waterLiters >= 3) score += 2;
    if (!input.ateAfterCutoff) score += 3;

    const aiFeedback = await generateCoachFeedback({
      userName: user?.name || "there",
      tone: user?.coachingTone || "standard",
      adherenceScore: score,
      weight: input.weight,
      mood: input.moodScore,
      energy: input.energyScore,
      notes: input.notes,
    });

    res.status(201).json({
      checkIn,
      coachFeedback: { summary: aiFeedback },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const input = dailyCheckInSchema.partial().parse(req.body);
    const { id: userId } = (req as any).user;
    const existing = await prisma.dailyCheckIn.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!existing) {
      throw new HttpError(404, "Check-in not found.");
    }

    const checkIn = await prisma.dailyCheckIn.update({
      where: { id: existing.id },
      data: {
        ...input,
        date: input.date ? new Date(input.date) : undefined,
      },
    });

    res.json({ checkIn });
  } catch (error) {
    next(error);
  }
});

export const checkInsRouter = router;
