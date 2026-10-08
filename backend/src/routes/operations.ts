import { randomUUID } from "node:crypto";
import { Router } from "express";
import sql from "mssql/msnodesqlv8";
import { z } from "zod";
import { getDatabase } from "../db";
import { HttpError } from "../middleware/errors";
import { allowRoles, authenticate, type AuthenticatedRequest, type Role } from "../middleware/auth";
import { protectSensitiveText } from "../security/pii";

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

type ModuleDefinition<T> = {
  path: string;
  roles: Role[];
  listQuery: string;
  schema: z.ZodType<T>;
  entity: string;
  action: string;
  create: (request: sql.Request, req: AuthenticatedRequest, input: T) => Promise<Record<string, unknown>>;
};

function registerModule<T>(definition: ModuleDefinition<T>): void {
  router.get(
    definition.path,
    authenticate,
    allowRoles(...definition.roles),
    async (_req, res, next) => {
      try {
        const result = await getDatabase().request().query(definition.listQuery);
        res.json(result.recordset);
      } catch (error) {
        next(error);
      }
    }
  );
  router.post(
    definition.path,
    authenticate,
    allowRoles(...definition.roles),
    async (req, res, next) => {
      const transaction = new sql.Transaction(getDatabase());
      try {
        const input = definition.schema.parse(req.body);
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
        const request = new sql.Request(transaction);
        const inserted = await definition.create(request, req, input);
        const id = String(Object.values(inserted)[0] ?? "");
        if (!id) throw new Error(`Insert for ${definition.entity} returned no key`);
        await audit(new sql.Request(transaction), req, definition.action, definition.entity, id);
        await transaction.commit();
        res.status(201).json(inserted);
      } catch (error) {
        await transaction.rollback();
        next(error);
      }
    }
  );
}

const sterilizationSchema = z.object({
  autoclaveName: z.string().trim().min(2).max(150),
  temperatureC: z.number().positive().max(250),
  pressureKpa: z.number().positive().max(2000),
  durationMinutes: z.number().int().positive().max(600),
  indicatorResult: z.enum(["PENDING", "PASSED", "FAILED"])
}).strict();

registerModule({
  path: "/sterilization/cycles",
  roles: ["ADMIN", "INVENTORY_MANAGER", "ASSISTANT"],
  entity: "SterilizationCycle",
  action: "STERILIZATION_CYCLE_RECORDED",
  schema: sterilizationSchema,
  listQuery: `
    SELECT TOP (200) cycle.SterilizationCycleId, cycle.CycleCode, cycle.AutoclaveName,
           operator.Username AS OperatorName, cycle.TemperatureC, cycle.PressureKpa,
           cycle.DurationMinutes, cycle.IndicatorResult AS Status, cycle.StartedAt AS CreatedAt,
           cycle.PassedAt, cycle.SterileUntil
    FROM dbo.SterilizationCycles cycle
    JOIN dbo.Users operator ON operator.UserId = cycle.OperatorId
    WHERE cycle.IsDeleted = 0
    ORDER BY cycle.StartedAt DESC
  `,
  async create(request, req, input) {
    const code = `TC#${new Date().toISOString().slice(0, 10).replace(/-/g, "")}#${randomUUID().slice(0, 8)}`;
    const result = await request
      .input("code", sql.NVarChar(40), code)
      .input("autoclaveName", sql.NVarChar(150), input.autoclaveName)
      .input("operatorId", sql.UniqueIdentifier, actorId(req))
      .input("temperatureC", sql.Decimal(5, 2), input.temperatureC)
      .input("pressureKpa", sql.Decimal(7, 2), input.pressureKpa)
      .input("durationMinutes", sql.SmallInt, input.durationMinutes)
      .input("indicatorResult", sql.NVarChar(20), input.indicatorResult)
      .input("createdBy", sql.UniqueIdentifier, actorId(req))
      .query(`
        INSERT INTO dbo.SterilizationCycles
          (CycleCode, AutoclaveName, OperatorId, TemperatureC, PressureKpa,
           DurationMinutes, IndicatorResult, PassedAt, SterileUntil, CreatedBy)
        OUTPUT INSERTED.SterilizationCycleId, INSERTED.CycleCode, INSERTED.AutoclaveName,
               INSERTED.TemperatureC, INSERTED.PressureKpa, INSERTED.DurationMinutes,
               INSERTED.IndicatorResult AS Status, INSERTED.StartedAt AS CreatedAt
        VALUES
          (@code, @autoclaveName, @operatorId, @temperatureC, @pressureKpa,
           @durationMinutes, @indicatorResult,
           CASE WHEN @indicatorResult = N'PASSED' THEN SYSUTCDATETIME() END,
           CASE WHEN @indicatorResult = N'PASSED' THEN DATEADD(day, 30, SYSUTCDATETIME()) END,
           @createdBy)
      `);
    return result.recordset[0] as Record<string, unknown>;
  }
});

const laboSchema = z.object({
  visitId: z.string().uuid(),
  labName: z.string().trim().min(2).max(150),
  workDescription: z.string().trim().min(3).max(1000),
  dueAt: z.coerce.date(),
  estimatedCost: z.number().finite().nonnegative().max(100000000000)
}).strict();

registerModule({
  path: "/operations/labo",
  roles: ["ADMIN", "DOCTOR", "ASSISTANT"],
  entity: "LaboTicket",
  action: "LABO_TICKET_CREATED",
  schema: laboSchema,
  listQuery: `
    SELECT TOP (200) ticket.LaboTicketId, ticket.TicketCode, visit.VisitCode,
           patient.FullName AS PatientName, ticket.LabName, ticket.WorkDescription,
           ticket.DueAt, ticket.EstimatedCost, ticket.Status, ticket.ReworkCount
    FROM dbo.LaboTickets ticket
    JOIN dbo.Visits visit ON visit.VisitId = ticket.VisitId
    JOIN dbo.Patients patient ON patient.PatientId = visit.PatientId
    WHERE ticket.IsDeleted = 0 AND visit.IsDeleted = 0 AND patient.IsDeleted = 0
    ORDER BY ticket.CreatedAt DESC
  `,
  async create(request, req, input) {
    const code = `LB#${randomUUID().slice(0, 12).toUpperCase()}`;
    const result = await request
      .input("code", sql.NVarChar(40), code)
      .input("visitId", sql.UniqueIdentifier, input.visitId)
      .input("labName", sql.NVarChar(150), input.labName)
      .input("workDescription", sql.NVarChar(1000), input.workDescription)
      .input("dueAt", sql.Date, input.dueAt)
      .input("estimatedCost", sql.Decimal(19, 2), input.estimatedCost)
      .input("createdBy", sql.UniqueIdentifier, actorId(req))
      .query(`
        INSERT INTO dbo.LaboTickets
          (TicketCode, VisitId, LabName, WorkDescription, DueAt, EstimatedCost, CreatedBy)
        OUTPUT INSERTED.LaboTicketId, INSERTED.TicketCode, INSERTED.VisitId,
               INSERTED.LabName, INSERTED.WorkDescription, INSERTED.DueAt,
               INSERTED.EstimatedCost, INSERTED.Status
        SELECT @code, visit.VisitId, @labName, @workDescription, @dueAt, @estimatedCost, @createdBy
        FROM dbo.Visits visit
        WHERE visit.VisitId = @visitId AND visit.IsDeleted = 0 AND visit.Status IN (1, 2, 3, 4)
      `);
    if (result.recordset.length !== 1) throw new HttpError(409, "Labo ticket requires a valid active visit");
    return result.recordset[0] as Record<string, unknown>;
  }
});

const insuranceSchema = z.object({
  visitId: z.string().uuid(),
  payerName: z.string().trim().min(2).max(200),
  payerType: z.enum(["COMMERCIAL", "BHYT"])
}).strict();

registerModule({
  path: "/insurance/claims",
  roles: ["ADMIN", "RECEPTIONIST", "ACCOUNTANT", "CHIEF_ACCOUNTANT"],
  entity: "InsuranceClaim",
  action: "INSURANCE_CLAIM_CREATED",
  schema: insuranceSchema,
  listQuery: `
    SELECT TOP (200) claim.InsuranceClaimId, claim.ClaimCode, visit.VisitCode,
           patient.FullName AS PatientName, claim.PayerName, claim.PayerType,
           claim.RequestedAmount, claim.ApprovedAmount, claim.Status, claim.SubmittedAt
    FROM dbo.InsuranceClaims claim
    JOIN dbo.Visits visit ON visit.VisitId = claim.VisitId
    JOIN dbo.Patients patient ON patient.PatientId = visit.PatientId
    WHERE claim.IsDeleted = 0 AND visit.IsDeleted = 0 AND patient.IsDeleted = 0
    ORDER BY claim.CreatedAt DESC
  `,
  async create(request, req, input) {
    const code = `BH#${randomUUID().slice(0, 12).toUpperCase()}`;
    const result = await request
      .input("code", sql.NVarChar(40), code)
      .input("visitId", sql.UniqueIdentifier, input.visitId)
      .input("payerName", sql.NVarChar(200), input.payerName)
      .input("payerType", sql.NVarChar(20), input.payerType)
      .input("createdBy", sql.UniqueIdentifier, actorId(req))
      .query(`
        INSERT INTO dbo.InsuranceClaims (ClaimCode, VisitId, PayerName, PayerType, RequestedAmount, CreatedBy)
        OUTPUT INSERTED.InsuranceClaimId, INSERTED.ClaimCode, INSERTED.VisitId,
               INSERTED.PayerName, INSERTED.PayerType, INSERTED.RequestedAmount, INSERTED.Status
        SELECT @code, visit.VisitId, @payerName, @payerType, visit.TotalAmount, @createdBy
        FROM dbo.Visits visit
        WHERE visit.VisitId = @visitId AND visit.IsDeleted = 0 AND visit.Status IN (3, 4)
          AND visit.TotalAmount > 0
      `);
    if (result.recordset.length !== 1) throw new HttpError(409, "Insurance claims require a settled paid visit");
    return result.recordset[0] as Record<string, unknown>;
  }
});

const warrantySchema = z.object({
  visitId: z.string().uuid(),
  serviceName: z.string().trim().min(2).max(200),
  monthsValid: z.number().int().positive().max(120)
}).strict();

registerModule({
  path: "/warranties",
  roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"],
  entity: "Warranty",
  action: "WARRANTY_CREATED",
  schema: warrantySchema,
  listQuery: `
    SELECT TOP (200) warranty.WarrantyId, warranty.WarrantyCode, patient.FullName AS PatientName,
           warranty.ServiceName, warranty.StartedAt, warranty.ExpiresAt, warranty.Status
    FROM dbo.Warranties warranty
    JOIN dbo.Visits visit ON visit.VisitId = warranty.VisitId
    JOIN dbo.Patients patient ON patient.PatientId = visit.PatientId
    WHERE warranty.IsDeleted = 0 AND visit.IsDeleted = 0 AND patient.IsDeleted = 0
    ORDER BY warranty.CreatedAt DESC
  `,
  async create(request, req, input) {
    const code = `BHANH#${randomUUID().slice(0, 12).toUpperCase()}`;
    const result = await request
      .input("code", sql.NVarChar(40), code)
      .input("visitId", sql.UniqueIdentifier, input.visitId)
      .input("serviceName", sql.NVarChar(200), input.serviceName)
      .input("monthsValid", sql.Int, input.monthsValid)
      .input("createdBy", sql.UniqueIdentifier, actorId(req))
      .query(`
        INSERT INTO dbo.Warranties (WarrantyCode, VisitId, ServiceName, StartedAt, ExpiresAt, CreatedBy)
        OUTPUT INSERTED.WarrantyId, INSERTED.WarrantyCode, INSERTED.VisitId,
               INSERTED.ServiceName, INSERTED.StartedAt, INSERTED.ExpiresAt, INSERTED.Status
        SELECT @code, visit.VisitId, @serviceName, CONVERT(date, SYSUTCDATETIME()),
               DATEADD(month, @monthsValid, CONVERT(date, SYSUTCDATETIME())), @createdBy
        FROM dbo.Visits visit
        WHERE visit.VisitId = @visitId AND visit.Status = 4 AND visit.IsDeleted = 0
      `);
    if (result.recordset.length !== 1) throw new HttpError(409, "Warranty can only be issued for a completed visit");
    return result.recordset[0] as Record<string, unknown>;
  }
});

const employeeSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  position: z.enum(["DOCTOR", "ASSISTANT", "RECEPTIONIST", "ACCOUNTANT", "INVENTORY_MANAGER"]),
  professionalLicense: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(20).optional()
}).strict();

registerModule({
  path: "/hr/employees",
  roles: ["ADMIN", "ACCOUNTANT"],
  entity: "Employee",
  action: "EMPLOYEE_CREATED",
  schema: employeeSchema,
  listQuery: `
    SELECT TOP (200) EmployeeId, EmployeeCode, FullName, Position,
           ProfessionalLicense, StartedAt, IsActive
    FROM dbo.Employees
    WHERE IsDeleted = 0
    ORDER BY FullName
  `,
  async create(request, req, input) {
    const code = `NV#${randomUUID().slice(0, 12).toUpperCase()}`;
    const result = await request
      .input("code", sql.NVarChar(40), code)
      .input("fullName", sql.NVarChar(200), input.fullName)
      .input("position", sql.NVarChar(30), input.position)
      .input("license", sql.NVarChar(100), input.professionalLicense || null)
      .input("phone", sql.NVarChar(512), protectSensitiveText(input.phone))
      .input("createdBy", sql.UniqueIdentifier, actorId(req))
      .query(`
        INSERT INTO dbo.Employees (EmployeeCode, FullName, Position, ProfessionalLicense, Phone, CreatedBy)
        OUTPUT INSERTED.EmployeeId, INSERTED.EmployeeCode, INSERTED.FullName, INSERTED.Position,
               INSERTED.ProfessionalLicense, INSERTED.StartedAt, INSERTED.IsActive
        VALUES (@code, @fullName, @position, @license, @phone, @createdBy)
      `);
    return result.recordset[0] as Record<string, unknown>;
  }
});

const assetSchema = z.object({
  assetName: z.string().trim().min(2).max(200),
  category: z.enum(["CHAIR", "IMAGING", "AUTOCLAVE", "OTHER"]),
  serialNumber: z.string().trim().max(100).optional(),
  acquisitionDate: z.coerce.date(),
  acquisitionCost: z.number().finite().nonnegative().max(100000000000),
  usefulLifeMonths: z.number().int().positive().max(1200)
}).strict();

registerModule({
  path: "/assets",
  roles: ["ADMIN", "ACCOUNTANT", "INVENTORY_MANAGER"],
  entity: "FixedAsset",
  action: "FIXED_ASSET_CREATED",
  schema: assetSchema,
  listQuery: `
    SELECT TOP (200) AssetId, AssetCode, AssetName, Category, SerialNumber,
           AcquisitionDate, AcquisitionCost, UsefulLifeMonths, Status
    FROM dbo.FixedAssets
    WHERE IsDeleted = 0
    ORDER BY AcquisitionDate DESC
  `,
  async create(request, req, input) {
    const code = `TS#${randomUUID().slice(0, 12).toUpperCase()}`;
    const result = await request
      .input("code", sql.NVarChar(40), code)
      .input("assetName", sql.NVarChar(200), input.assetName)
      .input("category", sql.NVarChar(30), input.category)
      .input("serialNumber", sql.NVarChar(100), input.serialNumber || null)
      .input("acquisitionDate", sql.Date, input.acquisitionDate)
      .input("acquisitionCost", sql.Decimal(19, 2), input.acquisitionCost)
      .input("usefulLifeMonths", sql.SmallInt, input.usefulLifeMonths)
      .input("createdBy", sql.UniqueIdentifier, actorId(req))
      .query(`
        INSERT INTO dbo.FixedAssets
          (AssetCode, AssetName, Category, SerialNumber, AcquisitionDate, AcquisitionCost, UsefulLifeMonths, CreatedBy)
        OUTPUT INSERTED.AssetId, INSERTED.AssetCode, INSERTED.AssetName, INSERTED.Category,
               INSERTED.AcquisitionDate, INSERTED.AcquisitionCost, INSERTED.Status
        VALUES
          (@code, @assetName, @category, @serialNumber, @acquisitionDate,
           @acquisitionCost, @usefulLifeMonths, @createdBy)
      `);
    return result.recordset[0] as Record<string, unknown>;
  }
});

router.get(
  "/accounting/journals",
  authenticate,
  allowRoles("ADMIN", "ACCOUNTANT", "CHIEF_ACCOUNTANT"),
  async (_req, res, next) => {
    try {
      const result = await getDatabase().request().query(`
        SELECT TOP (200) entry.JournalEntryId, entry.EntryCode, entry.Description,
               entry.Status, creator.Username AS CreatedByUsername, entry.CreatedAt,
               COALESCE(SUM(line.Debit), 0) AS TotalDebit
        FROM dbo.JournalEntries entry
        JOIN dbo.Users creator ON creator.UserId = entry.CreatedBy
        LEFT JOIN dbo.JournalLines line ON line.JournalEntryId = entry.JournalEntryId AND line.IsDeleted = 0
        WHERE entry.IsDeleted = 0
        GROUP BY entry.JournalEntryId, entry.EntryCode, entry.Description, entry.Status,
                 creator.Username, entry.CreatedAt
        ORDER BY entry.CreatedAt DESC
      `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
