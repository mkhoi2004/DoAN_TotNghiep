import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  const errorNumber =
    error && typeof error === "object" && "number" in error &&
    typeof error.number === "number"
      ? error.number
      : undefined;
  if (errorNumber === 2601 || errorNumber === 2627) {
    res.status(409).json({ error: "A record with the same unique value already exists" });
    return;
  }
  if (errorNumber === 547) {
    res.status(409).json({ error: "The record is referenced by other data" });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}
