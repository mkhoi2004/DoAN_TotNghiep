import { randomUUID } from "node:crypto";
import { Router } from "express";
import sql from "mssql/msnodesqlv8";
import { z } from "zod";
import { getDatabase } from "../db";
import { allocateFifo } from "../domain/invariants";
import { HttpError } from "../middleware/errors";
import { allowRoles, authenticate, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

function actorId(req: AuthenticatedRequest): string {
  if (!req.auth) throw new Error("Authenticated user is missing");
  return req.auth.userId;
}

async function audit(
  request: sql.Request,
  req: AuthenticatedRequest,
  action: string,
  reservationId: string,
  detail: Record<string, unknown> = {}
): Promise<void> {
  await request
    .input("userId", sql.UniqueIdentifier, actorId(req))
    .input("action", sql.NVarChar(100), action)
    .input("reservationId", sql.NVarChar(100), reservationId)
    .input("detail", sql.NVarChar(sql.MAX), JSON.stringify(detail))
    .query(`
      INSERT INTO dbo.AuditLogs (UserId, Action, EntityName, EntityId, DetailJson, CreatedBy)
      VALUES (@userId, @action, N'InventoryReservation', @reservationId, @detail, @userId)
    `);
}

const reserveSchema = z.object({
  visitId: z.string().uuid(),
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().positive().max(1000000),
  expiresInMinutes: z.number().int().positive().max(1440).default(240)
}).strict();

router.get(
  "/inventory/reservation-visits",
  authenticate,
  allowRoles("ADMIN", "DOCTOR", "ASSISTANT", "INVENTORY_MANAGER"),
  async (req, res, next) => {
    try {
      const result = await getDatabase().request()
        .input("doctorId", sql.UniqueIdentifier, req.auth?.role === "DOCTOR" ? actorId(req) : null)
        .query(`
          SELECT TOP (200) VisitId, VisitCode
          FROM dbo.Visits
          WHERE Status IN (1, 2) AND IsDeleted = 0
            AND (@doctorId IS NULL OR DoctorId = @doctorId)
          ORDER BY CreatedAt DESC
        `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/inventory/reservations",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT", "ACCOUNTANT", "CHIEF_ACCOUNTANT", "INVENTORY_MANAGER"),
  async (_req, res, next) => {
    try {
      const result = await getDatabase().request().query(`
        SELECT TOP (300) reservation.ReservationId, reservation.Status,
               reservation.ExpiresAt, visit.VisitCode, product.ProductName,
               warehouse.WarehouseName, lot.LotNumber, line.Quantity, product.Unit,
               line.UnitCost, line.Status AS LineStatus
        FROM dbo.InventoryReservations reservation
        JOIN dbo.Visits visit ON visit.VisitId = reservation.VisitId
        JOIN dbo.InventoryReservationLines line ON line.ReservationId = reservation.ReservationId
        JOIN dbo.InventoryLots lot ON lot.LotId = line.LotId
        JOIN dbo.Products product ON product.ProductId = lot.ProductId
        JOIN dbo.Warehouses warehouse ON warehouse.WarehouseId = lot.WarehouseId
        WHERE reservation.IsDeleted = 0 AND line.IsDeleted = 0
        ORDER BY reservation.CreatedAt DESC, lot.ReceivedAt
      `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/inventory/reservations",
  authenticate,
  allowRoles("ADMIN", "DOCTOR", "ASSISTANT", "INVENTORY_MANAGER"),
  async (req, res, next) => {
    try {
      const input = reserveSchema.parse(req.body);
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const visit = await new sql.Request(transaction)
          .input("visitId", sql.UniqueIdentifier, input.visitId)
          .query(`
            SELECT VisitId, DoctorId FROM dbo.Visits WITH (UPDLOCK, ROWLOCK)
            WHERE VisitId = @visitId AND Status IN (1, 2) AND IsDeleted = 0
          `);
        if (visit.recordset.length !== 1) {
          await transaction.rollback();
          res.status(409).json({ error: "Stock can only be reserved for an active clinical visit" });
          return;
        }
        if (
          req.auth?.role === "DOCTOR" &&
          String(visit.recordset[0].DoctorId).toLowerCase() !== actorId(req).toLowerCase()
        ) {
          throw new HttpError(403, "This visit is assigned to another doctor");
        }
        const candidates = await new sql.Request(transaction)
          .input("productId", sql.UniqueIdentifier, input.productId)
          .input("warehouseId", sql.UniqueIdentifier, input.warehouseId)
          .query(`
            SELECT l.LotId, l.ExpiresAt, l.ReceivedAt, l.UnitCost,
                   l.QuantityOnHand - l.QuantityReserved - l.QuantityBlocked AS QuantityAvailable
            FROM dbo.InventoryLots l WITH (UPDLOCK, ROWLOCK)
            JOIN dbo.Products p ON p.ProductId = l.ProductId
            JOIN dbo.Warehouses w ON w.WarehouseId = l.WarehouseId
            WHERE l.ProductId = @productId AND l.WarehouseId = @warehouseId
              AND l.IsDeleted = 0 AND p.IsActive = 1 AND p.IsDeleted = 0 AND w.IsDeleted = 0
              AND l.ExpiresAt > CONVERT(date, SYSUTCDATETIME())
              AND l.QuantityOnHand - l.QuantityReserved - l.QuantityBlocked > 0
            ORDER BY l.ExpiresAt, l.ReceivedAt, l.LotId
          `);
        let allocations;
        try {
          allocations = allocateFifo(
            candidates.recordset.map((lot: {
              LotId: string;
              ExpiresAt: Date;
              ReceivedAt: Date;
              UnitCost: number;
              QuantityAvailable: number;
            }) => ({
              lotId: lot.LotId,
              expiresAt: new Date(lot.ExpiresAt),
              receivedAt: new Date(lot.ReceivedAt),
              unitCost: Number(lot.UnitCost),
              quantityAvailable: Number(lot.QuantityAvailable)
            })),
            input.quantity
          );
        } catch (error) {
          if (error instanceof Error && error.message === "Insufficient unexpired stock") {
            throw new HttpError(409, "Insufficient unexpired stock for this reservation");
          }
          throw error;
        }
        const created = await new sql.Request(transaction)
          .input("visitId", sql.UniqueIdentifier, input.visitId)
          .input("expiresAt", sql.DateTime2, new Date(Date.now() + input.expiresInMinutes * 60_000))
          .input("createdBy", sql.UniqueIdentifier, actorId(req))
          .query(`
            INSERT INTO dbo.InventoryReservations (VisitId, ExpiresAt, CreatedBy)
            OUTPUT INSERTED.ReservationId, INSERTED.Status, INSERTED.ExpiresAt
            VALUES (@visitId, @expiresAt, @createdBy)
          `);
        const reservation = created.recordset[0] as { ReservationId: string };
        const referenceCode = `RS#${randomUUID().slice(0, 8)}`;
        for (const allocation of allocations) {
          const changed = await new sql.Request(transaction)
            .input("lotId", sql.UniqueIdentifier, allocation.lotId)
            .input("quantity", sql.Decimal(18, 3), allocation.quantity)
            .query(`
              UPDATE dbo.InventoryLots
              SET QuantityReserved = QuantityReserved + @quantity, UpdatedAt = SYSUTCDATETIME()
              WHERE LotId = @lotId AND IsDeleted = 0
                AND ExpiresAt > CONVERT(date, SYSUTCDATETIME())
                AND QuantityOnHand - QuantityReserved - QuantityBlocked >= @quantity;
              SELECT @@ROWCOUNT AS AffectedRows;
            `);
          if (Number(changed.recordset[0].AffectedRows) !== 1) {
            throw new HttpError(409, "Available stock changed during reservation; retry the request");
          }
          await new sql.Request(transaction)
            .input("reservationId", sql.UniqueIdentifier, reservation.ReservationId)
            .input("lotId", sql.UniqueIdentifier, allocation.lotId)
            .input("visitId", sql.UniqueIdentifier, input.visitId)
            .input("quantity", sql.Decimal(18, 3), allocation.quantity)
            .input("unitCost", sql.Decimal(19, 4), allocation.unitCost)
            .input("referenceCode", sql.NVarChar(50), referenceCode)
            .input("createdBy", sql.UniqueIdentifier, actorId(req))
            .query(`
              INSERT INTO dbo.InventoryReservationLines
                (ReservationId, LotId, Quantity, UnitCost, CreatedBy)
              VALUES (@reservationId, @lotId, @quantity, @unitCost, @createdBy);
              INSERT INTO dbo.InventoryTransactions
                (LotId, VisitId, TransactionType, Quantity, UnitCost, ReferenceCode, CreatedBy)
              VALUES (@lotId, @visitId, N'RESERVE', @quantity, @unitCost, @referenceCode, @createdBy);
            `)
            ;
        }
        await audit(new sql.Request(transaction), req, "INVENTORY_RESERVED", reservation.ReservationId, {
          visitId: input.visitId,
          productId: input.productId,
          quantity: input.quantity,
          allocations
        });
        await transaction.commit();
        res.status(201).json({ ...reservation, quantity: input.quantity, allocations });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

const reservationIdSchema = z.string().uuid();

router.post(
  "/inventory/reservations/:reservationId/consume",
  authenticate,
  allowRoles("ADMIN", "DOCTOR", "ASSISTANT", "INVENTORY_MANAGER"),
  async (req, res, next) => {
    try {
      const reservationId = reservationIdSchema.parse(req.params.reservationId);
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const reservationResult = await new sql.Request(transaction)
          .input("reservationId", sql.UniqueIdentifier, reservationId)
          .query(`
            SELECT reservation.ReservationId, reservation.VisitId, reservation.Status,
                   reservation.ExpiresAt, visit.DoctorId,
                   CASE WHEN reservation.ExpiresAt <= SYSUTCDATETIME() THEN 1 ELSE 0 END AS IsExpired
            FROM dbo.InventoryReservations reservation WITH (UPDLOCK, ROWLOCK)
            JOIN dbo.Visits visit ON visit.VisitId = reservation.VisitId
            WHERE reservation.ReservationId = @reservationId AND reservation.IsDeleted = 0
          `);
        const reservation = reservationResult.recordset[0] as
          | { ReservationId: string; VisitId: string; Status: string; IsExpired: number; DoctorId: string }
          | undefined;
        if (!reservation || reservation.Status !== "RESERVED") {
          await transaction.rollback();
          res.status(409).json({ error: "Only an active reservation can be consumed" });
          return;
        }
        if (
          req.auth?.role === "DOCTOR" &&
          reservation.DoctorId.toLowerCase() !== actorId(req).toLowerCase()
        ) {
          throw new HttpError(403, "This visit is assigned to another doctor");
        }
        if (Number(reservation.IsExpired) === 1) {
          const expiryLines = await new sql.Request(transaction)
            .input("reservationId", sql.UniqueIdentifier, reservationId)
            .query(`
              SELECT ReservationLineId, LotId, Quantity, UnitCost
              FROM dbo.InventoryReservationLines WITH (UPDLOCK, ROWLOCK)
              WHERE ReservationId = @reservationId AND Status = N'RESERVED' AND IsDeleted = 0
            `);
          for (const line of expiryLines.recordset as { ReservationLineId: string; LotId: string; Quantity: number; UnitCost: number }[]) {
            await new sql.Request(transaction)
              .input("lotId", sql.UniqueIdentifier, line.LotId)
              .input("quantity", sql.Decimal(18, 3), line.Quantity)
              .query(`
                UPDATE dbo.InventoryLots
                SET QuantityReserved = QuantityReserved - @quantity, UpdatedAt = SYSUTCDATETIME()
                WHERE LotId = @lotId AND QuantityReserved >= @quantity AND IsDeleted = 0
              `);
            await new sql.Request(transaction)
              .input("lineId", sql.UniqueIdentifier, line.ReservationLineId)
              .query(`UPDATE dbo.InventoryReservationLines SET Status = N'RELEASED', UpdatedAt = SYSUTCDATETIME() WHERE ReservationLineId = @lineId`);
            await new sql.Request(transaction)
              .input("lotId", sql.UniqueIdentifier, line.LotId)
              .input("visitId", sql.UniqueIdentifier, reservation.VisitId)
              .input("quantity", sql.Decimal(18, 3), line.Quantity)
              .input("unitCost", sql.Decimal(19, 4), line.UnitCost)
              .input("referenceCode", sql.NVarChar(50), `EX#${randomUUID().slice(0, 8)}`)
              .input("createdBy", sql.UniqueIdentifier, actorId(req))
              .query(`
                INSERT INTO dbo.InventoryTransactions
                  (LotId, VisitId, TransactionType, Quantity, UnitCost, ReferenceCode, CreatedBy)
                VALUES (@lotId, @visitId, N'RELEASE', @quantity, @unitCost, @referenceCode, @createdBy)
              `);
          }
          await new sql.Request(transaction)
            .input("reservationId", sql.UniqueIdentifier, reservationId)
            .query(`UPDATE dbo.InventoryReservations SET Status = N'EXPIRED', UpdatedAt = SYSUTCDATETIME() WHERE ReservationId = @reservationId`);
          await audit(new sql.Request(transaction), req, "INVENTORY_RESERVATION_EXPIRED", reservationId);
          await transaction.commit();
          res.status(409).json({ error: "Reservation expired and its stock was released" });
          return;
        }
        const lines = await new sql.Request(transaction)
          .input("reservationId", sql.UniqueIdentifier, reservationId)
          .query(`
            SELECT ReservationLineId, LotId, Quantity, UnitCost
            FROM dbo.InventoryReservationLines WITH (UPDLOCK, ROWLOCK)
            WHERE ReservationId = @reservationId AND Status = N'RESERVED' AND IsDeleted = 0
          `);
        if (lines.recordset.length === 0) throw new HttpError(409, "Reservation contains no available lines");
        for (const line of lines.recordset as {
          ReservationLineId: string;
          LotId: string;
          Quantity: number;
          UnitCost: number;
        }[]) {
          const updated = await new sql.Request(transaction)
            .input("lotId", sql.UniqueIdentifier, line.LotId)
            .input("quantity", sql.Decimal(18, 3), line.Quantity)
            .query(`
              UPDATE dbo.InventoryLots
              SET QuantityOnHand = QuantityOnHand - @quantity,
                  QuantityReserved = QuantityReserved - @quantity,
                  UpdatedAt = SYSUTCDATETIME()
              WHERE LotId = @lotId AND IsDeleted = 0
                AND QuantityOnHand >= @quantity AND QuantityReserved >= @quantity;
              SELECT @@ROWCOUNT AS AffectedRows;
            `);
          if (Number(updated.recordset[0].AffectedRows) !== 1) {
            throw new HttpError(409, "Reserved stock is no longer consistent; manual reconciliation is required");
          }
          await new sql.Request(transaction)
            .input("lineId", sql.UniqueIdentifier, line.ReservationLineId)
            .input("lotId", sql.UniqueIdentifier, line.LotId)
            .input("visitId", sql.UniqueIdentifier, reservation.VisitId)
            .input("quantity", sql.Decimal(18, 3), line.Quantity)
            .input("unitCost", sql.Decimal(19, 4), line.UnitCost)
            .input("referenceCode", sql.NVarChar(50), `CS#${randomUUID().slice(0, 8)}`)
            .input("createdBy", sql.UniqueIdentifier, actorId(req))
            .query(`
              UPDATE dbo.InventoryReservationLines
              SET Status = N'CONSUMED', UpdatedAt = SYSUTCDATETIME()
              WHERE ReservationLineId = @lineId;
              INSERT INTO dbo.InventoryTransactions
                (LotId, VisitId, TransactionType, Quantity, UnitCost, ReferenceCode, CreatedBy)
              VALUES (@lotId, @visitId, N'CONSUME', @quantity, @unitCost, @referenceCode, @createdBy)
            `);
        }
        await new sql.Request(transaction)
          .input("reservationId", sql.UniqueIdentifier, reservationId)
          .query(`UPDATE dbo.InventoryReservations SET Status = N'CONSUMED', UpdatedAt = SYSUTCDATETIME() WHERE ReservationId = @reservationId`);
        await audit(new sql.Request(transaction), req, "INVENTORY_CONSUMED", reservationId, { visitId: reservation.VisitId });
        await transaction.commit();
        res.json({ reservationId, status: "CONSUMED" });
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
  "/inventory/reservations/:reservationId/release",
  authenticate,
  allowRoles("ADMIN", "DOCTOR", "ASSISTANT", "INVENTORY_MANAGER"),
  async (req, res, next) => {
    try {
      const reservationId = reservationIdSchema.parse(req.params.reservationId);
      const reason = z.object({ reason: z.string().trim().min(5).max(500) }).parse(req.body).reason;
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const reservationResult = await new sql.Request(transaction)
          .input("reservationId", sql.UniqueIdentifier, reservationId)
          .query(`
            SELECT reservation.ReservationId, reservation.VisitId, reservation.Status, visit.DoctorId
            FROM dbo.InventoryReservations reservation WITH (UPDLOCK, ROWLOCK)
            JOIN dbo.Visits visit ON visit.VisitId = reservation.VisitId
            WHERE reservation.ReservationId = @reservationId AND reservation.IsDeleted = 0
          `);
        const reservation = reservationResult.recordset[0] as
          | { ReservationId: string; VisitId: string; Status: string; DoctorId: string }
          | undefined;
        if (!reservation || reservation.Status !== "RESERVED") {
          await transaction.rollback();
          res.status(409).json({ error: "Only an active reservation can be released" });
          return;
        }
        if (
          req.auth?.role === "DOCTOR" &&
          reservation.DoctorId.toLowerCase() !== actorId(req).toLowerCase()
        ) {
          throw new HttpError(403, "This visit is assigned to another doctor");
        }
        const lines = await new sql.Request(transaction)
          .input("reservationId", sql.UniqueIdentifier, reservationId)
          .query(`
            SELECT ReservationLineId, LotId, Quantity, UnitCost
            FROM dbo.InventoryReservationLines WITH (UPDLOCK, ROWLOCK)
            WHERE ReservationId = @reservationId AND Status = N'RESERVED' AND IsDeleted = 0
          `);
        for (const line of lines.recordset as {
          ReservationLineId: string;
          LotId: string;
          Quantity: number;
          UnitCost: number;
        }[]) {
          const updated = await new sql.Request(transaction)
            .input("lotId", sql.UniqueIdentifier, line.LotId)
            .input("quantity", sql.Decimal(18, 3), line.Quantity)
            .query(`
              UPDATE dbo.InventoryLots
              SET QuantityReserved = QuantityReserved - @quantity, UpdatedAt = SYSUTCDATETIME()
              WHERE LotId = @lotId AND IsDeleted = 0 AND QuantityReserved >= @quantity;
              SELECT @@ROWCOUNT AS AffectedRows;
            `);
          if (Number(updated.recordset[0].AffectedRows) !== 1) {
            throw new HttpError(409, "Reserved stock is no longer consistent; manual reconciliation is required");
          }
          await new sql.Request(transaction)
            .input("lineId", sql.UniqueIdentifier, line.ReservationLineId)
            .input("lotId", sql.UniqueIdentifier, line.LotId)
            .input("visitId", sql.UniqueIdentifier, reservation.VisitId)
            .input("quantity", sql.Decimal(18, 3), line.Quantity)
            .input("unitCost", sql.Decimal(19, 4), line.UnitCost)
            .input("referenceCode", sql.NVarChar(50), `RL#${randomUUID().slice(0, 8)}`)
            .input("createdBy", sql.UniqueIdentifier, actorId(req))
            .query(`
              UPDATE dbo.InventoryReservationLines
              SET Status = N'RELEASED', UpdatedAt = SYSUTCDATETIME()
              WHERE ReservationLineId = @lineId;
              INSERT INTO dbo.InventoryTransactions
                (LotId, VisitId, TransactionType, Quantity, UnitCost, ReferenceCode, CreatedBy)
              VALUES (@lotId, @visitId, N'RELEASE', @quantity, @unitCost, @referenceCode, @createdBy)
            `);
        }
        await new sql.Request(transaction)
          .input("reservationId", sql.UniqueIdentifier, reservationId)
          .query(`UPDATE dbo.InventoryReservations SET Status = N'RELEASED', UpdatedAt = SYSUTCDATETIME() WHERE ReservationId = @reservationId`);
        await audit(new sql.Request(transaction), req, "INVENTORY_RELEASED", reservationId, { visitId: reservation.VisitId, reason });
        await transaction.commit();
        res.json({ reservationId, status: "RELEASED" });
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
