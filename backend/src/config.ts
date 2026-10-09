import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

loadEnv({ path: resolve(__dirname, "../.env") });

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

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const issues = parsedEnvironment.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Invalid backend environment configuration:\n${issues}\n` +
      "Create and complete backend\\.env from backend\\.env.example. " +
      "Generate JWT_SECRET, PII_ENCRYPTION_KEY, and PII_HASH_KEY as described in README.md."
  );
}

export const config = parsedEnvironment.data;
