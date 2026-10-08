import bcrypt from "bcryptjs";
import sql from "mssql/msnodesqlv8";
import { connectDatabase, closeDatabase } from "../db";
import { passwordPolicySchema } from "../security/password-policy";

async function bootstrap(): Promise<void> {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "Set BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD for this one-time operation"
    );
  }
  passwordPolicySchema.parse(password);

  const pool = await connectDatabase();
  try {
    const existing = await pool
      .request()
      .query("SELECT COUNT_BIG(*) AS Count FROM dbo.Users WHERE Role = N'ADMIN'");
    if (Number(existing.recordset[0].Count) > 0) {
      throw new Error("An admin account already exists; bootstrap is disabled");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool
      .request()
      .input("username", sql.NVarChar(100), username)
      .input("passwordHash", sql.NVarChar(100), passwordHash)
      .query(`
        INSERT INTO dbo.Users (Username, PasswordHash, Role)
        VALUES (@username, @passwordHash, N'ADMIN')
      `);
    console.log(`Created initial admin account: ${username}`);
  } finally {
    await closeDatabase();
  }
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
