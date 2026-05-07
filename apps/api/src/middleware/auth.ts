import type { NextFunction, Request, Response } from "express";

import { prisma } from "../db/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { verifyToken } from "../lib/jwt.js";

export type AuthedRequest = Request & {
  user: {
    id: string;
    email: string;
  };
};

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.cookies.token;

    if (!token) {
      throw new HttpError(401, "Authentication required.");
    }

    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new HttpError(401, "Invalid authentication token.");
    }

    (req as AuthedRequest).user = user;
    next();
  } catch (error) {
    next(error);
  }
};
