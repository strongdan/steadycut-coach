import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

type JwtPayload = {
  sub: string;
  email: string;
};

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });

export const verifyToken = (token: string) => jwt.verify(token, env.JWT_SECRET) as JwtPayload;
