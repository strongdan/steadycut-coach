import { beforeEach } from "vitest";

import { clearApiMocks } from "./mocks.js";

process.env.NODE_ENV = "test";
process.env.PORT = "4001";
process.env.WEB_ORIGIN = "http://localhost:5173";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/steadycut_test";
process.env.JWT_SECRET = "test-secret-key";
process.env.JWT_EXPIRES_IN = "7d";
process.env.AI_PROVIDER = "mock";
process.env.SMS_BASE_URL = "http://localhost:5173";
process.env.DEFAULT_TIMEZONE = "America/Juneau";

beforeEach(() => {
  clearApiMocks();
});
