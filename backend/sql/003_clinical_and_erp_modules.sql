SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRANSACTION;
GO

CREATE TABLE dbo.ClinicalServices
(
    ServiceId uniqueidentifier NOT NULL CONSTRAINT PK_ClinicalServices PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ServiceCode nvarchar(40) NOT NULL,
    ServiceName nvarchar(200) NOT NULL,
    DefaultPrice decimal(19,2) NOT NULL,
    IsInvasive bit NOT NULL CONSTRAINT DF_ClinicalServices_IsInvasive DEFAULT 0,
    IsActive bit NOT NULL CONSTRAINT DF_ClinicalServices_IsActive DEFAULT 1,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_ClinicalServices_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_ClinicalServices_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_ClinicalServices_Code UNIQUE (ServiceCode),
    CONSTRAINT CK_ClinicalServices_Price CHECK (DefaultPrice >= 0),
    CONSTRAINT FK_ClinicalServices_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);

CREATE TABLE dbo.VisitEmr
(
    VisitEmrId uniqueidentifier NOT NULL CONSTRAINT PK_VisitEmr PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    VisitId uniqueidentifier NOT NULL,
    BloodPressure nvarchar(20) NULL,
    PulsePerMinute smallint NULL,
    TemperatureC decimal(4,1) NULL,
    Spo2 tinyint NULL,
    HeightCm decimal(5,1) NULL,
    WeightKg decimal(5,1) NULL,
    Diagnosis nvarchar(2000) NULL,
    ClinicalNotes nvarchar(max) NULL,
    OdontogramJson nvarchar(max) NULL,
    Revision int NOT NULL CONSTRAINT DF_VisitEmr_Revision DEFAULT 1,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_VisitEmr_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_VisitEmr_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_VisitEmr_Visit UNIQUE (VisitId),
    CONSTRAINT CK_VisitEmr_Pulse CHECK (PulsePerMinute IS NULL OR PulsePerMinute BETWEEN 20 AND 250),
    CONSTRAINT CK_VisitEmr_Temperature CHECK (TemperatureC IS NULL OR TemperatureC BETWEEN 25 AND 45),
    CONSTRAINT CK_VisitEmr_Spo2 CHECK (Spo2 IS NULL OR Spo2 BETWEEN 1 AND 100),
    CONSTRAINT CK_VisitEmr_Height CHECK (HeightCm IS NULL OR HeightCm BETWEEN 20 AND 250),
    CONSTRAINT CK_VisitEmr_Weight CHECK (WeightKg IS NULL OR WeightKg BETWEEN 0.5 AND 500),
    CONSTRAINT CK_VisitEmr_OdontogramJson CHECK (OdontogramJson IS NULL OR ISJSON(OdontogramJson) = 1),
    CONSTRAINT FK_VisitEmr_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(VisitId),
    CONSTRAINT FK_VisitEmr_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);

CREATE TABLE dbo.TreatmentConsents
(
    ConsentId uniqueidentifier NOT NULL CONSTRAINT PK_TreatmentConsents PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    VisitId uniqueidentifier NOT NULL,
    PatientId uniqueidentifier NOT NULL,
    ServiceId uniqueidentifier NOT NULL,
    WitnessName nvarchar(200) NOT NULL,
    SignatureCiphertext nvarchar(max) NOT NULL,
    SignatureHash char(64) NOT NULL,
    ConsentTextVersion nvarchar(30) NOT NULL,
    SignedAt datetime2(3) NOT NULL CONSTRAINT DF_TreatmentConsents_SignedAt DEFAULT SYSUTCDATETIME(),
    RevokedAt datetime2(3) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_TreatmentConsents_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_TreatmentConsents_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT CK_TreatmentConsents_SignatureHash CHECK (SignatureHash NOT LIKE '%[^0-9A-Fa-f]%'),
    CONSTRAINT FK_TreatmentConsents_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(VisitId),
    CONSTRAINT FK_TreatmentConsents_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(PatientId),
    CONSTRAINT FK_TreatmentConsents_Service FOREIGN KEY (ServiceId) REFERENCES dbo.ClinicalServices(ServiceId),
    CONSTRAINT FK_TreatmentConsents_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);

CREATE TABLE dbo.VisitServiceItems
(
    VisitServiceItemId uniqueidentifier NOT NULL CONSTRAINT PK_VisitServiceItems PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    VisitId uniqueidentifier NOT NULL,
    ServiceId uniqueidentifier NOT NULL,
    ServiceNameSnapshot nvarchar(200) NOT NULL,
    Quantity decimal(12,3) NOT NULL CONSTRAINT DF_VisitServiceItems_Quantity DEFAULT 1,
    UnitPrice decimal(19,2) NOT NULL,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_VisitServiceItems_Status DEFAULT N'PENDING',
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_VisitServiceItems_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_VisitServiceItems_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT CK_VisitServiceItems_Quantity CHECK (Quantity > 0),
    CONSTRAINT CK_VisitServiceItems_Price CHECK (UnitPrice >= 0),
    CONSTRAINT CK_VisitServiceItems_Status CHECK (Status IN (N'PENDING', N'RESERVED', N'IN_PROGRESS', N'COMPLETED', N'VOID')),
    CONSTRAINT FK_VisitServiceItems_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(VisitId),
    CONSTRAINT FK_VisitServiceItems_Service FOREIGN KEY (ServiceId) REFERENCES dbo.ClinicalServices(ServiceId),
    CONSTRAINT FK_VisitServiceItems_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);

CREATE TABLE dbo.InventoryReservations
(
    ReservationId uniqueidentifier NOT NULL CONSTRAINT PK_InventoryReservations PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    VisitId uniqueidentifier NOT NULL,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_InventoryReservations_Status DEFAULT N'RESERVED',
    ExpiresAt datetime2(3) NOT NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_InventoryReservations_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_InventoryReservations_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT CK_InventoryReservations_Status CHECK (Status IN (N'RESERVED', N'CONSUMED', N'RELEASED', N'EXPIRED')),
    CONSTRAINT FK_InventoryReservations_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(VisitId),
    CONSTRAINT FK_InventoryReservations_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);

CREATE TABLE dbo.InventoryReservationLines
(
    ReservationLineId uniqueidentifier NOT NULL CONSTRAINT PK_InventoryReservationLines PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ReservationId uniqueidentifier NOT NULL,
    LotId uniqueidentifier NOT NULL,
    Quantity decimal(18,3) NOT NULL,
    UnitCost decimal(19,4) NOT NULL,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_InventoryReservationLines_Status DEFAULT N'RESERVED',
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_InventoryReservationLines_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_InventoryReservationLines_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT CK_InventoryReservationLines_Quantity CHECK (Quantity > 0 AND UnitCost >= 0),
    CONSTRAINT CK_InventoryReservationLines_Status CHECK (Status IN (N'RESERVED', N'CONSUMED', N'RELEASED')),
    CONSTRAINT FK_InventoryReservationLines_Reservation FOREIGN KEY (ReservationId) REFERENCES dbo.InventoryReservations(ReservationId),
    CONSTRAINT FK_InventoryReservationLines_Lot FOREIGN KEY (LotId) REFERENCES dbo.InventoryLots(LotId),
    CONSTRAINT FK_InventoryReservationLines_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);

CREATE TABLE dbo.SterilizationCycles
(
    SterilizationCycleId uniqueidentifier NOT NULL CONSTRAINT PK_SterilizationCycles PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    CycleCode nvarchar(40) NOT NULL,
    AutoclaveName nvarchar(150) NOT NULL,
    OperatorId uniqueidentifier NOT NULL,
    TemperatureC decimal(5,2) NOT NULL,
    PressureKpa decimal(7,2) NOT NULL,
    DurationMinutes smallint NOT NULL,
    IndicatorResult nvarchar(20) NOT NULL,
    StartedAt datetime2(3) NOT NULL CONSTRAINT DF_SterilizationCycles_StartedAt DEFAULT SYSUTCDATETIME(),
    PassedAt datetime2(3) NULL,
    SterileUntil datetime2(3) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_SterilizationCycles_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_SterilizationCycles_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_SterilizationCycles_Code UNIQUE (CycleCode),
    CONSTRAINT CK_SterilizationCycles_Result CHECK (IndicatorResult IN (N'PENDING', N'PASSED', N'FAILED')),
    CONSTRAINT CK_SterilizationCycles_Values CHECK (TemperatureC > 0 AND PressureKpa > 0 AND DurationMinutes > 0),
    CONSTRAINT FK_SterilizationCycles_Operator FOREIGN KEY (OperatorId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_SterilizationCycles_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);

CREATE TABLE dbo.LaboTickets
(
    LaboTicketId uniqueidentifier NOT NULL CONSTRAINT PK_LaboTickets PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    TicketCode nvarchar(40) NOT NULL,
    VisitId uniqueidentifier NOT NULL,
    LabName nvarchar(150) NOT NULL,
    WorkDescription nvarchar(1000) NOT NULL,
    DueAt date NOT NULL,
    EstimatedCost decimal(19,2) NOT NULL,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_LaboTickets_Status DEFAULT N'SENT',
    ReworkCount smallint NOT NULL CONSTRAINT DF_LaboTickets_ReworkCount DEFAULT 0,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_LaboTickets_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_LaboTickets_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_LaboTickets_Code UNIQUE (TicketCode),
    CONSTRAINT CK_LaboTickets_Status CHECK (Status IN (N'SENT', N'IN_PROGRESS', N'RECEIVED', N'REWORK', N'CANCELLED')),
    CONSTRAINT CK_LaboTickets_Cost CHECK (EstimatedCost >= 0 AND ReworkCount >= 0),
    CONSTRAINT FK_LaboTickets_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(VisitId),
    CONSTRAINT FK_LaboTickets_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);

CREATE TABLE dbo.InsuranceClaims
(
    InsuranceClaimId uniqueidentifier NOT NULL CONSTRAINT PK_InsuranceClaims PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ClaimCode nvarchar(40) NOT NULL,
    VisitId uniqueidentifier NOT NULL,
    PayerName nvarchar(200) NOT NULL,
    PayerType nvarchar(20) NOT NULL,
    RequestedAmount decimal(19,2) NOT NULL CONSTRAINT DF_InsuranceClaims_RequestedAmount DEFAULT 0,
    ApprovedAmount decimal(19,2) NULL,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_InsuranceClaims_Status DEFAULT N'DRAFT',
    SubmittedAt datetime2(3) NULL,
    ResolvedAt datetime2(3) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_InsuranceClaims_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_InsuranceClaims_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_InsuranceClaims_Code UNIQUE (ClaimCode),
    CONSTRAINT CK_InsuranceClaims_Type CHECK (PayerType IN (N'COMMERCIAL', N'BHYT')),
    CONSTRAINT CK_InsuranceClaims_Status CHECK (Status IN (N'DRAFT', N'SUBMITTED', N'APPROVED', N'DISPUTED', N'REJECTED')),
    CONSTRAINT CK_InsuranceClaims_Amounts CHECK (RequestedAmount >= 0 AND (ApprovedAmount IS NULL OR ApprovedAmount >= 0)),
    CONSTRAINT FK_InsuranceClaims_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(VisitId),
    CONSTRAINT FK_InsuranceClaims_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);

CREATE TABLE dbo.Warranties
(
    WarrantyId uniqueidentifier NOT NULL CONSTRAINT PK_Warranties PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    WarrantyCode nvarchar(40) NOT NULL,
    VisitId uniqueidentifier NOT NULL,
    ServiceName nvarchar(200) NOT NULL,
    StartedAt date NOT NULL,
    ExpiresAt date NOT NULL,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_Warranties_Status DEFAULT N'ACTIVE',
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Warranties_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_Warranties_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_Warranties_Code UNIQUE (WarrantyCode),
    CONSTRAINT CK_Warranties_Period CHECK (ExpiresAt >= StartedAt),
    CONSTRAINT CK_Warranties_Status CHECK (Status IN (N'ACTIVE', N'EXPIRED', N'VOID')),
    CONSTRAINT FK_Warranties_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(VisitId),
    CONSTRAINT FK_Warranties_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);

CREATE TABLE dbo.Employees
(
    EmployeeId uniqueidentifier NOT NULL CONSTRAINT PK_Employees PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    EmployeeCode nvarchar(40) NOT NULL,
    FullName nvarchar(200) NOT NULL,
    Position nvarchar(30) NOT NULL,
    ProfessionalLicense nvarchar(100) NULL,
    Phone nvarchar(512) NULL,
    StartedAt date NOT NULL CONSTRAINT DF_Employees_StartedAt DEFAULT CONVERT(date, SYSUTCDATETIME()),
    IsActive bit NOT NULL CONSTRAINT DF_Employees_IsActive DEFAULT 1,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Employees_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_Employees_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_Employees_Code UNIQUE (EmployeeCode),
    CONSTRAINT CK_Employees_Position CHECK (Position IN (N'DOCTOR', N'ASSISTANT', N'RECEPTIONIST', N'ACCOUNTANT', N'INVENTORY_MANAGER')),
    CONSTRAINT FK_Employees_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);

CREATE TABLE dbo.FixedAssets
(
    AssetId uniqueidentifier NOT NULL CONSTRAINT PK_FixedAssets PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    AssetCode nvarchar(40) NOT NULL,
    AssetName nvarchar(200) NOT NULL,
    Category nvarchar(30) NOT NULL,
    SerialNumber nvarchar(100) NULL,
    AcquisitionDate date NOT NULL,
    AcquisitionCost decimal(19,2) NOT NULL,
    UsefulLifeMonths smallint NOT NULL,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_FixedAssets_Status DEFAULT N'ACTIVE',
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_FixedAssets_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_FixedAssets_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_FixedAssets_Code UNIQUE (AssetCode),
    CONSTRAINT CK_FixedAssets_Values CHECK (AcquisitionCost >= 0 AND UsefulLifeMonths > 0),
    CONSTRAINT CK_FixedAssets_Category CHECK (Category IN (N'CHAIR', N'IMAGING', N'AUTOCLAVE', N'OTHER')),
    CONSTRAINT CK_FixedAssets_Status CHECK (Status IN (N'ACTIVE', N'MAINTENANCE', N'DISPOSED')),
    CONSTRAINT FK_FixedAssets_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

ALTER TABLE dbo.InventoryTransactions DROP CONSTRAINT CK_InventoryTransactions_Type;
ALTER TABLE dbo.InventoryTransactions ADD CONSTRAINT CK_InventoryTransactions_Type
    CHECK (TransactionType IN (N'RECEIPT', N'ISSUE', N'RESERVE', N'RELEASE', N'CONSUME'));

ALTER TABLE dbo.PaymentTransactions ADD IdempotencyKey nvarchar(100) NULL;
GO
CREATE UNIQUE INDEX UX_PaymentTransactions_IdempotencyKey
    ON dbo.PaymentTransactions(IdempotencyKey)
    WHERE IdempotencyKey IS NOT NULL;
ALTER TABLE dbo.CashShifts ADD CloseReason nvarchar(500) NULL;
ALTER TABLE dbo.CashShifts ADD ReconciledBy uniqueidentifier NULL;
ALTER TABLE dbo.CashShifts ADD ReconciledAt datetime2(3) NULL;
ALTER TABLE dbo.CashShifts ADD ReconciliationReason nvarchar(500) NULL;
GO
ALTER TABLE dbo.CashShifts ADD CONSTRAINT FK_CashShifts_ReconciledBy
    FOREIGN KEY (ReconciledBy) REFERENCES dbo.Users(UserId);

DECLARE @TableName sysname;
DECLARE @PrimaryKeyColumn sysname;
DECLARE @DeletedTableName sysname;
DECLARE @Sql nvarchar(max);
DECLARE table_cursor CURSOR LOCAL FAST_FORWARD FOR
SELECT t.name, c.name
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id AND s.name = N'dbo'
JOIN sys.indexes i ON i.object_id = t.object_id AND i.is_primary_key = 1
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal = 1
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE t.name IN
(
    N'ClinicalServices', N'VisitEmr', N'TreatmentConsents', N'VisitServiceItems',
    N'InventoryReservations', N'InventoryReservationLines', N'SterilizationCycles',
    N'LaboTickets', N'InsuranceClaims', N'Warranties', N'Employees', N'FixedAssets'
);

OPEN table_cursor;
FETCH NEXT FROM table_cursor INTO @TableName, @PrimaryKeyColumn;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @DeletedTableName = @TableName + N'Deleted';
    SET @Sql = N'CREATE TABLE dbo.' + QUOTENAME(@DeletedTableName) + N' (
        ArchiveId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_' + @DeletedTableName + N' PRIMARY KEY,
        OriginalId nvarchar(128) NOT NULL,
        SnapshotJson nvarchar(max) NOT NULL,
        DeletedAt datetime2(3) NOT NULL,
        DeletedBy uniqueidentifier NULL,
        DeleteReason nvarchar(500) NULL,
        CONSTRAINT CK_' + @DeletedTableName + N'_Snapshot CHECK (ISJSON(SnapshotJson) = 1)
    );';
    EXEC sys.sp_executesql @Sql;

    SET @Sql = N'CREATE TRIGGER dbo.' + QUOTENAME(N'TR_' + @TableName + N'_SoftDelete') + N'
    ON dbo.' + QUOTENAME(@TableName) + N'
    INSTEAD OF DELETE
    AS
    BEGIN
        SET NOCOUNT ON;
        DECLARE @DeletedAt datetime2(3) = SYSUTCDATETIME();
        DECLARE @DeletedBy uniqueidentifier = TRY_CONVERT(uniqueidentifier, SESSION_CONTEXT(N''UserId''));
        DECLARE @DeleteReason nvarchar(500) = TRY_CONVERT(nvarchar(500), SESSION_CONTEXT(N''DeleteReason''));
        INSERT INTO dbo.' + QUOTENAME(@DeletedTableName) + N'
            (OriginalId, SnapshotJson, DeletedAt, DeletedBy, DeleteReason)
        SELECT CONVERT(nvarchar(128), d.' + QUOTENAME(@PrimaryKeyColumn) + N'),
               (SELECT snapshot.* FROM deleted snapshot
                WHERE snapshot.' + QUOTENAME(@PrimaryKeyColumn) + N' = d.' + QUOTENAME(@PrimaryKeyColumn) + N'
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
               @DeletedAt, @DeletedBy, @DeleteReason
        FROM deleted d
        WHERE d.IsDeleted = 0;
        UPDATE currentRow
        SET IsDeleted = 1, DeletedAt = @DeletedAt, DeletedBy = @DeletedBy, DeleteReason = @DeleteReason
        FROM dbo.' + QUOTENAME(@TableName) + N' currentRow
        JOIN deleted d ON currentRow.' + QUOTENAME(@PrimaryKeyColumn) + N' = d.' + QUOTENAME(@PrimaryKeyColumn) + N'
        WHERE d.IsDeleted = 0;
    END;';
    EXEC sys.sp_executesql @Sql;
    FETCH NEXT FROM table_cursor INTO @TableName, @PrimaryKeyColumn;
END;
CLOSE table_cursor;
DEALLOCATE table_cursor;
GO

INSERT INTO dbo.ClinicalServices (ServiceCode, ServiceName, DefaultPrice, IsInvasive, CreatedBy)
SELECT seed.ServiceCode, seed.ServiceName, seed.DefaultPrice, seed.IsInvasive, u.UserId
FROM (VALUES
    (N'KHAM-TQ', N'Khám tổng quát', CONVERT(decimal(19,2), 0), CONVERT(bit, 0)),
    (N'LAY-CAO-RANG', N'Lấy cao răng', CONVERT(decimal(19,2), 350000), CONVERT(bit, 0)),
    (N'NHO-RANG', N'Nhổ răng', CONVERT(decimal(19,2), 800000), CONVERT(bit, 1)),
    (N'DIEU-TRI-TUY', N'Điều trị tủy', CONVERT(decimal(19,2), 2500000), CONVERT(bit, 1))
) seed(ServiceCode, ServiceName, DefaultPrice, IsInvasive)
CROSS JOIN (
    SELECT TOP (1) UserId
    FROM dbo.Users
    WHERE IsDeleted = 0
    ORDER BY CASE WHEN Role = N'ADMIN' THEN 0 ELSE 1 END, CreatedAt
) u
WHERE NOT EXISTS (SELECT 1 FROM dbo.ClinicalServices currentService WHERE currentService.ServiceCode = seed.ServiceCode);
GO

COMMIT TRANSACTION;
GO
