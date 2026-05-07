import { Router } from "express";

import { dailyCheckInSchema } from "@steadycut/shared";

import { prisma } from "../db/prisma.js";
import { HttpError } from "../lib/http-error.js";
import type { AuthedRequest } from "../middleware/auth.js";
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
    const plan = await prisma.plan.findFirst({
      where: { userId: id, isActive: true, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

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

    res.status(201).json({
      checkIn,
      coachFeedback: generateMockFeedback(input),
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

const generateMockFeedback = (input: ReturnType<typeof dailyCheckInSchema.parse>) => {
  const positives = [];
  if (input.proteinStatus === "yes") positives.push("protein");
  if (input.fiberStatus === "yes") positives.push("fiber");
  if (!input.ateAfterCutoff) positives.push("cutoff");
  if (input.strengthStatus === "full") positives.push("strength");

  const leverage =
    input.energyScore <= 2 || input.sleepQualityScore <= 2
      ? "Recovery is the priority tomorrow. Keep the walk easy and protect sleep."
      : input.ateAfterCutoff
        ? "The highest-leverage fix is the evening window. Set up protein, fiber, and water before dinner."
        : "Repeat the same simple structure tomorrow before adding more effort.";

  return {
    summary:
      positives.length > 0
        ? `Strong signal today: ${positives.join(", ")} went well. ${leverage}`
        : `Not a failed day. ${leverage}`,
  };
};

export const checkInsRouter = router;
