import request from "supertest";
import { describe, expect, it } from "vitest";

import { prismaMock } from "./mocks.js";
import { app } from "../src/app.js";

const authHeader = "Bearer token:user-1:alex@example.com";

const activeUser = {
  id: "user-1",
  email: "alex@example.com",
};

const planBody = {
  name: "4-Month Fat Loss Plan",
  startDate: "2026-05-01",
  endDate: "2026-08-31",
  startingWeight: 190,
  goalWeight: 175,
  proteinTargetGrams: 170,
  fiberTargetGrams: 40,
  waterTargetLiters: 3,
  stepTarget: 9000,
  strengthSessionsPerWeek: 4,
  cardioSessionsPerWeek: 3,
  eatingCutoffTime: "20:00",
  alcoholGoal: "0 drinks ideal",
  planStrictness: "standard" as const,
  preferredMealTemplates: ["chia-protein-pudding", "egg-whites-spinach-beans-salsa"],
  preferredTrainingTypes: ["strength", "walk"],
  reminderPreferences: ["morning", "cutoff"],
};

const createdPlan = {
  id: "plan-1",
  userId: activeUser.id,
  ...planBody,
  startDate: new Date(planBody.startDate),
  endDate: new Date(planBody.endDate),
  isActive: true,
};

describe("plan and check-in endpoints", () => {
  it("creates a plan and returns it as the current active plan", async () => {
    prismaMock.user.findUnique.mockResolvedValue(activeUser);
    prismaMock.plan.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.plan.create.mockResolvedValue(createdPlan);
    prismaMock.plan.findFirst.mockResolvedValue(createdPlan);
    prismaMock.user.update.mockResolvedValue({ id: activeUser.id });

    const createResponse = await request(app)
      .post("/api/plan")
      .set("Authorization", authHeader)
      .send(planBody)
      .expect(201);

    expect(prismaMock.plan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: activeUser.id,
          name: planBody.name,
          startDate: new Date(planBody.startDate),
          endDate: new Date(planBody.endDate),
          startingWeight: planBody.startingWeight,
          goalWeight: planBody.goalWeight,
          proteinTargetGrams: planBody.proteinTargetGrams,
          fiberTargetGrams: planBody.fiberTargetGrams,
          waterTargetLiters: planBody.waterTargetLiters,
          stepTarget: planBody.stepTarget,
          strengthSessionsPerWeek: planBody.strengthSessionsPerWeek,
          cardioSessionsPerWeek: planBody.cardioSessionsPerWeek,
          eatingCutoffTime: planBody.eatingCutoffTime,
          alcoholGoal: planBody.alcoholGoal,
          planStrictness: planBody.planStrictness,
          preferredMealTemplates: planBody.preferredMealTemplates,
          preferredTrainingTypes: planBody.preferredTrainingTypes,
          reminderPreferences: planBody.reminderPreferences,
          isActive: true,
        }),
      }),
    );
    expect(createResponse.body.plan).toMatchObject({
      id: "plan-1",
      name: planBody.name,
      proteinTargetGrams: planBody.proteinTargetGrams,
      stepTarget: planBody.stepTarget,
      isActive: true,
    });

    const currentResponse = await request(app)
      .get("/api/plan/current")
      .set("Authorization", authHeader)
      .expect(200);

    expect(prismaMock.plan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: activeUser.id,
          isActive: true,
          deletedAt: null,
        },
      }),
    );
    expect(currentResponse.body.plan).toMatchObject({
      id: "plan-1",
      name: planBody.name,
      isActive: true,
    });
  });

  it("creates a daily check-in and returns coaching feedback", async () => {
    const checkInBody = {
      date: "2026-05-06",
      weight: 189.4,
      steps: 9300,
      waterLiters: 3.1,
      proteinStatus: "yes" as const,
      fiberStatus: "yes" as const,
      ateAfterCutoff: false,
      alcoholDrinks: 0,
      strengthStatus: "full" as const,
      cardioType: "walk" as const,
      cardioMinutes: 45,
      hungerScore: 2,
      energyScore: 4,
      moodScore: 4,
      sleepQualityScore: 4,
      notes: "Kept dinner simple.",
    };

    const savedCheckIn = {
      id: "checkin-1",
      userId: activeUser.id,
      planId: "plan-1",
      ...checkInBody,
      date: new Date(checkInBody.date),
    };

    prismaMock.user.findUnique.mockResolvedValue(activeUser);
    prismaMock.plan.findFirst.mockResolvedValue({
      id: "plan-1",
      userId: activeUser.id,
      stepTarget: 9000,
      isActive: true,
      deletedAt: null,
    });
    prismaMock.dailyCheckIn.upsert.mockResolvedValue(savedCheckIn);

    const response = await request(app)
      .post("/api/check-ins")
      .set("Authorization", authHeader)
      .send(checkInBody)
      .expect(201);

    expect(prismaMock.dailyCheckIn.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_date: {
            userId: activeUser.id,
            date: new Date(checkInBody.date),
          },
        },
        create: expect.objectContaining({
          userId: activeUser.id,
          planId: "plan-1",
          date: new Date(checkInBody.date),
          waterLiters: checkInBody.waterLiters,
          proteinStatus: checkInBody.proteinStatus,
          fiberStatus: checkInBody.fiberStatus,
          ateAfterCutoff: checkInBody.ateAfterCutoff,
        }),
      }),
    );
    expect(response.body.checkIn).toMatchObject({
      id: "checkin-1",
      planId: "plan-1",
      waterLiters: checkInBody.waterLiters,
      proteinStatus: "yes",
      fiberStatus: "yes",
    });
    expect(response.body.coachFeedback.summary).toContain("Strong signal today");
  });
});
