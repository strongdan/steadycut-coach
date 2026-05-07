import { Router } from "express";

import { prisma } from "../db/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/today", async (req, res, next) => {
  try {
    const { id } = (req as AuthedRequest).user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [plan, checkIn, mealTemplates] = await Promise.all([
      prisma.plan.findFirst({
        where: { userId: id, isActive: true, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
      prisma.dailyCheckIn.findFirst({
        where: { userId: id, date: today },
      }),
      prisma.mealTemplate.findMany({
        where: {
          OR: [{ userId: null, isDefault: true }, { userId: id }],
          isActive: true,
          deletedAt: null,
        },
        take: 6,
      }),
    ]);

    const checklist = [
      { key: "pregame", label: "Protein + fiber + water before meals", completed: false },
      { key: "breakfast", label: "Breakfast completed", completed: false },
      { key: "lunch", label: "Lunch completed", completed: false },
      { key: "dinner", label: "Dinner completed", completed: false },
      { key: "walk", label: "Walk completed", completed: (checkIn?.steps ?? 0) >= (plan?.stepTarget ?? 8000) },
      { key: "strength", label: "Strength session if scheduled", completed: checkIn?.strengthStatus === "full" },
      { key: "cutoff", label: "No food or caloric drinks after cutoff", completed: checkIn ? !checkIn.ateAfterCutoff : false },
      { key: "sleep", label: "Sleep logged", completed: Boolean(checkIn?.sleepQualityScore) },
    ];

    res.json({
      today: {
        date: today.toISOString(),
        plan,
        checkIn,
        checklist,
        aiCoachNudge: "Today’s win is still the simple version: walk, protein/fiber/water, then protect the cutoff.",
        mealTemplates,
      },
    });
  } catch (error) {
    next(error);
  }
});

export const dashboardRouter = router;
