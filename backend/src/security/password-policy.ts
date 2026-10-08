import { z } from "zod";

export const passwordPolicySchema = z
  .string()
  .min(9, "Password must be longer than 8 characters")
  .max(200)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");
