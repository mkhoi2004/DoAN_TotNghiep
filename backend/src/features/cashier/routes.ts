import { randomUUID } from "node:crypto";
import { Router } from "express";
import sql from "mssql/msnodesqlv8";
import { z } from "zod";
import { getDatabase } from "../../db";
import { calculateCashClose } from "../../domain/invariants";
import { allowRoles, authenticate, type AuthenticatedRequest } from "../../middleware/auth";

const router = Router();

function actorId(req: AuthenticatedRequest): string {
  if (!req.auth) throw new Error("Authenticated user is missing");
  return req.auth.userId;
}

async function audit(
  request: sql.Request,
  req: AuthenticatedRequest,
  action: string,
  entity: string,
  entityId: string,
  detail: Record<string, unknown> = {}
): Promise<void> {
  await request
    .input("auditUserId", sql.UniqueIdentifier, actorId(req))
    .input("auditAction", sql.NVarChar(100), action)
    .input("auditEntity", sql.NVarChar(100), entity)
    .input("auditEntityId", sql.NVarChar(100), entityId)
    .input("auditDetail", sql.NVarChar(sql.MAX), JSON.stringify(detail))
    .query(`
      INSERT INTO dbo.AuditLogs (UserId, Action, EntityName, EntityId, DetailJson, CreatedBy)
      VALUES (@auditUserId, @auditAction, @auditEntity, @auditEntityId, @auditDetail, @auditUserId)
    `);
}

router.get(
  "/cashier/shifts/current",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST", "ACCOUNTANT", "CHIEF_ACCOUNTANT"),
  async (req, res, next) => {
    try {
      const result = await getDatabase()
        .request()
        .input("cashierId", sql.UniqueIdentifier, actorId(req))
        .query(`
          SELECT TOP (1) CashShiftId, ShiftCode, Status, OpeningFloat,
                 ExpectedCash, DifferenceAmount, OpenedAt
          FROM dbo.CashShifts
          WHERE CashierId = @cashierId AND Status IN (N'OPEN', N'PENDING_CLOSE')
            AND IsDeleted = 0
          ORDER BY OpenedAt DESC
        `);
      res.json(result.recordset[0] ?? null);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/cashier/shifts/pending",
  authenticate,
  allowRoles("ADMIN", "CHIEF_ACCOUNTANT"),
  async (_req, res, next) => {
    try {
      const result = await getDatabase().request().query(`
        SELECT TOP (100) shift.CashShiftId, shift.ShiftCode, shift.CashierId,
               cashier.Username AS CashierUsername, shift.OpeningFloat,
               shift.ExpectedCash, shift.CountedCash, shift.DifferenceAmount,
               shift.CloseReason, shift.ClosedAt
        FROM dbo.CashShifts shift
        JOIN dbo.Users cashier ON cashier.UserId = shift.CashierId
        WHERE shift.Status = N'PENDING_CLOSE' AND shift.IsDeleted = 0
        ORDER BY shift.ClosedAt
      `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/cashier/payments",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST", "ACCOUNTANT", "CHIEF_ACCOUNTANT"),
  async (_req, res, next) => {
    try {
      const result = await getDatabase().request().query(`
        SELECT TOP (50) payment.PaymentTransactionId, payment.PaymentCode, payment.Amount,
               payment.Method, payment.CreatedAt, patient.FullName AS PatientName,
               visit.VisitCode, cashier.Username AS CashierUsername
        FROM dbo.PaymentTransactions payment
        JOIN dbo.Patients patient ON patient.PatientId = payment.PatientId
        LEFT JOIN dbo.Visits visit ON visit.VisitId = payment.VisitId
        JOIN dbo.Users cashier ON cashier.UserId = payment.CreatedBy
        WHERE payment.IsDeleted = 0
        ORDER BY payment.CreatedAt DESC
      `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/cashier/shifts/open",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST"),
  async (req, res, next) => {
    try {
      const { openingFloat } = z.object({
        openingFloat: z.number().finite().min(0).max(100000000000)
          .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8)
      }).strict().parse(req.body);
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const activeShift = await new sql.Request(transaction)
          .input("cashierId", sql.UniqueIdentifier, actorId(req))
          .query(`
            SELECT CashShiftId FROM dbo.CashShifts WITH (UPDLOCK, HOLDLOCK)
            WHERE CashierId = @cashierId
              AND Status IN (N'OPEN', N'PENDING_CLOSE') AND IsDeleted = 0
          `);
        if (activeShift.recordset.length > 0) {
          await transaction.rollback();
          res.status(409).json({ error: "An open or unreconciled cashier shift already exists" });
          return;
        }
        const shiftCode = `CA#${new Date().toISOString().slice(0, 10).replace(/-/g, "")}#${randomUUID().slice(0, 8)}`;
        const result = await new sql.Request(transaction)
          .input("shiftCode", sql.NVarChar(40), shiftCode)
          .input("cashierId", sql.UniqueIdentifier, actorId(req))
          .input("openingFloat", sql.Decimal(19, 2), openingFloat)
          .query(`
            INSERT INTO dbo.CashShifts (ShiftCode, CashierId, OpeningFloat, CreatedBy)
            OUTPUT INSERTED.CashShiftId, INSERTED.ShiftCode, INSERTED.Status, INSERTED.OpeningFloat, INSERTED.OpenedAt
            VALUES (@shiftCode, @cashierId, @openingFloat, @cashierId)
          `);
        await audit(new sql.Request(transaction), req, "CASH_SHIFT_OPENED", "CashShift", result.recordset[0].CashShiftId, { openingFloat });
        await transaction.commit();
        res.status(201).json(result.recordset[0]);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/cashier/shifts/close",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST"),
  async (req, res, next) => {
    try {
      const input = z.object({
        cashShiftId: z.string().uuid(),
        countedCash: z.number().finite().min(0).max(100000000000)
          .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8),
        reason: z.string().trim().min(5).max(500)
      }).strict().parse(req.body);
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const shiftResult = await new sql.Request(transaction)
          .input("cashShiftId", sql.UniqueIdentifier, input.cashShiftId)
          .input("cashierId", sql.UniqueIdentifier, actorId(req))
          .query(`
            SELECT CashShiftId, Status, OpeningFloat
            FROM dbo.CashShifts WITH (UPDLOCK, ROWLOCK)
            WHERE CashShiftId = @cashShiftId AND CashierId = @cashierId AND IsDeleted = 0
          `);
        const shift = shiftResult.recordset[0] as
          | { CashShiftId: string; Status: string; OpeningFloat: number }
          | undefined;
        if (!shift || shift.Status !== "OPEN") {
          await transaction.rollback();
          res.status(409).json({ error: "Only your open shift can be closed" });
          return;
        }
        const cashResult = await new sql.Request(transaction)
          .input("cashShiftId", sql.UniqueIdentifier, input.cashShiftId)
          .query(`
            SELECT COALESCE(SUM(Amount), 0) AS CashCollected
            FROM dbo.PaymentTransactions
            WHERE CashShiftId = @cashShiftId AND Method = N'CASH' AND IsDeleted = 0
          `);
        const closeSummary = calculateCashClose(
          Number(shift.OpeningFloat),
          Number(cashResult.recordset[0].CashCollected),
          input.countedCash
        );
        const { expectedCash, difference, status } = closeSummary;
        const result = await new sql.Request(transaction)
          .input("cashShiftId", sql.UniqueIdentifier, input.cashShiftId)
          .input("expectedCash", sql.Decimal(19, 2), expectedCash)
          .input("countedCash", sql.Decimal(19, 2), closeSummary.countedCash)
          .input("difference", sql.Decimal(19, 2), difference)
          .input("status", sql.NVarChar(20), status)
          .input("reason", sql.NVarChar(500), input.reason)
          .query(`
            UPDATE dbo.CashShifts
            SET ExpectedCash = @expectedCash, CountedCash = @countedCash,
                DifferenceAmount = @difference, CloseReason = @reason,
                Status = @status, ClosedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
            OUTPUT INSERTED.CashShiftId, INSERTED.Status, INSERTED.ExpectedCash,
                   INSERTED.CountedCash, INSERTED.DifferenceAmount, INSERTED.ClosedAt
            WHERE CashShiftId = @cashShiftId
          `);
        await audit(new sql.Request(transaction), req, "CASH_SHIFT_CLOSED", "CashShift", input.cashShiftId, {
          expectedCash,
          countedCash: closeSummary.countedCash,
          difference,
          status,
          reason: input.reason
        });
        await transaction.commit();
        res.json(result.recordset[0]);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/cashier/shifts/:cashShiftId/reconcile",
  authenticate,
  allowRoles("ADMIN", "CHIEF_ACCOUNTANT"),
  async (req, res, next) => {
    try {
      const cashShiftId = z.string().uuid().parse(req.params.cashShiftId);
      const reason = z.object({ reason: z.string().trim().min(5).max(500) }).parse(req.body).reason;
      const result = await getDatabase().request()
        .input("cashShiftId", sql.UniqueIdentifier, cashShiftId)
        .input("actorId", sql.UniqueIdentifier, actorId(req))
        .input("reason", sql.NVarChar(500), reason)
        .query(`
          UPDATE shift
          SET Status = N'RECONCILED', ReconciledBy = @actorId,
              ReconciledAt = SYSUTCDATETIME(), ReconciliationReason = @reason,
              UpdatedAt = SYSUTCDATETIME()
          OUTPUT INSERTED.CashShiftId, INSERTED.Status, INSERTED.ReconciledAt
          FROM dbo.CashShifts shift
          WHERE shift.CashShiftId = @cashShiftId AND shift.Status = N'PENDING_CLOSE'
            AND shift.CashierId <> @actorId AND shift.IsDeleted = 0;
        `);
      if (result.recordset.length !== 1) {
        res.status(409).json({ error: "Shift is not pending reconciliation or violates separation of duties" });
        return;
      }
      await audit(getDatabase().request(), req, "CASH_SHIFT_RECONCILED", "CashShift", cashShiftId, { reason });
      res.json(result.recordset[0]);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/visits/:visitId/payments",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST"),
  async (req, res, next) => {
    try {
      const visitId = z.string().uuid().parse(req.params.visitId);
      const input = z.object({
        amount: z.number().finite().positive().max(100000000000)
          .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8),
        method: z.enum(["CASH", "BANK_TRANSFER", "CARD"]),
        cashShiftId: z.string().uuid().optional(),
        idempotencyKey: z.string().uuid()
      }).strict().parse(req.body);
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const duplicate = await new sql.Request(transaction)
          .input("idempotencyKey", sql.NVarChar(100), input.idempotencyKey)
          .query(`
            SELECT PaymentTransactionId, PaymentCode, VisitId, Amount, Method
            FROM dbo.PaymentTransactions WITH (UPDLOCK, HOLDLOCK)
            WHERE IdempotencyKey = @idempotencyKey AND IsDeleted = 0
          `);
        if (duplicate.recordset.length > 0) {
          const payment = duplicate.recordset[0] as {
            PaymentTransactionId: string;
            PaymentCode: string;
            VisitId: string;
            Amount: number;
            Method: string;
          };
          const sameRequest =
            payment.VisitId.toLowerCase() === visitId.toLowerCase() &&
            Number(payment.Amount) === input.amount &&
            payment.Method === input.method;
          await transaction.rollback();
          if (!sameRequest) {
            res.status(409).json({ error: "Idempotency key was already used for a different payment" });
            return;
          }
          res.json(payment);
          return;
        }

        const visitResult = await new sql.Request(transaction)
          .input("visitId", sql.UniqueIdentifier, visitId)
          .query(`
            SELECT PatientId, Status, TotalAmount
            FROM dbo.Visits WITH (UPDLOCK, ROWLOCK)
            WHERE VisitId = @visitId AND IsDeleted = 0
          `);
        const visit = visitResult.recordset[0] as
          | { PatientId: string; Status: number; TotalAmount: number }
          | undefined;
        if (!visit || visit.Status !== 3 || Number(visit.TotalAmount) <= 0) {
          await transaction.rollback();
          res.status(409).json({ error: "Visit is not awaiting payment" });
          return;
        }
        const priorPayments = await new sql.Request(transaction)
          .input("visitId", sql.UniqueIdentifier, visitId)
          .query(`
            SELECT COALESCE(SUM(Amount), 0) AS Paid
            FROM dbo.PaymentTransactions
            WHERE VisitId = @visitId AND IsDeleted = 0
          `);
        const outstanding = Number(visit.TotalAmount) - Number(priorPayments.recordset[0].Paid);
        if (input.amount > outstanding) {
          await transaction.rollback();
          res.status(409).json({ error: "Payment exceeds the outstanding visit balance" });
          return;
        }

        let cashShiftId: string | null = null;
        if (input.method === "CASH") {
          if (!input.cashShiftId) {
            await transaction.rollback();
            res.status(409).json({ error: "Cash payments require an open cashier shift" });
            return;
          }
          const shift = await new sql.Request(transaction)
            .input("cashShiftId", sql.UniqueIdentifier, input.cashShiftId)
            .input("cashierId", sql.UniqueIdentifier, actorId(req))
            .query(`
              SELECT CashShiftId FROM dbo.CashShifts WITH (UPDLOCK, ROWLOCK)
              WHERE CashShiftId = @cashShiftId AND CashierId = @cashierId
                AND Status = N'OPEN' AND IsDeleted = 0
            `);
          if (shift.recordset.length !== 1) {
            await transaction.rollback();
            res.status(409).json({ error: "Cashier shift is not open or does not belong to this user" });
            return;
          }
          cashShiftId = input.cashShiftId;
        }

        const paymentCode = `TT#${new Date().toISOString().slice(0, 10).replace(/-/g, "")}#${randomUUID().slice(0, 8)}`;
        const result = await new sql.Request(transaction)
          .input("paymentCode", sql.NVarChar(40), paymentCode)
          .input("patientId", sql.UniqueIdentifier, visit.PatientId)
          .input("visitId", sql.UniqueIdentifier, visitId)
          .input("cashShiftId", sql.UniqueIdentifier, cashShiftId)
          .input("amount", sql.Decimal(19, 2), input.amount)
          .input("method", sql.NVarChar(20), input.method)
          .input("idempotencyKey", sql.NVarChar(100), input.idempotencyKey)
          .input("createdBy", sql.UniqueIdentifier, actorId(req))
          .query(`
            INSERT INTO dbo.PaymentTransactions
              (PaymentCode, PatientId, VisitId, CashShiftId, Amount, Method, IdempotencyKey, CreatedBy)
            OUTPUT INSERTED.PaymentTransactionId, INSERTED.PaymentCode, INSERTED.Amount,
                   INSERTED.Method, INSERTED.CreatedAt
            VALUES
              (@paymentCode, @patientId, @visitId, @cashShiftId, @amount, @method, @idempotencyKey, @createdBy)
          `);
        const paidTotal = Number(priorPayments.recordset[0].Paid) + input.amount;
        if (paidTotal >= Number(visit.TotalAmount)) {
          const completed = await new sql.Request(transaction)
            .input("visitId", sql.UniqueIdentifier, visitId)
            .query(`
              UPDATE dbo.Visits SET Status = 4, UpdatedAt = SYSUTCDATETIME()
              WHERE VisitId = @visitId AND Status = 3 AND IsDeleted = 0;
              UPDATE dbo.VisitServiceItems SET Status = N'COMPLETED', UpdatedAt = SYSUTCDATETIME()
              WHERE VisitId = @visitId AND Status IN (N'PENDING', N'RESERVED', N'IN_PROGRESS') AND IsDeleted = 0;
            `);
          if (completed.rowsAffected[0] !== 1) {
            throw new Error("Visit state changed while completing payment");
          }
          await audit(
            new sql.Request(transaction),
            req,
            "VISIT_STATUS_CHANGED",
            "Visit",
            visitId,
            { from: 3, to: 4, reason: "PAYMENT_COMPLETED" }
          );
        }
        await audit(new sql.Request(transaction), req, "VISIT_PAYMENT_RECORDED", "PaymentTransaction", result.recordset[0].PaymentTransactionId, {
          visitId,
          amount: input.amount,
          method: input.method,
          idempotencyKey: input.idempotencyKey
        });
        await transaction.commit();
        res.status(201).json(result.recordset[0]);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
