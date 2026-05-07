import { Router } from "express";

import { planSchema } from "@steadycut/shared";

import { prisma } from "../db/prisma.js";
import { HttpError } from "../lib/http-error.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/current", async (req, res, next) => {
  try {
    const { id } = (req as AuthedRequest).user;
    const plan = await prisma.plan.findFirst({
      where: { userId: id, isActive: true, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const input = planSchema.parse(req.body);
    const { id } = (req as AuthedRequest).user;

    await prisma.plan.updateMany({
      where: { userId: id, isActive: true },
      data: { isActive: false },
    });

    const plan = await prisma.plan.create({
      data: {
        userId: id,
        ...input,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        preferredMealTemplates: input.preferredMealTemplates,
        preferredTrainingTypes: input.preferredTrainingTypes,
        reminderPreferences: input.reminderPreferences,
        isActive: true,
      },
    });

    await prisma.user.update({
      where: { id },
      data: {
        startingWeight: input.startingWeight,
        goalWeight: input.goalWeight ?? null,
        targetStartDate: new Date(input.startDate),
        targetEndDate: new Date(input.endDate),
        planStrictness: input.planStrictness,
      },
    });

    res.status(201).json({ plan });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const input = planSchema.partial().parse(req.body);
    const { id: userId } = (req as AuthedRequest).user;
    const existing = await prisma.plan.findFirst({
      where: { id: req.params.id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new HttpError(404, "Plan not found.");
    }

    const plan = await prisma.plan.update({
      where: { id: existing.id },
      data: {
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        preferredMealTemplates: input.preferredMealTemplates,
        preferredTrainingTypes: input.preferredTrainingTypes,
        reminderPreferences: input.reminderPreferences,
      },
    });

    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

export const planRouter = router;
