import type { z } from "zod";

import type {
  dailyCheckInSchema,
  loginSchema,
  planSchema,
  profileSchema,
  registerSchema,
  reminderPreferenceSchema,
} from "./schemas";

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type DailyCheckInInput = z.infer<typeof dailyCheckInSchema>;
export type ReminderPreferenceInput = z.infer<typeof reminderPreferenceSchema>;
