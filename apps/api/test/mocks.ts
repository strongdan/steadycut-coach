import { vi } from "vitest";

const state = vi.hoisted(() => {
  const prismaMock = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    plan: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dailyCheckIn: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    mealTemplate: {
      findMany: vi.fn(),
    },
  };

  const passwordMock = {
    hashPassword: vi.fn(async (value: string) => `hash:${value}`),
    comparePassword: vi.fn(async (value: string, hash: string) => hash === `hash:${value}`),
  };

  const jwtMock = {
    signToken: vi.fn(({ sub, email }: { sub: string; email: string }) => `token:${sub}:${email}`),
    verifyToken: vi.fn((token: string) => {
      const [prefix, sub, email] = token.split(":");

      if (prefix !== "token" || !sub || !email) {
        throw new Error("Invalid token.");
      }

      return { sub, email };
    }),
  };

  return { prismaMock, passwordMock, jwtMock };
});

const prismaMock = state.prismaMock;
const passwordMock = state.passwordMock;
const jwtMock = state.jwtMock;

const installDefaultAuthMocks = () => {
  passwordMock.hashPassword.mockImplementation(async (value: string) => `hash:${value}`);
  passwordMock.comparePassword.mockImplementation(
    async (value: string, hash: string) => hash === `hash:${value}`,
  );
  jwtMock.signToken.mockImplementation(
    ({ sub, email }: { sub: string; email: string }) => `token:${sub}:${email}`,
  );
  jwtMock.verifyToken.mockImplementation((token: string) => {
    const [prefix, sub, email] = token.split(":");

    if (prefix !== "token" || !sub || !email) {
      throw new Error("Invalid token.");
    }

    return { sub, email };
  });
};

vi.mock("../src/db/prisma.js", () => ({
  prisma: state.prismaMock,
}));

vi.mock("../src/lib/password.js", () => state.passwordMock);

vi.mock("../src/lib/jwt.js", () => state.jwtMock);

export { jwtMock, passwordMock, prismaMock };

export const clearApiMocks = () => {
  const mockedFns = [
    prismaMock.user.findUnique,
    prismaMock.user.create,
    prismaMock.user.update,
    prismaMock.plan.findFirst,
    prismaMock.plan.updateMany,
    prismaMock.plan.create,
    prismaMock.plan.update,
    prismaMock.dailyCheckIn.findMany,
    prismaMock.dailyCheckIn.findFirst,
    prismaMock.dailyCheckIn.upsert,
    prismaMock.dailyCheckIn.update,
    prismaMock.mealTemplate.findMany,
    passwordMock.hashPassword,
    passwordMock.comparePassword,
    jwtMock.signToken,
    jwtMock.verifyToken,
  ];

  for (const mockedFn of mockedFns) {
    mockedFn.mockReset();
  }

  installDefaultAuthMocks();
};

installDefaultAuthMocks();
