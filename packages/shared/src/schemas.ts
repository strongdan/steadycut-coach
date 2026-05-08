import { z } from "zod";

import {
  cardioTypeOptions,
  coachingToneOptions,
  planStrictnessOptions,
  proteinStatusOptions,
  reminderTypeOptions,
  trainingStatusOptions,
  unitsOptions,
} from "./constants.js";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phoneNumber: z.string().min(7).optional().or(z.literal("")),
  timezone: z.string().min(1).default("America/Juneau"),
  units: z.enum(unitsOptions).default("imperial"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetConfirmSchema = z.object({
  email: z.string().email(),
  code: z.string().trim().length(6),
  newPassword: z.string().min(8),
});

export const profileSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().min(7).optional().or(z.literal("")),
  timezone: z.string().min(1),
  height: z.string().optional(),
  startingWeight: z.number().positive().optional(),
  goalWeight: z.number().positive().optional().nullable(),
  targetStartDate: z.string().optional(),
  targetEndDate: z.string().optional(),
  preferredReminderTimes: z.array(z.string()).default([]),
  coachingTone: z.enum(coachingToneOptions).default("direct"),
  planStrictness: z.enum(planStrictnessOptions).default("standard"),
  units: z.enum(unitsOptions).default("imperial"),
});

export const planSchema = z.object({
  name: z.string().min(1).default("4-Month Fat Loss Plan"),
  startDate: z.string(),
  endDate: z.string(),
  startingWeight: z.number().positive(),
  goalWeight: z.number().positive().optional().nullable(),
  proteinTargetGrams: z.number().int().min(50).max(300),
  fiberTargetGrams: z.number().int().min(10).max(100),
  waterTargetLiters: z.number().min(1).max(8),
  stepTarget: z.number().int().min(1000).max(30000),
  strengthSessionsPerWeek: z.number().int().min(0).max(7),
  cardioSessionsPerWeek: z.number().int().min(0).max(7),
  eatingCutoffTime: z.string(),
  alcoholGoal: z.string().default("0 drinks ideal"),
  planStrictness: z.enum(planStrictnessOptions).default("standard"),
  preferredMealTemplates: z.array(z.string()).default([]),
  preferredTrainingTypes: z.array(z.string()).default([]),
  reminderPreferences: z.array(z.string()).default([]),
});

export const dailyCheckInSchema = z.object({
  date: z.string(),
  weight: z.number().positive().optional().nullable(),
  steps: z.number().int().nonnegative().optional().nullable(),
  waterLiters: z.number().min(0).max(10),
  proteinStatus: z.enum(proteinStatusOptions),
  fiberStatus: z.enum(proteinStatusOptions),
  ateAfterCutoff: z.boolean(),
  alcoholDrinks: z.number().int().min(0).max(20),
  strengthStatus: z.enum(trainingStatusOptions),
  cardioType: z.enum(cardioTypeOptions),
  cardioMinutes: z.number().int().min(0).max(600).default(0),
  hungerScore: z.number().int().min(1).max(5),
  energyScore: z.number().int().min(1).max(5),
  moodScore: z.number().int().min(1).max(5),
  sleepQualityScore: z.number().int().min(1).max(5),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export const reminderPreferenceSchema = z.object({
  type: z.enum(reminderTypeOptions),
  enabled: z.boolean(),
  timeOfDay: z.string(),
  daysOfWeekJson: z.array(z.number().int().min(0).max(6)).default([]),
  channel: z.enum(["sms", "whatsapp", "push", "email"]).default("sms"),
  messageTemplate: z.string().min(1),
});
