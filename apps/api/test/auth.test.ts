import request from "supertest";
import { describe, expect, it } from "vitest";

import { prismaMock } from "./mocks.js";
import { app } from "../src/app.js";

const registerBody = {
  email: "alex@example.com",
  password: "Password123!",
  name: "Alex",
  phoneNumber: "+19075550123",
  timezone: "America/Juneau",
  units: "imperial" as const,
};

const loginBody = {
  email: registerBody.email,
  password: registerBody.password,
};

describe("auth endpoints", () => {
  it("registers a user and returns a token", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({
      id: "user-1",
      email: registerBody.email,
      name: registerBody.name,
      timezone: registerBody.timezone,
      units: registerBody.units,
    });

    const response = await request(app).post("/api/auth/register").send(registerBody).expect(201);

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: registerBody.email,
          passwordHash: "hash:Password123!",
          name: registerBody.name,
          phoneNumber: registerBody.phoneNumber,
          timezone: registerBody.timezone,
          units: registerBody.units,
        }),
      }),
    );
    expect(response.body.user).toEqual({
      id: "user-1",
      email: registerBody.email,
      name: registerBody.name,
      timezone: registerBody.timezone,
      units: registerBody.units,
    });
    expect(response.body.token).toBe("token:user-1:alex@example.com");
    expect(response.headers["set-cookie"]?.[0]).toContain("token=token%3Auser-1%3Aalex%40example.com");
  });

  it("logs a user in and returns a token", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: loginBody.email,
      passwordHash: "hash:Password123!",
      name: "Alex",
      timezone: "America/Juneau",
      units: "imperial",
    });

    const response = await request(app).post("/api/auth/login").send(loginBody).expect(200);

    expect(response.body).toEqual({
      token: "token:user-1:alex@example.com",
      user: {
        id: "user-1",
        email: loginBody.email,
        name: "Alex",
        timezone: "America/Juneau",
        units: "imperial",
      },
    });
    expect(response.headers["set-cookie"]?.[0]).toContain("token=token%3Auser-1%3Aalex%40example.com");
  });

  it("returns the current user from auth", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: registerBody.email,
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: registerBody.email,
      name: "Alex",
      phoneNumber: "+19075550123",
      timezone: "America/Juneau",
      height: "5'9\"",
      startingWeight: 190,
      goalWeight: 175,
      targetStartDate: new Date("2026-05-01T00:00:00.000Z"),
      targetEndDate: new Date("2026-08-31T00:00:00.000Z"),
      coachingTone: "direct",
      planStrictness: "standard",
      units: "imperial",
      smsConsent: true,
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer token:user-1:alex@example.com")
      .expect(200);

    expect(response.body.user).toMatchObject({
      id: "user-1",
      email: registerBody.email,
      name: "Alex",
      phoneNumber: "+19075550123",
      timezone: "America/Juneau",
      startingWeight: 190,
      goalWeight: 175,
      planStrictness: "standard",
      units: "imperial",
      smsConsent: true,
    });
  });
});
