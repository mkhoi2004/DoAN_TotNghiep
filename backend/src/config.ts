import "dotenv/config";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().min(60).max(86400).default(900),
  PII_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/),
  PII_HASH_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/),
  DB_SERVER: z.string().min(1),
  DB_DATABASE: z.string().min(1),
  DB_DRIVER: z.string().default("{ODBC Driver 18 for SQL Server}"),
  DB_TRUST_SERVER_CERTIFICATE: z.enum(["true", "false"]).default("false")
});

export const config = environmentSchema.parse(process.env);
