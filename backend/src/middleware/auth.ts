import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export type Role =
  | "ADMIN"
  | "RECEPTIONIST"
  | "DOCTOR"
  | "ASSISTANT"
  | "ACCOUNTANT"
  | "CHIEF_ACCOUNTANT"
  | "INVENTORY_MANAGER";

export interface AuthenticatedRequest extends Request {
  auth?: { userId: string; username: string; role: Role };
}

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; username: string; role: Role };
    }
  }
}

const roles: readonly Role[] = [
  "ADMIN",
  "RECEPTIONIST",
  "DOCTOR",
  "ASSISTANT",
  "ACCOUNTANT",
  "CHIEF_ACCOUNTANT",
  "INVENTORY_MANAGER"
];

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : undefined;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.role !== "string" ||
      !roles.includes(payload.role as Role)
    ) {
      res.status(401).json({ error: "Invalid authentication token" });
      return;
    }

    req.auth = {
      userId: payload.sub,
      username: payload.username,
      role: payload.role as Role
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired authentication token" });
  }
}

export function allowRoles(...roles: Role[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
