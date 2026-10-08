import bcrypt from "bcryptjs";
import sql from "mssql/msnodesqlv8";
import { z } from "zod";
import { config } from "../config";
import { connectDatabase, closeDatabase } from "../db";
import type { Role } from "../middleware/auth";
import { passwordPolicySchema } from "../security/password-policy";

const roles = [
  "ADMIN",
  "RECEPTIONIST",
  "DOCTOR",
  "ASSISTANT",
  "ACCOUNTANT",
  "CHIEF_ACCOUNTANT",
  "INVENTORY_MANAGER"
] as const satisfies readonly Role[];

const testUsersSchema = z
  .array(z.object({
    username: z.string().trim().min(3).max(100),
    password: passwordPolicySchema,
    role: z.enum(roles)
  }).strict())
  .min(1)
  .max(20)
  .superRefine((users, context) => {
    const usernames = new Set<string>();
    users.forEach((user, index) => {
      const normalized = user.username.toLocaleLowerCase("en-US");
      if (usernames.has(normalized)) {
        context.addIssue({
          code: "custom",
          path: [index, "username"],
          message: "Test usernames must be unique"
        });
      }
      usernames.add(normalized);
    });
  });

async function seedTestUsers(): Promise<void> {
  if (config.NODE_ENV === "production") {
    throw new Error("Test-user seeding is disabled in production");
  }

  const rawUsers = process.env.TEST_USERS_JSON;
  if (!rawUsers) {
    throw new Error("Set TEST_USERS_JSON to a JSON array of test users");
  }
  const users = testUsersSchema.parse(JSON.parse(rawUsers));
  const pool = await connectDatabase();
  const transaction = new sql.Transaction(pool);
  let transactionStarted = false;
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;
    const outcomes: string[] = [];
    for (const user of users) {
      const request = new sql.Request(transaction)
        .input("username", sql.NVarChar(100), user.username);
      const existing = await request.query(`
        SELECT UserId
        FROM dbo.Users WITH (UPDLOCK, HOLDLOCK)
        WHERE Username = @username
      `);
      if (existing.recordset.length > 0) {
        outcomes.push(`${user.username}: unchanged`);
        continue;
      }

      const passwordHash = await bcrypt.hash(user.password, 12);
      const inserted = await new sql.Request(transaction)
        .input("username", sql.NVarChar(100), user.username)
        .input("passwordHash", sql.NVarChar(100), passwordHash)
        .input("role", sql.NVarChar(30), user.role)
        .query(`
          INSERT INTO dbo.Users (Username, PasswordHash, Role)
          OUTPUT INSERTED.UserId
          VALUES (@username, @passwordHash, @role)
        `);
      const userId = inserted.recordset[0].UserId as string;
      await new sql.Request(transaction)
        .input("userId", sql.UniqueIdentifier, userId)
        .input("username", sql.NVarChar(100), user.username)
        .input("role", sql.NVarChar(30), user.role)
        .query(`
          INSERT INTO dbo.AuditLogs (UserId, Action, EntityName, EntityId, DetailJson, CreatedBy)
          VALUES (@userId, N'TEST_USER_SEEDED', N'User', @userId,
                  (SELECT @username AS username, @role AS role FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                  @userId)
        `);
      outcomes.push(`${user.username}: created`);
    }
    await transaction.commit();
    transactionStarted = false;
    outcomes.forEach((outcome) => console.log(outcome));
  } catch (error) {
    if (transactionStarted) {
      await transaction.rollback();
    }
    throw error;
  } finally {
    await closeDatabase();
  }
}

seedTestUsers().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
