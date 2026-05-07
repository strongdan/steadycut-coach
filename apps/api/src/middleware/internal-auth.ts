import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";

export const requireInternalJobAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    if (!token || token !== env.INTERNAL_JOB_TOKEN) {
      throw new HttpError(401, "Invalid internal job token.");
    }

    next();
  } catch (error) {
    next(error);
  }
};
