import { randomUUID } from "node:crypto";
import { Router } from "express";
import sql from "mssql/msnodesqlv8";
import { z } from "zod";
import { getDatabase } from "../db";
import { allocateFifo, assertBalancedJournal, canTransitionVisit } from "../domain/invariants";
import {
  allowRoles,
  authenticate,
  type AuthenticatedRequest,
  type Role
} from "../middleware/auth";
import {
  protectNationalId,
  protectSensitiveText,
  revealSensitiveText
} from "../security/pii";

const router = Router();

function userId(req: AuthenticatedRequest): string {
  if (!req.auth) {
    throw new Error("Authenticated user is missing");
  }
  return req.auth.userId;
}

async function writeAudit(
  request: sql.Request,
  actorId: string,
  action: string,
  entity: string,
  entityId: string | null,
  detail: Record<string, unknown> = {}
): Promise<void> {
  await request
    .input("auditUserId", sql.UniqueIdentifier, actorId)
    .input("auditAction", sql.NVarChar(100), action)
    .input("auditEntity", sql.NVarChar(100), entity)
    .input("auditEntityId", sql.NVarChar(100), entityId)
    .input("auditDetail", sql.NVarChar(sql.MAX), JSON.stringify(detail))
    .query(`
      INSERT INTO dbo.AuditLogs (UserId, Action, EntityName, EntityId, DetailJson, CreatedBy)
      VALUES (@auditUserId, @auditAction, @auditEntity, @auditEntityId, @auditDetail, @auditUserId)
    `);
}

const patientSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(["Nam", "Nữ", "Khác"]),
  phone: z.string().regex(/^0\d{9}$/),
  nationalId: z.string().trim().min(8).max(20),
  address: z.string().trim().min(3).max(500),
  allergyNotes: z.string().max(2000).optional(),
  medicalHistory: z.string().max(2000).optional()
});

router.get(
  "/patients",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT"),
  async (req, res, next) => {
    try {
      const search = z.string().trim().max(100).optional().parse(req.query.search);
      const result = await getDatabase()
        .request()
        .input("search", sql.NVarChar(100), search ? `%${search}%` : null)
        .query(`
          SELECT TOP (100)
            PatientId, PatientCode, FullName, DateOfBirth, Gender, Phone,
            Address, AllergyNotes, MedicalHistory, CreatedAt
          FROM dbo.Patients
          WHERE IsDeleted = 0
            AND (@search IS NULL OR PatientCode LIKE @search OR FullName LIKE @search OR Phone LIKE @search)
          ORDER BY CreatedAt DESC
        `);
      await writeAudit(
        getDatabase().request(),
        userId(req),
        "PATIENT_LIST_READ",
        "Patient",
        null,
        { searchProvided: Boolean(search) }
      );
      const patients = result.recordset.map((row: {
        PatientId: string;
        AllergyNotes: string | null;
        MedicalHistory: string | null;
      }) => ({
        ...row,
        AllergyNotes: revealSensitiveText(row.AllergyNotes),
        MedicalHistory: revealSensitiveText(row.MedicalHistory)
      }));
      res.json(patients);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/patients",
  authenticate,
  allowRoles("RECEPTIONIST"),
  async (req, res, next) => {
    try {
      const input = patientSchema.parse(req.body);
      if (input.dateOfBirth > new Date()) {
        res.status(400).json({ error: "Date of birth cannot be in the future" });
        return;
      }
      const pii = protectNationalId(input.nationalId);
      const pool = getDatabase();
      const transaction = new sql.Transaction(pool);
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const duplicateResult = await new sql.Request(transaction)
          .input("phone", sql.NVarChar(20), input.phone)
          .input("nationalIdHash", sql.Char(64), pii.lookupHash)
          .query(`
            SELECT TOP (5) PatientId, PatientCode, FullName, DateOfBirth
            FROM dbo.Patients WITH (UPDLOCK, HOLDLOCK)
            WHERE IsDeleted = 0 AND (Phone = @phone OR NationalIdHash = @nationalIdHash)
            ORDER BY CreatedAt DESC
          `);
        if (duplicateResult.recordset.length > 0) {
          await transaction.rollback();
          await writeAudit(
            getDatabase().request(),
            userId(req),
            "PATIENT_DUPLICATE_MATCH_FOUND",
            "Patient",
            null,
            { matchedPatientIds: duplicateResult.recordset.map((row: { PatientId: string }) => row.PatientId) }
          );
          res.status(409).json({
            error: "A patient with this phone number or national ID already exists",
            code: "PATIENT_DUPLICATE_MATCH",
            matches: duplicateResult.recordset
          });
          return;
        }
        const sequence = await new sql.Request(transaction).query(
          "SELECT NEXT VALUE FOR dbo.PatientCodeSequence AS PatientNumber"
        );
        const patientCode = `BN#${String(sequence.recordset[0].PatientNumber).padStart(6, "0")}`;
        const request = new sql.Request(transaction)
          .input("patientCode", sql.NVarChar(20), patientCode)
          .input("fullName", sql.NVarChar(200), input.fullName)
          .input("dateOfBirth", sql.Date, input.dateOfBirth)
          .input("gender", sql.NVarChar(10), input.gender)
          .input("phone", sql.NVarChar(20), input.phone)
          .input("nationalIdCiphertext", sql.VarChar(512), pii.ciphertext)
          .input("nationalIdHash", sql.Char(64), pii.lookupHash)
          .input("address", sql.NVarChar(500), input.address)
          .input("allergyNotes", sql.NVarChar(sql.MAX), protectSensitiveText(input.allergyNotes))
          .input("medicalHistory", sql.NVarChar(sql.MAX), protectSensitiveText(input.medicalHistory))
          .input("createdBy", sql.UniqueIdentifier, userId(req));
        const result = await request.query(`
          INSERT INTO dbo.Patients
            (PatientCode, FullName, DateOfBirth, Gender, Phone, NationalIdCiphertext,
             NationalIdHash, Address, AllergyNotes, MedicalHistory, CreatedBy)
          OUTPUT INSERTED.PatientId, INSERTED.PatientCode, INSERTED.FullName
          VALUES
            (@patientCode, @fullName, @dateOfBirth, @gender, @phone, @nationalIdCiphertext,
             @nationalIdHash, @address, @allergyNotes, @medicalHistory, @createdBy)
        `);
        const patient = result.recordset[0] as {
          PatientId: string;
          PatientCode: string;
          FullName: string;
        };
        await writeAudit(
          new sql.Request(transaction),
          userId(req),
          "PATIENT_CREATED",
          "Patient",
          patient.PatientId
        );
        await transaction.commit();
        res.status(201).json(patient);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/patients/:patientId",
  authenticate,
  allowRoles("RECEPTIONIST"),
  async (req, res, next) => {
    try {
      const patientId = z.string().uuid().parse(req.params.patientId);
      const reason = z.string().trim().min(5).max(500).parse(req.body?.reason);
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin();
      try {
        const contextRequest = new sql.Request(transaction)
          .input("contextUser", sql.UniqueIdentifier, userId(req))
          .input("contextReason", sql.NVarChar(500), reason);
        await contextRequest.query(`
          EXEC sys.sp_set_session_context @key=N'UserId', @value=@contextUser;
          EXEC sys.sp_set_session_context @key=N'DeleteReason', @value=@contextReason;
        `);
        const result = await new sql.Request(transaction)
          .input("patientId", sql.UniqueIdentifier, patientId)
          .query(`
            DELETE FROM dbo.Patients
            WHERE PatientId = @patientId AND IsDeleted = 0;
            SELECT @@ROWCOUNT AS AffectedRows;
          `);
        const affectedRows = Number(result.recordset[0]?.AffectedRows ?? 0);
        if (affectedRows !== 1) {
          await transaction.rollback();
          res.status(404).json({ error: "Patient not found" });
          return;
        }
        await writeAudit(
          new sql.Request(transaction),
          userId(req),
          "PATIENT_SOFT_DELETED",
          "Patient",
          patientId,
          { reason }
        );
        await new sql.Request(transaction).query(`
          EXEC sys.sp_set_session_context @key=N'UserId', @value=NULL;
          EXEC sys.sp_set_session_context @key=N'DeleteReason', @value=NULL;
        `);
        await transaction.commit();
        res.status(204).end();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

const visitSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  visitType: z.enum(["NEW", "FOLLOW_UP_PAID", "FOLLOW_UP_FREE"]),
  chiefComplaint: z.string().max(1000).optional()
});

router.get(
  "/visits",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT", "ACCOUNTANT", "CHIEF_ACCOUNTANT"),
  async (req, res, next) => {
    try {
      const status = req.query.status === undefined
        ? undefined
        : z.coerce.number().int().min(-1).max(4).parse(req.query.status);
      const result = await getDatabase()
        .request()
        .input("status", sql.SmallInt, status ?? null)
        .query(`
          SELECT TOP (200)
            v.VisitId, v.VisitCode, v.VisitType, v.Status, v.TotalAmount, v.CreatedAt,
            p.PatientCode, p.FullName AS PatientName, doctor.Username AS DoctorUsername
          FROM dbo.Visits v
          JOIN dbo.Patients p ON p.PatientId = v.PatientId
          JOIN dbo.Users doctor ON doctor.UserId = v.DoctorId
          WHERE v.IsDeleted = 0 AND p.IsDeleted = 0
            AND (@status IS NULL OR v.Status = @status)
          ORDER BY v.CreatedAt DESC
        `);
      await writeAudit(
        getDatabase().request(),
        userId(req),
        "VISIT_LIST_READ",
        "Visit",
        null
      );
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/visits",
  authenticate,
  allowRoles("RECEPTIONIST"),
  async (req, res, next) => {
    try {
      const input = visitSchema.parse(req.body);
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const counterResult = await new sql.Request(transaction).query(`
          DECLARE @today date = CONVERT(date, SYSUTCDATETIME());
          UPDATE dbo.VisitCounters WITH (UPDLOCK, HOLDLOCK)
            SET LastValue = LastValue + 1, UpdatedAt = SYSUTCDATETIME()
            WHERE CounterDate = @today AND IsDeleted = 0;
          IF @@ROWCOUNT = 0
            INSERT INTO dbo.VisitCounters (CounterDate, LastValue) VALUES (@today, 1);
          SELECT LastValue FROM dbo.VisitCounters WHERE CounterDate = @today;
        `);
        const nextVisitNumber = Number(counterResult.recordset[0].LastValue);
        if (nextVisitNumber > 9999) {
          throw new Error("Daily visit number limit reached");
        }
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const visitCode = `STN#${datePart}#/${String(nextVisitNumber).padStart(4, "0")}`;
        const result = await new sql.Request(transaction)
          .input("visitCode", sql.NVarChar(30), visitCode)
          .input("patientId", sql.UniqueIdentifier, input.patientId)
          .input("doctorId", sql.UniqueIdentifier, input.doctorId)
          .input("createdBy", sql.UniqueIdentifier, userId(req))
          .input("visitType", sql.NVarChar(30), input.visitType)
          .input("chiefComplaint", sql.NVarChar(1000), input.chiefComplaint ?? null)
          .query(`
            INSERT INTO dbo.Visits
              (VisitCode, PatientId, DoctorId, CreatedBy, VisitType, ChiefComplaint)
            OUTPUT INSERTED.VisitId, INSERTED.VisitCode, INSERTED.Status, INSERTED.VisitType
            SELECT @visitCode, patient.PatientId, doctor.UserId, @createdBy, @visitType, @chiefComplaint
            FROM dbo.Patients patient
            CROSS JOIN dbo.Users doctor
            WHERE patient.PatientId = @patientId AND patient.IsDeleted = 0
              AND doctor.UserId = @doctorId AND doctor.Role = N'DOCTOR'
                AND doctor.IsActive = 1 AND doctor.IsDeleted = 0;
          `);
        if (result.recordset.length !== 1) {
          throw new Error("Patient or active doctor was not found");
        }
        const visit = result.recordset[0];
        await writeAudit(
          new sql.Request(transaction),
          userId(req),
          "VISIT_CREATED",
          "Visit",
          visit.VisitId
        );
        await transaction.commit();
        res.status(201).json(visit);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

const visitStatusSchema = z.object({
  status: z.union([
    z.literal(-1),
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4)
  ])
});

router.patch(
  "/visits/:visitId/status",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT"),
  async (req, res, next) => {
    try {
      const visitId = z.string().uuid().parse(req.params.visitId);
      const { status: nextStatus } = visitStatusSchema.parse(req.body);
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin();
      try {
        const existing = await new sql.Request(transaction)
          .input("visitId", sql.UniqueIdentifier, visitId)
          .query(`
            SELECT Status, VisitType, TotalAmount, DoctorId FROM dbo.Visits WITH (UPDLOCK, ROWLOCK)
            WHERE VisitId = @visitId AND IsDeleted = 0
          `);
        const visit = existing.recordset[0] as
          | { Status: number; VisitType: string; TotalAmount: number; DoctorId: string }
          | undefined;
        if (!visit) {
          await transaction.rollback();
          res.status(404).json({ error: "Visit not found" });
          return;
        }

        const actorRole = req.auth!.role;
        const isAssignedDoctor =
          actorRole === "DOCTOR" && visit.DoctorId.toLowerCase() === userId(req).toLowerCase();
        const isClinicalActor = isAssignedDoctor || actorRole === "ADMIN";
        const isReceptionAction = actorRole === "RECEPTIONIST";
        const validActor =
          (visit.Status === 0 && nextStatus === 1 && (isClinicalActor || actorRole === "ASSISTANT")) ||
          (visit.Status === 1 && nextStatus === 2 && isClinicalActor) ||
          (visit.Status === 2 && nextStatus === 1 && isClinicalActor) ||
          (visit.Status === 3 && nextStatus === 2 && isClinicalActor) ||
          (visit.Status === 3 && nextStatus === 4 && isReceptionAction) ||
          (visit.Status === 0 && nextStatus === -1 && isReceptionAction) ||
          (visit.Status === 1 && nextStatus === -1 && isClinicalActor);
        if (!canTransitionVisit(visit.Status as -1 | 0 | 1 | 2 | 3 | 4, nextStatus) || !validActor) {
          await transaction.rollback();
          res.status(409).json({ error: "Visit state transition is not permitted" });
          return;
        }

        if (visit.Status === 3 && nextStatus === 2) {
          const paid = await new sql.Request(transaction)
            .input("visitId", sql.UniqueIdentifier, visitId)
            .query(`
              SELECT COALESCE(SUM(Amount), 0) AS Collected
              FROM dbo.PaymentTransactions
              WHERE VisitId = @visitId AND IsDeleted = 0
            `);
          if (Number(paid.recordset[0].Collected) > 0) {
            await transaction.rollback();
            res.status(409).json({
              error: "A visit with recorded payments cannot be reopened; refund or reverse payments first"
            });
            return;
          }
        }

        if (visit.Status === 3 && nextStatus === 4) {
          const paid = await new sql.Request(transaction)
            .input("visitId", sql.UniqueIdentifier, visitId)
            .query(`
              SELECT COALESCE(SUM(Amount), 0) AS Collected
              FROM dbo.PaymentTransactions
              WHERE VisitId = @visitId AND IsDeleted = 0
            `);
          if (Number(paid.recordset[0].Collected) < Number(visit.TotalAmount)) {
            await transaction.rollback();
            res.status(409).json({ error: "Visit has an outstanding balance" });
            return;
          }
        }

        await new sql.Request(transaction)
          .input("visitId", sql.UniqueIdentifier, visitId)
          .input("status", sql.SmallInt, nextStatus)
          .query(`
            UPDATE dbo.Visits SET Status = @status, UpdatedAt = SYSUTCDATETIME()
            WHERE VisitId = @visitId
          `);
        await writeAudit(
          new sql.Request(transaction),
          userId(req),
          "VISIT_STATUS_CHANGED",
          "Visit",
          visitId,
          { from: visit.Status, to: nextStatus }
        );
        await transaction.commit();
        res.json({ visitId, status: nextStatus });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

const stockReceiptSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  lotNumber: z.string().trim().min(1).max(80),
  serialNumber: z.string().trim().max(100).optional(),
  expiresAt: z.coerce.date(),
  quantity: z.number().positive().max(1000000)
    .refine((value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-8,
      "Quantity supports at most 3 decimal places"),
  unitCost: z.number().nonnegative().max(1000000000)
});

const productSchema = z.object({
  productCode: z.string().trim().min(2).max(40),
  productName: z.string().trim().min(2).max(200),
  category: z.enum(["MEDICINE", "MEDICAL_SUPPLY", "CONSUMABLE"]),
  unit: z.string().trim().min(1).max(30),
  minimumStock: z.number().nonnegative().max(1000000).default(10)
});

router.get(
  "/inventory/products",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT", "ACCOUNTANT", "CHIEF_ACCOUNTANT", "INVENTORY_MANAGER"),
  async (_req, res, next) => {
    try {
      const result = await getDatabase().request().query(`
        SELECT ProductId, ProductCode, ProductName, Category, Unit, MinimumStock
        FROM dbo.Products
        WHERE IsActive = 1 AND IsDeleted = 0
        ORDER BY ProductName
      `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/inventory/products",
  authenticate,
  allowRoles("ADMIN", "INVENTORY_MANAGER"),
  async (req, res, next) => {
    try {
      const input = productSchema.parse(req.body);
      const result = await getDatabase()
        .request()
        .input("productCode", sql.NVarChar(40), input.productCode)
        .input("productName", sql.NVarChar(200), input.productName)
        .input("category", sql.NVarChar(30), input.category)
        .input("unit", sql.NVarChar(30), input.unit)
        .input("minimumStock", sql.Decimal(18, 3), input.minimumStock)
        .input("createdBy", sql.UniqueIdentifier, userId(req))
        .query(`
          INSERT INTO dbo.Products
            (ProductCode, ProductName, Category, Unit, MinimumStock, CreatedBy)
          OUTPUT INSERTED.ProductId, INSERTED.ProductCode, INSERTED.ProductName,
                 INSERTED.Category, INSERTED.Unit, INSERTED.MinimumStock
          VALUES (@productCode, @productName, @category, @unit, @minimumStock, @createdBy)
        `);
      const product = result.recordset[0] as { ProductId: string };
      await writeAudit(
        getDatabase().request(),
        userId(req),
        "PRODUCT_CREATED",
        "Product",
        product.ProductId
      );
      res.status(201).json(result.recordset[0]);
    } catch (error) {
      next(error);
    }
  }
);

const warehouseSchema = z.object({
  warehouseCode: z.string().trim().min(2).max(30),
  warehouseName: z.string().trim().min(2).max(150)
});

router.get(
  "/inventory/warehouses",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT", "ACCOUNTANT", "CHIEF_ACCOUNTANT", "INVENTORY_MANAGER"),
  async (_req, res, next) => {
    try {
      const result = await getDatabase().request().query(`
        SELECT WarehouseId, WarehouseCode, WarehouseName
        FROM dbo.Warehouses
        WHERE IsDeleted = 0
        ORDER BY WarehouseName
      `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/inventory/warehouses",
  authenticate,
  allowRoles("ADMIN", "INVENTORY_MANAGER"),
  async (req, res, next) => {
    try {
      const input = warehouseSchema.parse(req.body);
      const result = await getDatabase()
        .request()
        .input("warehouseCode", sql.NVarChar(30), input.warehouseCode)
        .input("warehouseName", sql.NVarChar(150), input.warehouseName)
        .input("createdBy", sql.UniqueIdentifier, userId(req))
        .query(`
          INSERT INTO dbo.Warehouses (WarehouseCode, WarehouseName, CreatedBy)
          OUTPUT INSERTED.WarehouseId, INSERTED.WarehouseCode, INSERTED.WarehouseName
          VALUES (@warehouseCode, @warehouseName, @createdBy)
        `);
      const warehouse = result.recordset[0] as { WarehouseId: string };
      await writeAudit(
        getDatabase().request(),
        userId(req),
        "WAREHOUSE_CREATED",
        "Warehouse",
        warehouse.WarehouseId
      );
      res.status(201).json(result.recordset[0]);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/inventory",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT", "ACCOUNTANT", "CHIEF_ACCOUNTANT", "INVENTORY_MANAGER"),
  async (req, res, next) => {
    try {
      const result = await getDatabase().request().query(`
        SELECT
          p.ProductId, p.ProductCode, p.ProductName, p.Category, p.Unit,
          l.LotId, l.LotNumber, l.SerialNumber, l.ExpiresAt, l.UnitCost,
          l.QuantityOnHand, l.QuantityReserved, l.QuantityBlocked,
          l.QuantityOnHand - l.QuantityReserved - l.QuantityBlocked AS QuantityAvailable,
          w.WarehouseCode, w.WarehouseName
        FROM dbo.InventoryLots l
        JOIN dbo.Products p ON p.ProductId = l.ProductId
        JOIN dbo.Warehouses w ON w.WarehouseId = l.WarehouseId
        WHERE l.IsDeleted = 0 AND p.IsDeleted = 0 AND w.IsDeleted = 0
        ORDER BY p.ProductName, l.ReceivedAt, l.ExpiresAt
      `);
      await writeAudit(
        getDatabase().request(),
        userId(req),
        "INVENTORY_READ",
        "InventoryLot",
        null
      );
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/inventory/receipts",
  authenticate,
  allowRoles("ADMIN", "INVENTORY_MANAGER"),
  async (req, res, next) => {
    try {
      const input = stockReceiptSchema.parse(req.body);
      if (input.expiresAt <= new Date()) {
        res.status(400).json({ error: "Expired stock cannot be received as available stock" });
        return;
      }
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const result = await new sql.Request(transaction)
          .input("productId", sql.UniqueIdentifier, input.productId)
          .input("warehouseId", sql.UniqueIdentifier, input.warehouseId)
          .input("lotNumber", sql.NVarChar(80), input.lotNumber)
          .input("serialNumber", sql.NVarChar(100), input.serialNumber ?? null)
          .input("expiresAt", sql.Date, input.expiresAt)
          .input("quantity", sql.Decimal(18, 3), input.quantity)
          .input("unitCost", sql.Decimal(19, 4), input.unitCost)
          .input("createdBy", sql.UniqueIdentifier, userId(req))
          .query(`
            INSERT INTO dbo.InventoryLots
              (ProductId, WarehouseId, LotNumber, SerialNumber, ExpiresAt,
               UnitCost, QuantityOnHand, CreatedBy)
            OUTPUT INSERTED.LotId, INSERTED.LotNumber, INSERTED.QuantityOnHand
            SELECT p.ProductId, w.WarehouseId, @lotNumber, @serialNumber, @expiresAt,
                   @unitCost, @quantity, @createdBy
            FROM dbo.Products p CROSS JOIN dbo.Warehouses w
            WHERE p.ProductId = @productId AND p.IsActive = 1 AND p.IsDeleted = 0
              AND w.WarehouseId = @warehouseId AND w.IsDeleted = 0;
          `);
        if (result.recordset.length !== 1) {
          throw new Error("Active product or warehouse was not found");
        }
        const lot = result.recordset[0];
        await new sql.Request(transaction)
          .input("lotId", sql.UniqueIdentifier, lot.LotId)
          .input("quantity", sql.Decimal(18, 3), input.quantity)
          .input("unitCost", sql.Decimal(19, 4), input.unitCost)
          .input("referenceCode", sql.NVarChar(50), `NK#${randomUUID().slice(0, 8)}`)
          .input("createdBy", sql.UniqueIdentifier, userId(req))
          .query(`
            INSERT INTO dbo.InventoryTransactions
              (LotId, TransactionType, Quantity, UnitCost, ReferenceCode, CreatedBy)
            VALUES (@lotId, N'RECEIPT', @quantity, @unitCost, @referenceCode, @createdBy)
          `);
        await writeAudit(
          new sql.Request(transaction),
          userId(req),
          "INVENTORY_RECEIVED",
          "InventoryLot",
          lot.LotId,
          { quantity: input.quantity }
        );
        await transaction.commit();
        res.status(201).json(lot);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

const stockIssueSchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  quantity: z.number().positive().max(1000000)
    .refine((value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-8,
      "Quantity supports at most 3 decimal places")
});

router.post(
  "/inventory/issues",
  authenticate,
  allowRoles("ADMIN", "INVENTORY_MANAGER", "DOCTOR"),
  async (req, res, next) => {
    try {
      const input = stockIssueSchema.parse(req.body);
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const lotsResult = await new sql.Request(transaction)
          .input("productId", sql.UniqueIdentifier, input.productId)
          .input("warehouseId", sql.UniqueIdentifier, input.warehouseId)
          .query(`
            SELECT LotId, ExpiresAt, ReceivedAt, UnitCost,
              QuantityOnHand - QuantityReserved - QuantityBlocked AS QuantityAvailable
            FROM dbo.InventoryLots WITH (UPDLOCK, ROWLOCK)
            WHERE ProductId = @productId AND WarehouseId = @warehouseId
              AND ExpiresAt > CONVERT(date, SYSUTCDATETIME()) AND IsDeleted = 0
              AND QuantityOnHand > QuantityReserved + QuantityBlocked
            ORDER BY ReceivedAt, ExpiresAt, LotId
          `);
        const allocations = allocateFifo(
          lotsResult.recordset.map((lot: {
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

        for (const allocation of allocations) {
          const updated = await new sql.Request(transaction)
            .input("lotId", sql.UniqueIdentifier, allocation.lotId)
            .input("quantity", sql.Decimal(18, 3), allocation.quantity)
            .query(`
              UPDATE dbo.InventoryLots
              SET QuantityOnHand = QuantityOnHand - @quantity, UpdatedAt = SYSUTCDATETIME()
              WHERE LotId = @lotId AND IsDeleted = 0
                AND ExpiresAt > CONVERT(date, SYSUTCDATETIME())
                AND QuantityOnHand - QuantityReserved - QuantityBlocked >= @quantity;
              SELECT @@ROWCOUNT AS AffectedRows;
            `);
          if (Number(updated.recordset[0].AffectedRows) !== 1) {
            throw new Error("Stock changed during issue; retry the transaction");
          }
          await new sql.Request(transaction)
            .input("lotId", sql.UniqueIdentifier, allocation.lotId)
            .input("visitId", sql.UniqueIdentifier, input.visitId ?? null)
            .input("quantity", sql.Decimal(18, 3), allocation.quantity)
            .input("unitCost", sql.Decimal(19, 4), allocation.unitCost)
            .input("referenceCode", sql.NVarChar(50), `XK#${randomUUID().slice(0, 8)}`)
            .input("createdBy", sql.UniqueIdentifier, userId(req))
            .query(`
              INSERT INTO dbo.InventoryTransactions
                (LotId, VisitId, TransactionType, Quantity, UnitCost, ReferenceCode, CreatedBy)
              VALUES (@lotId, @visitId, N'ISSUE', @quantity, @unitCost, @referenceCode, @createdBy)
            `);
        }
        await writeAudit(
          new sql.Request(transaction),
          userId(req),
          "INVENTORY_ISSUED",
          "Inventory",
          null,
          { productId: input.productId, quantity: input.quantity, allocations }
        );
        await transaction.commit();
        res.status(201).json({ issued: input.quantity, allocations });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

const journalSchema = z.object({
  description: z.string().trim().min(3).max(1000),
  lines: z.array(z.object({
    accountCode: z.string().trim().min(1).max(20),
    debit: z.number().nonnegative(),
    credit: z.number().nonnegative()
  })).min(2).max(100)
});

router.get(
  "/accounting/journals",
  authenticate,
  allowRoles("ADMIN", "ACCOUNTANT", "CHIEF_ACCOUNTANT"),
  async (_req, res, next) => {
    try {
      const result = await getDatabase().request().query(`
        SELECT TOP (100)
          entry.JournalEntryId, entry.EntryCode, entry.Description, entry.Status,
          entry.CreatedAt, creator.Username AS CreatedByUsername,
          COALESCE(totals.TotalDebit, 0) AS TotalDebit,
          COALESCE(totals.TotalCredit, 0) AS TotalCredit
        FROM dbo.JournalEntries entry
        JOIN dbo.Users creator ON creator.UserId = entry.CreatedBy
        OUTER APPLY (
          SELECT SUM(line.Debit) AS TotalDebit, SUM(line.Credit) AS TotalCredit
          FROM dbo.JournalLines line
          WHERE line.JournalEntryId = entry.JournalEntryId AND line.IsDeleted = 0
        ) totals
        WHERE entry.IsDeleted = 0
        ORDER BY entry.CreatedAt DESC
      `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/accounting/journals",
  authenticate,
  allowRoles("ACCOUNTANT"),
  async (req, res, next) => {
    try {
      const input = journalSchema.parse(req.body);
      assertBalancedJournal(input.lines);
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const entryCode = `JV#${new Date().toISOString().slice(0, 10).replace(/-/g, "")}#/${randomUUID().slice(0, 8)}`;
        const entryResult = await new sql.Request(transaction)
          .input("entryCode", sql.NVarChar(40), entryCode)
          .input("description", sql.NVarChar(1000), input.description)
          .input("createdBy", sql.UniqueIdentifier, userId(req))
          .query(`
            INSERT INTO dbo.JournalEntries (EntryCode, Description, CreatedBy)
            OUTPUT INSERTED.JournalEntryId, INSERTED.EntryCode, INSERTED.Status
            VALUES (@entryCode, @description, @createdBy)
          `);
        const entry = entryResult.recordset[0] as {
          JournalEntryId: string;
          EntryCode: string;
          Status: string;
        };

        for (const line of input.lines) {
          await new sql.Request(transaction)
            .input("entryId", sql.UniqueIdentifier, entry.JournalEntryId)
            .input("accountCode", sql.NVarChar(20), line.accountCode)
            .input("debit", sql.Decimal(19, 2), line.debit)
            .input("credit", sql.Decimal(19, 2), line.credit)
            .input("createdBy", sql.UniqueIdentifier, userId(req))
            .query(`
              INSERT INTO dbo.JournalLines (JournalEntryId, AccountCode, Debit, Credit, CreatedBy)
              VALUES (@entryId, @accountCode, @debit, @credit, @createdBy)
            `);
        }
        await writeAudit(
          new sql.Request(transaction),
          userId(req),
          "JOURNAL_CREATED",
          "JournalEntry",
          entry.JournalEntryId,
          { lineCount: input.lines.length }
        );
        await transaction.commit();
        res.status(201).json(entry);
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
  "/accounting/journals/:journalId/approve",
  authenticate,
  allowRoles("CHIEF_ACCOUNTANT"),
  async (req, res, next) => {
    try {
      const journalId = z.string().uuid().parse(req.params.journalId);
      const result = await getDatabase()
        .request()
        .input("journalId", sql.UniqueIdentifier, journalId)
        .input("approvedBy", sql.UniqueIdentifier, userId(req))
        .query(`
          UPDATE entry
          SET Status = N'APPROVED', ApprovedBy = @approvedBy,
              ApprovedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
          OUTPUT INSERTED.JournalEntryId, INSERTED.Status, INSERTED.ApprovedAt
          FROM dbo.JournalEntries entry
          WHERE entry.JournalEntryId = @journalId
            AND entry.Status = N'DRAFT'
            AND entry.CreatedBy <> @approvedBy
            AND entry.IsDeleted = 0
            AND EXISTS (
              SELECT 1 FROM dbo.JournalLines line
              WHERE line.JournalEntryId = entry.JournalEntryId AND line.IsDeleted = 0
            )
            AND (
              SELECT COALESCE(SUM(Debit), 0) - COALESCE(SUM(Credit), 0)
              FROM dbo.JournalLines
              WHERE JournalEntryId = entry.JournalEntryId AND IsDeleted = 0
            ) = 0;
        `);
      if (result.recordset.length !== 1) {
        res.status(409).json({
          error: "Journal cannot be approved (check its state, balance, or separation of duties)"
        });
        return;
      }
      await recordJournalAudit(userId(req), journalId);
      res.json(result.recordset[0]);
    } catch (error) {
      next(error);
    }
  }
);

async function recordJournalAudit(actorId: string, journalId: string): Promise<void> {
  const request = getDatabase().request()
    .input("userId", sql.UniqueIdentifier, actorId)
    .input("journalId", sql.NVarChar(100), journalId);
  await request.query(`
    INSERT INTO dbo.AuditLogs (UserId, Action, EntityName, EntityId, CreatedBy)
    VALUES (@userId, N'JOURNAL_APPROVED', N'JournalEntry', @journalId, @userId)
  `);
}

export default router;
