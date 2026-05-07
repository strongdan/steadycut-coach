import { Router } from "express";

import { reminderPreferenceSchema } from "@steadycut/shared";

import { prisma } from "../db/prisma.js";
import { HttpError } from "../lib/http-error.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const defaultTemplates: Record<string, string> = {
  morning: "Today's win: walk, hit protein/fiber/water, and keep the 8 pm cutoff. Open your checklist: {{link}}",
  meal: "Pregame this meal: protein + fiber + water first.",
  cutoff: "Cutoff is coming. Broth or non-caloric tea is okay if you planned it.",
  weekly: "Weekly review time. We're looking for patterns, not perfection.",
  missed_check_in: "No log yet today. Send the quick check-in before the evening window gets messy.",
  motivation: "Keep it simple: repeat the breakfast, get the walk, and protect the cutoff.",
};

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { id } = (req as AuthedRequest).user;
    const reminders = await prisma.reminderPreference.findMany({
      where: { userId: id, deletedAt: null },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    });

    res.json({ reminders });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const input = reminderPreferenceSchema.parse(req.body);
    const { id } = (req as AuthedRequest).user;

    const reminder = await prisma.reminderPreference.create({
      data: {
        userId: id,
        ...input,
        messageTemplate: input.messageTemplate || defaultTemplates[input.type],
        daysOfWeekJson: input.daysOfWeekJson,
      },
    });

    res.status(201).json({ reminder });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const input = reminderPreferenceSchema.partial().parse(req.body);
    const { id: userId } = (req as AuthedRequest).user;

    const existing = await prisma.reminderPreference.findFirst({
      where: { id: req.params.id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new HttpError(404, "Reminder preference not found.");
    }

    const reminder = await prisma.reminderPreference.update({
      where: { id: existing.id },
      data: {
        ...input,
        daysOfWeekJson: input.daysOfWeekJson,
      },
    });

    res.json({ reminder });
  } catch (error) {
    next(error);
  }
});

export const remindersRouter = router;
