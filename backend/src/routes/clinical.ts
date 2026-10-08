import { createHash, randomUUID } from "node:crypto";
import { Router } from "express";
import sql from "mssql/msnodesqlv8";
import { z } from "zod";
import { getDatabase } from "../db";
import { HttpError } from "../middleware/errors";
import { allowRoles, authenticate, type AuthenticatedRequest } from "../middleware/auth";
import { protectSensitiveText, revealSensitiveText } from "../security/pii";

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
  entityId: string | null,
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

async function assertVisitAccess(
  request: sql.Request,
  req: AuthenticatedRequest,
  visitId: string
): Promise<{ PatientId: string; DoctorId: string; Status: number; VisitType: string }> {
  const result = await request
    .input("visitId", sql.UniqueIdentifier, visitId)
    .query(`
      SELECT PatientId, DoctorId, Status, VisitType
      FROM dbo.Visits WITH (UPDLOCK, ROWLOCK)
      WHERE VisitId = @visitId AND IsDeleted = 0
    `);
  const visit = result.recordset[0] as
    | { PatientId: string; DoctorId: string; Status: number; VisitType: string }
    | undefined;
  if (!visit) throw new HttpError(404, "Visit not found");
  if (
    req.auth?.role === "DOCTOR" &&
    visit.DoctorId.toLowerCase() !== actorId(req).toLowerCase()
  ) {
    throw new HttpError(403, "This visit is assigned to another doctor");
  }
  return visit;
}

router.get(
  "/staff/doctors",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT"),
  async (_req, res, next) => {
    try {
      const result = await getDatabase().request().query(`
        SELECT UserId, Username
        FROM dbo.Users
        WHERE Role = N'DOCTOR' AND IsActive = 1 AND IsDeleted = 0
        ORDER BY Username
      `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/clinical/services",
  authenticate,
  allowRoles("ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT"),
  async (_req, res, next) => {
    try {
      const result = await getDatabase().request().query(`
        SELECT ServiceId, ServiceCode, ServiceName, DefaultPrice, IsInvasive
        FROM dbo.ClinicalServices
        WHERE IsActive = 1 AND IsDeleted = 0
        ORDER BY ServiceName
      `);
      res.json(result.recordset);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/clinical/services",
  authenticate,
  allowRoles("ADMIN"),
  async (req, res, next) => {
    try {
      const input = z.object({
        serviceCode: z.string().trim().min(2).max(40),
        serviceName: z.string().trim().min(2).max(200),
        defaultPrice: z.number().finite().nonnegative().max(100000000000),
        isInvasive: z.boolean().default(false)
      }).strict().parse(req.body);
      const result = await getDatabase().request()
        .input("serviceCode", sql.NVarChar(40), input.serviceCode)
        .input("serviceName", sql.NVarChar(200), input.serviceName)
        .input("defaultPrice", sql.Decimal(19, 2), input.defaultPrice)
        .input("isInvasive", sql.Bit, input.isInvasive)
        .input("createdBy", sql.UniqueIdentifier, actorId(req))
        .query(`
          INSERT INTO dbo.ClinicalServices
            (ServiceCode, ServiceName, DefaultPrice, IsInvasive, CreatedBy)
          OUTPUT INSERTED.ServiceId, INSERTED.ServiceCode, INSERTED.ServiceName,
                 INSERTED.DefaultPrice, INSERTED.IsInvasive
          VALUES (@serviceCode, @serviceName, @defaultPrice, @isInvasive, @createdBy)
        `);
      await audit(
        getDatabase().request(),
        req,
        "CLINICAL_SERVICE_CREATED",
        "ClinicalService",
        result.recordset[0].ServiceId,
        { serviceCode: input.serviceCode }
      );
      res.status(201).json(result.recordset[0]);
    } catch (error) {
      next(error);
    }
  }
);

const emrSchema = z.object({
  vitals: z.object({
    bloodPressure: z.string().max(20).optional().default(""),
    pulse: z.string().max(5).optional().default(""),
    temperature: z.string().max(5).optional().default(""),
    spo2: z.string().max(3).optional().default(""),
    height: z.string().max(6).optional().default(""),
    weight: z.string().max(6).optional().default("")
  }).strict(),
  diagnosis: z.string().trim().max(2000),
  clinicalNotes: z.string().max(20000),
  odontogram: z.array(z.number().int().refine((tooth) =>
    (tooth >= 11 && tooth <= 18) ||
    (tooth >= 21 && tooth <= 28) ||
    (tooth >= 31 && tooth <= 38) ||
    (tooth >= 41 && tooth <= 48)
  )).max(32).refine((teeth) => new Set(teeth).size === teeth.length)
}).strict();

router.get(
  "/clinical/visits/:visitId/emr",
  authenticate,
  allowRoles("ADMIN", "DOCTOR", "ASSISTANT"),
  async (req, res, next) => {
    try {
      const visitId = z.string().uuid().parse(req.params.visitId);
      const accessRequest = getDatabase().request();
      await assertVisitAccess(accessRequest, req, visitId);
      const result = await getDatabase()
        .request()
        .input("visitId", sql.UniqueIdentifier, visitId)
        .query(`
          SELECT BloodPressure, PulsePerMinute, TemperatureC, Spo2, HeightCm, WeightKg,
                 Diagnosis, ClinicalNotes, OdontogramJson, Revision, UpdatedAt
          FROM dbo.VisitEmr
          WHERE VisitId = @visitId AND IsDeleted = 0
        `);
      const record = result.recordset[0] as
        | {
            BloodPressure: string | null;
            PulsePerMinute: number | null;
            TemperatureC: number | null;
            Spo2: number | null;
            HeightCm: number | null;
            WeightKg: number | null;
            Diagnosis: string | null;
            ClinicalNotes: string | null;
            OdontogramJson: string | null;
            Revision: number;
            UpdatedAt: Date | null;
          }
        | undefined;
      if (!record) {
        res.json(null);
        return;
      }
      res.json({
        vitals: {
          bloodPressure: record.BloodPressure ?? "",
          pulse: record.PulsePerMinute?.toString() ?? "",
          temperature: record.TemperatureC?.toString() ?? "",
          spo2: record.Spo2?.toString() ?? "",
          height: record.HeightCm?.toString() ?? "",
          weight: record.WeightKg?.toString() ?? ""
        },
        diagnosis: record.Diagnosis ?? "",
        clinicalNotes: revealSensitiveText(record.ClinicalNotes),
        odontogram: record.OdontogramJson ? JSON.parse(record.OdontogramJson) : [],
        revision: record.Revision,
        updatedAt: record.UpdatedAt
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/clinical/visits/:visitId/emr",
  authenticate,
  allowRoles("ADMIN", "DOCTOR"),
  async (req, res, next) => {
    try {
      const visitId = z.string().uuid().parse(req.params.visitId);
      const input = emrSchema.parse(req.body);
      const numbers = {
        pulse: input.vitals.pulse === "" ? null : Number(input.vitals.pulse),
        temperature: input.vitals.temperature === "" ? null : Number(input.vitals.temperature),
        spo2: input.vitals.spo2 === "" ? null : Number(input.vitals.spo2),
        height: input.vitals.height === "" ? null : Number(input.vitals.height),
        weight: input.vitals.weight === "" ? null : Number(input.vitals.weight)
      };
      if (Object.values(numbers).some((value) => value !== null && !Number.isFinite(value))) {
        res.status(400).json({ error: "Vital signs must be valid numbers" });
        return;
      }
      if (
        (numbers.pulse !== null && (!Number.isInteger(numbers.pulse) || numbers.pulse < 20 || numbers.pulse > 250)) ||
        (numbers.spo2 !== null && (!Number.isInteger(numbers.spo2) || numbers.spo2 < 1 || numbers.spo2 > 100)) ||
        (numbers.temperature !== null && (numbers.temperature < 25 || numbers.temperature > 45)) ||
        (numbers.height !== null && (numbers.height < 20 || numbers.height > 250)) ||
        (numbers.weight !== null && (numbers.weight < 0.5 || numbers.weight > 500))
      ) {
        res.status(400).json({ error: "Vital signs are outside the supported clinical ranges" });
        return;
      }

      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const visit = await assertVisitAccess(new sql.Request(transaction), req, visitId);
        if (visit.Status !== 1 && visit.Status !== 2) {
          await transaction.rollback();
          res.status(409).json({ error: "EMR is frozen outside an active clinical visit" });
          return;
        }
        const saved = await new sql.Request(transaction)
          .input("visitId", sql.UniqueIdentifier, visitId)
          .input("bloodPressure", sql.NVarChar(20), input.vitals.bloodPressure || null)
          .input("pulse", sql.SmallInt, numbers.pulse)
          .input("temperature", sql.Decimal(4, 1), numbers.temperature)
          .input("spo2", sql.TinyInt, numbers.spo2)
          .input("height", sql.Decimal(5, 1), numbers.height)
          .input("weight", sql.Decimal(5, 1), numbers.weight)
          .input("diagnosis", sql.NVarChar(2000), input.diagnosis || null)
          .input("clinicalNotes", sql.NVarChar(sql.MAX), protectSensitiveText(input.clinicalNotes))
          .input("odontogram", sql.NVarChar(sql.MAX), JSON.stringify(input.odontogram))
          .input("actorId", sql.UniqueIdentifier, actorId(req))
          .query(`
            DECLARE @SavedEmr TABLE (VisitEmrId uniqueidentifier, Revision int, UpdatedAt datetime2(3));
            UPDATE dbo.VisitEmr WITH (UPDLOCK, SERIALIZABLE)
            SET BloodPressure = @bloodPressure, PulsePerMinute = @pulse,
                TemperatureC = @temperature, Spo2 = @spo2, HeightCm = @height,
                WeightKg = @weight, Diagnosis = @diagnosis, ClinicalNotes = @clinicalNotes,
                OdontogramJson = @odontogram, Revision = Revision + 1,
                UpdatedAt = SYSUTCDATETIME()
            OUTPUT INSERTED.VisitEmrId, INSERTED.Revision, INSERTED.UpdatedAt INTO @SavedEmr
            WHERE VisitId = @visitId AND IsDeleted = 0;
            IF @@ROWCOUNT = 0
            BEGIN
              INSERT INTO dbo.VisitEmr
                (VisitId, BloodPressure, PulsePerMinute, TemperatureC, Spo2,
                 HeightCm, WeightKg, Diagnosis, ClinicalNotes, OdontogramJson, CreatedBy)
              OUTPUT INSERTED.VisitEmrId, INSERTED.Revision, INSERTED.UpdatedAt INTO @SavedEmr
              VALUES
                (@visitId, @bloodPressure, @pulse, @temperature, @spo2,
                 @height, @weight, @diagnosis, @clinicalNotes, @odontogram, @actorId);
            END;
            SELECT VisitEmrId, Revision, UpdatedAt FROM @SavedEmr;
          `);
        await audit(new sql.Request(transaction), req, "EMR_SAVED", "VisitEmr", saved.recordset[0].VisitEmrId, {
          visitId,
          revision: saved.recordset[0].Revision
        });
        await transaction.commit();
        res.json(saved.recordset[0]);
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
  "/clinical/visits/:visitId/services",
  authenticate,
  allowRoles("ADMIN", "DOCTOR"),
  async (req, res, next) => {
    try {
      const visitId = z.string().uuid().parse(req.params.visitId);
      const input = z.object({
        serviceId: z.string().uuid(),
        quantity: z.number().positive().max(100).default(1)
      }).strict().parse(req.body);
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const visit = await assertVisitAccess(new sql.Request(transaction), req, visitId);
        if (visit.Status !== 1) {
          await transaction.rollback();
          res.status(409).json({ error: "Services may only be added during an active examination" });
          return;
        }
        const result = await new sql.Request(transaction)
          .input("visitId", sql.UniqueIdentifier, visitId)
          .input("serviceId", sql.UniqueIdentifier, input.serviceId)
          .input("quantity", sql.Decimal(12, 3), input.quantity)
          .input("createdBy", sql.UniqueIdentifier, actorId(req))
          .query(`
            INSERT INTO dbo.VisitServiceItems
              (VisitId, ServiceId, ServiceNameSnapshot, Quantity, UnitPrice, CreatedBy)
            OUTPUT INSERTED.VisitServiceItemId, INSERTED.ServiceId, INSERTED.ServiceNameSnapshot,
                   INSERTED.Quantity, INSERTED.UnitPrice, INSERTED.Status
            SELECT @visitId, service.ServiceId, service.ServiceName, @quantity,
                   service.DefaultPrice, @createdBy
            FROM dbo.ClinicalServices service
            WHERE service.ServiceId = @serviceId AND service.IsActive = 1 AND service.IsDeleted = 0;
          `);
        if (result.recordset.length !== 1) {
          throw new HttpError(404, "Active clinical service was not found");
        }
        const item = result.recordset[0] as { VisitServiceItemId: string };
        await audit(new sql.Request(transaction), req, "VISIT_SERVICE_ADDED", "VisitServiceItem", item.VisitServiceItemId, { visitId });
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

const consentSchema = z.object({
  visitId: z.string().uuid(),
  serviceId: z.string().uuid(),
  signature: z.string().max(700000).regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/),
  witnessName: z.string().trim().min(2).max(200)
}).strict();

router.post(
  "/clinical/consents",
  authenticate,
  allowRoles("ADMIN", "DOCTOR"),
  async (req, res, next) => {
    try {
      const input = consentSchema.parse(req.body);
      const bytes = Buffer.from(input.signature.slice("data:image/png;base64,".length), "base64");
      if (bytes.length < 100 || bytes.length > 512 * 1024) {
        res.status(400).json({ error: "Signature image must be between 100 bytes and 512 KB" });
        return;
      }
      if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        res.status(400).json({ error: "Signature must be a valid PNG image" });
        return;
      }
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const visit = await assertVisitAccess(new sql.Request(transaction), req, input.visitId);
        if (visit.Status !== 1) {
          await transaction.rollback();
          res.status(409).json({ error: "Consent can only be recorded during an active examination" });
          return;
        }
        const consentId = randomUUID();
        const result = await new sql.Request(transaction)
          .input("consentId", sql.UniqueIdentifier, consentId)
          .input("visitId", sql.UniqueIdentifier, input.visitId)
          .input("patientId", sql.UniqueIdentifier, visit.PatientId)
          .input("serviceId", sql.UniqueIdentifier, input.serviceId)
          .input("witnessName", sql.NVarChar(200), input.witnessName)
          .input("signature", sql.NVarChar(sql.MAX), protectSensitiveText(input.signature))
          .input("signatureHash", sql.Char(64), createHash("sha256").update(bytes).digest("hex"))
          .input("createdBy", sql.UniqueIdentifier, actorId(req))
          .query(`
            INSERT INTO dbo.TreatmentConsents
              (ConsentId, VisitId, PatientId, ServiceId, WitnessName, SignatureCiphertext,
               SignatureHash, ConsentTextVersion, CreatedBy)
            OUTPUT INSERTED.ConsentId, INSERTED.SignedAt, INSERTED.SignatureHash
            SELECT @consentId, @visitId, @patientId, service.ServiceId, @witnessName,
                   @signature, @signatureHash, N'v1', @createdBy
            FROM dbo.ClinicalServices service
            WHERE service.ServiceId = @serviceId AND service.IsInvasive = 1
              AND service.IsActive = 1 AND service.IsDeleted = 0
              AND EXISTS (
                SELECT 1 FROM dbo.VisitServiceItems item
                WHERE item.VisitId = @visitId AND item.ServiceId = service.ServiceId
                  AND item.Status <> N'VOID' AND item.IsDeleted = 0
              );
          `);
        if (result.recordset.length !== 1) {
          throw new HttpError(400, "Consent is only supported for an active invasive service");
        }
        await audit(new sql.Request(transaction), req, "TREATMENT_CONSENT_SIGNED", "TreatmentConsent", consentId, {
          visitId: input.visitId,
          serviceId: input.serviceId,
          signatureHash: result.recordset[0].SignatureHash
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

router.post(
  "/clinical/consents/:consentId/revoke",
  authenticate,
  allowRoles("ADMIN", "DOCTOR"),
  async (req, res, next) => {
    try {
      const consentId = z.string().uuid().parse(req.params.consentId);
      const reason = z.object({ reason: z.string().trim().min(5).max(500) }).parse(req.body).reason;
      const result = await getDatabase().request()
        .input("consentId", sql.UniqueIdentifier, consentId)
        .input("reason", sql.NVarChar(500), reason)
        .input("actorId", sql.UniqueIdentifier, actorId(req))
        .query(`
          UPDATE consent
          SET RevokedAt = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
          OUTPUT INSERTED.ConsentId, INSERTED.RevokedAt
          FROM dbo.TreatmentConsents consent
          JOIN dbo.Visits visit ON visit.VisitId = consent.VisitId
          WHERE consent.ConsentId = @consentId AND consent.RevokedAt IS NULL
            AND consent.IsDeleted = 0 AND visit.IsDeleted = 0
            AND (@actorId IS NOT NULL)
            AND (visit.DoctorId = @actorId OR EXISTS (
              SELECT 1 FROM dbo.Users WHERE UserId = @actorId AND Role = N'ADMIN'
            ));
          IF @@ROWCOUNT > 0
            INSERT INTO dbo.AuditLogs (UserId, Action, EntityName, EntityId, DetailJson, CreatedBy)
            VALUES (@actorId, N'TREATMENT_CONSENT_REVOKED', N'TreatmentConsent',
                    CONVERT(nvarchar(100), @consentId), (SELECT @reason AS reason FOR JSON PATH, WITHOUT_ARRAY_WRAPPER), @actorId);
        `);
      if (result.recordset.length !== 1) {
        res.status(409).json({ error: "Consent is missing, already revoked, or not assigned to this doctor" });
        return;
      }
      res.json(result.recordset[0]);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/clinical/visits/:visitId/settle",
  authenticate,
  allowRoles("ADMIN", "DOCTOR"),
  async (req, res, next) => {
    try {
      const visitId = z.string().uuid().parse(req.params.visitId);
      const transaction = new sql.Transaction(getDatabase());
      await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const visit = await assertVisitAccess(new sql.Request(transaction), req, visitId);
        if (visit.Status !== 2) {
          await transaction.rollback();
          res.status(409).json({ error: "Visit must be clinically ready before settlement" });
          return;
        }
        const emr = await new sql.Request(transaction)
          .input("visitId", sql.UniqueIdentifier, visitId)
          .query(`
            SELECT VisitEmrId FROM dbo.VisitEmr
            WHERE VisitId = @visitId AND IsDeleted = 0
          `);
        if (emr.recordset.length !== 1) {
          await transaction.rollback();
          res.status(409).json({ error: "Save the electronic medical record before settlement" });
          return;
        }
        const missingConsent = await new sql.Request(transaction)
          .input("visitId", sql.UniqueIdentifier, visitId)
          .query(`
            SELECT TOP (1) item.ServiceId
            FROM dbo.VisitServiceItems item
            JOIN dbo.ClinicalServices service ON service.ServiceId = item.ServiceId
            WHERE item.VisitId = @visitId AND item.IsDeleted = 0 AND item.Status <> N'VOID'
              AND service.IsInvasive = 1
              AND NOT EXISTS (
                SELECT 1 FROM dbo.TreatmentConsents consent
                WHERE consent.VisitId = item.VisitId AND consent.ServiceId = item.ServiceId
                  AND consent.RevokedAt IS NULL AND consent.IsDeleted = 0
              )
          `);
        if (missingConsent.recordset.length > 0) {
          await transaction.rollback();
          res.status(409).json({ error: "Consent required for invasive service", code: "CONSENT_REQUIRED" });
          return;
        }
        const totals = await new sql.Request(transaction)
          .input("visitId", sql.UniqueIdentifier, visitId)
          .query(`
            SELECT COALESCE(SUM(Quantity * UnitPrice), 0) AS TotalAmount
            FROM dbo.VisitServiceItems
            WHERE VisitId = @visitId AND IsDeleted = 0 AND Status <> N'VOID'
          `);
        const totalAmount = Number(totals.recordset[0].TotalAmount);
        if (visit.VisitType === "FOLLOW_UP_FREE" && totalAmount > 0) {
          await transaction.rollback();
          res.status(409).json({ error: "Free follow-up visits cannot include chargeable services" });
          return;
        }
        const status = totalAmount > 0 ? 3 : 4;
        await new sql.Request(transaction)
          .input("visitId", sql.UniqueIdentifier, visitId)
          .input("totalAmount", sql.Decimal(19, 2), totalAmount)
          .input("status", sql.SmallInt, status)
          .query(`
            UPDATE dbo.Visits
            SET TotalAmount = @totalAmount, Status = @status, UpdatedAt = SYSUTCDATETIME()
            WHERE VisitId = @visitId AND Status = 2 AND IsDeleted = 0
          `);
        await audit(new sql.Request(transaction), req, "VISIT_SETTLED", "Visit", visitId, { totalAmount, status });
        await transaction.commit();
        res.json({ status, totalAmount, requiresConsent: false });
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
