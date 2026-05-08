import type { z } from "zod";

import type {
  dailyCheckInSchema,
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  planSchema,
  profileSchema,
  registerSchema,
  reminderPreferenceSchema,
} from "./schemas.js";

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type DailyCheckInInput = z.infer<typeof dailyCheckInSchema>;
export type ReminderPreferenceInput = z.infer<typeof reminderPreferenceSchema>;
