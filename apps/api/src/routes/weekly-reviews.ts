import { Router } from "express";

import { prisma } from "../db/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { id } = (req as AuthedRequest).user;
    const reviews = await prisma.weeklyReview.findMany({
      where: { userId: id },
      orderBy: { weekStartDate: "desc" },
      take: 12,
    });

    res.json({ reviews });
  } catch (error) {
    next(error);
  }
});

router.post("/generate", async (req, res, next) => {
  try {
    const { id } = (req as AuthedRequest).user;
    const requestedStart = typeof req.body?.weekStartDate === "string" ? new Date(req.body.weekStartDate) : new Date();
    const weekStartDate = startOfWeek(requestedStart);
    const weekEndDate = new Date(weekStartDate.getTime() + 6 * MS_PER_DAY);
    weekEndDate.setHours(23, 59, 59, 999);

    const [plan, checkIns] = await Promise.all([
      prisma.plan.findFirst({
        where: { userId: id, isActive: true, deletedAt: null },
        orderBy: { createdAt: "desc" },
      }),
      prisma.dailyCheckIn.findMany({
        where: {
          userId: id,
          date: {
            gte: weekStartDate,
            lte: weekEndDate,
          },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    const summary = summarizeWeek(checkIns, plan?.cardioSessionsPerWeek ?? 0, plan?.strengthSessionsPerWeek ?? 0);

    const review = await prisma.weeklyReview.upsert({
      where: {
        id: `${id}-${weekStartDate.toISOString().slice(0, 10)}`,
      },
      update: {
        planId: plan?.id,
        avgWeight: summary.avgWeight,
        adherenceScore: summary.adherenceScore,
        strengthSessions: summary.strengthSessions,
        cardioSessions: summary.cardioSessions,
        walkingDays: summary.walkingDays,
        alcoholTotal: summary.alcoholTotal,
        cutoffAdherencePct: summary.cutoffAdherencePct,
        coachSummary: summary.coachSummary,
        recommendationStatus: summary.recommendationStatus,
      },
      create: {
        id: `${id}-${weekStartDate.toISOString().slice(0, 10)}`,
        userId: id,
        planId: plan?.id,
        weekStartDate,
        weekEndDate,
        avgWeight: summary.avgWeight,
        adherenceScore: summary.adherenceScore,
        strengthSessions: summary.strengthSessions,
        cardioSessions: summary.cardioSessions,
        walkingDays: summary.walkingDays,
        alcoholTotal: summary.alcoholTotal,
        cutoffAdherencePct: summary.cutoffAdherencePct,
        coachSummary: summary.coachSummary,
        recommendationStatus: summary.recommendationStatus,
      },
    });

    res.status(201).json({ review, inputsAnalyzed: checkIns.length });
  } catch (error) {
    next(error);
  }
});

function startOfWeek(input: Date) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  return date;
}

function summarizeWeek(
  checkIns: Array<{
    weight: number | null;
    proteinStatus: string;
    fiberStatus: string;
    ateAfterCutoff: boolean;
    alcoholDrinks: number;
    strengthStatus: string;
    cardioType: string;
    cardioMinutes: number;
    energyScore: number;
    hungerScore: number;
    sleepQualityScore: number;
    steps: number | null;
  }>,
  cardioTarget: number,
  strengthTarget: number,
) {
  const weights = checkIns.map((c) => c.weight).filter((value): value is number => typeof value === "number");
  const avgWeight = weights.length ? Number((weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1)) : null;
  const strengthSessions = checkIns.filter((c) => c.strengthStatus === "full").length;
  const cardioSessions = checkIns.filter((c) => c.cardioType !== "none" && c.cardioMinutes > 0).length;
  const walkingDays = checkIns.filter((c) => (c.steps ?? 0) >= 8000 || c.cardioType === "walk").length;
  const alcoholTotal = checkIns.reduce((sum, c) => sum + c.alcoholDrinks, 0);
  const cutoffWins = checkIns.filter((c) => !c.ateAfterCutoff).length;
  const cutoffAdherencePct = checkIns.length ? Number(((cutoffWins / checkIns.length) * 100).toFixed(0)) : null;
  const proteinWins = checkIns.filter((c) => c.proteinStatus === "yes").length;
  const fiberWins = checkIns.filter((c) => c.fiberStatus === "yes").length;
  const avgEnergy = average(checkIns.map((c) => c.energyScore));
  const avgSleep = average(checkIns.map((c) => c.sleepQualityScore));
  const avgHunger = average(checkIns.map((c) => c.hungerScore));

  const adherenceSignals = [
    checkIns.length >= 5 ? 1 : 0,
    proteinWins >= Math.max(4, Math.ceil(checkIns.length * 0.6)) ? 1 : 0,
    fiberWins >= Math.max(4, Math.ceil(checkIns.length * 0.6)) ? 1 : 0,
    cutoffWins >= Math.max(4, Math.ceil(checkIns.length * 0.6)) ? 1 : 0,
    walkingDays >= Math.max(5, Math.ceil(checkIns.length * 0.7)) ? 1 : 0,
    strengthSessions >= Math.max(2, Math.min(strengthTarget, 2)) ? 1 : 0,
  ];
  const adherenceScore = Number(((adherenceSignals.reduce((a, b) => a + b, 0) / adherenceSignals.length) * 100).toFixed(0));

  let recommendationStatus: "green" | "yellow" | "red" = "green";
  let coachSummary = "Green week. Do not add complexity. Repeat the same simple structure next week.";

  if (avgEnergy <= 2.5 || avgSleep <= 2.5) {
    recommendationStatus = "red";
    coachSummary =
      "Recover and reset. Keep walking, simplify the checklist, and protect sleep before pushing harder.";
  } else if (adherenceScore < 60 || strengthSessions < Math.max(2, strengthTarget - 1)) {
    recommendationStatus = "yellow";
    coachSummary =
      "Simplify the plan. Prioritize protein, fiber, daily walking, and strength consistency before adding cardio.";
  } else if (avgHunger >= 4) {
    recommendationStatus = "yellow";
    coachSummary =
      "Hunger stayed high. Increase protein, fiber, and meal volume first instead of tightening the plan.";
  } else if (cardioTarget > 0 && cardioSessions < Math.max(1, cardioTarget - 1)) {
    coachSummary =
      "Solid week. The next improvement is just one more easy cardio or walking block, not a full plan overhaul.";
  }

  return {
    avgWeight,
    adherenceScore,
    strengthSessions,
    cardioSessions,
    walkingDays,
    alcoholTotal,
    cutoffAdherencePct,
    recommendationStatus,
    coachSummary,
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export const weeklyReviewsRouter = router;
