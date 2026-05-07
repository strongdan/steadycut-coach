import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import path from "node:path";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.set("trust proxy", true);

app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  }),
);
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use("/uploads", express.static(path.resolve(process.cwd(), env.UPLOADS_DIR)));

app.get("/", (_req, res) => {
  res.json({
    name: "SteadyCut API",
    message: "Production-minded Phase 1 API scaffold for a 4-month coaching app.",
    disclaimer: "This product provides general wellness guidance and is not medical advice.",
  });
});

app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
