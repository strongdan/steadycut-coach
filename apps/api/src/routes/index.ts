import { Router } from "express";

import { authRouter } from "./auth.js";
import { checkInsRouter } from "./check-ins.js";
import { dashboardRouter } from "./dashboard.js";
import { internalJobsRouter } from "./internal-jobs.js";
import { planRouter } from "./plan.js";
import { progressPhotosRouter } from "./progress-photos.js";
import { remindersRouter } from "./reminders.js";
import { weeklyReviewsRouter } from "./weekly-reviews.js";
import { adminRouter } from "./admin.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRouter);
router.use("/plan", planRouter);
router.use("/dashboard", dashboardRouter);
router.use("/check-ins", checkInsRouter);
router.use("/weekly-reviews", weeklyReviewsRouter);
router.use("/reminders", remindersRouter);
router.use("/progress-photos", progressPhotosRouter);
router.use("/internal/jobs", internalJobsRouter);
router.use("/admin", adminRouter);

export const apiRouter = router;
