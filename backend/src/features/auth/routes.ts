import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import sql from "mssql/msnodesqlv8";
import { config } from "../../config";
import { getDatabase } from "../../db";
import { allowRoles, authenticate, type Role } from "../../middleware/auth";
import { passwordPolicySchema } from "../../security/password-policy";
import { recordAudit } from "../../services/audit";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." }
});

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200)
});

const roles = [
  "ADMIN",
  "RECEPTIONIST",
  "DOCTOR",
  "ASSISTANT",
  "ACCOUNTANT",
  "CHIEF_ACCOUNTANT",
  "INVENTORY_MANAGER"
] as const satisfies readonly Role[];

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(100),
  password: passwordPolicySchema,
  role: z.enum(roles)
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const result = await getDatabase()
      .request()
      .input("username", sql.NVarChar(100), username)
      .query(`
        SELECT UserId, Username, PasswordHash, Role
        FROM dbo.Users
        WHERE Username = @username AND IsActive = 1 AND IsDeleted = 0
      `);
    const user = result.recordset[0] as
      | { UserId: string; Username: string; PasswordHash: string; Role: Role }
      | undefined;

    if (!user || !(await bcrypt.compare(password, user.PasswordHash))) {
      await recordAudit(null, "LOGIN_FAILED", "User", null, { username });
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    const token = jwt.sign(
      { username: user.Username, role: user.Role },
      config.JWT_SECRET,
      {
        subject: user.UserId,
        expiresIn: config.JWT_EXPIRES_IN_SECONDS,
        issuer: "doan-tot-nghiep-erp"
      }
    );
    await recordAudit(user.UserId, "LOGIN_SUCCEEDED", "User", user.UserId);
    res.json({
      accessToken: token,
      tokenType: "Bearer",
      expiresIn: config.JWT_EXPIRES_IN_SECONDS,
      user: { id: user.UserId, username: user.Username, role: user.Role }
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/users",
  authenticate,
  allowRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const input = createUserSchema.parse(req.body);
      const passwordHash = await bcrypt.hash(input.password, 12);
      const result = await getDatabase()
        .request()
        .input("username", sql.NVarChar(100), input.username)
        .input("passwordHash", sql.NVarChar(100), passwordHash)
        .input("role", sql.NVarChar(30), input.role)
        .input("createdBy", sql.UniqueIdentifier, req.auth!.userId)
        .query(`
          INSERT INTO dbo.Users (Username, PasswordHash, Role, CreatedBy)
          OUTPUT INSERTED.UserId, INSERTED.Username, INSERTED.Role
          VALUES (@username, @passwordHash, @role, @createdBy)
        `);

      const user = result.recordset[0] as {
        UserId: string;
        Username: string;
        Role: Role;
      };
      await recordAudit(
        req.auth!.userId,
        "USER_CREATED",
        "User",
        user.UserId,
        { role: user.Role }
      );
      res.status(201).json({
        id: user.UserId,
        username: user.Username,
        role: user.Role
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
