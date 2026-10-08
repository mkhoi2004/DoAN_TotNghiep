IF DB_ID(N'DoAnTotNghiep') IS NULL
BEGIN
    CREATE DATABASE [DoAnTotNghiep];
END;
GO

ALTER AUTHORIZATION ON DATABASE::[DoAnTotNghiep] TO [DESKTOP-F5CFA0D\ADMIN];
GO

USE [DoAnTotNghiep];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO

SET XACT_ABORT ON;
BEGIN TRANSACTION;
GO

CREATE SEQUENCE dbo.PatientCodeSequence AS bigint START WITH 1 INCREMENT BY 1;
GO

CREATE TABLE dbo.VisitCounters
(
    CounterDate date NOT NULL CONSTRAINT PK_VisitCounters PRIMARY KEY,
    LastValue int NOT NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_VisitCounters_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_VisitCounters_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT CK_VisitCounters_LastValue CHECK (LastValue BETWEEN 1 AND 9999)
);
GO

CREATE TABLE dbo.Users
(
    UserId uniqueidentifier NOT NULL CONSTRAINT PK_Users PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Username nvarchar(100) NOT NULL,
    PasswordHash nvarchar(100) NOT NULL,
    Role nvarchar(30) NOT NULL,
    IsActive bit NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_Users_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_Users_Username UNIQUE (Username),
    CONSTRAINT CK_Users_Role CHECK (Role IN
        (N'ADMIN', N'RECEPTIONIST', N'DOCTOR', N'ASSISTANT',
         N'ACCOUNTANT', N'CHIEF_ACCOUNTANT', N'INVENTORY_MANAGER'))
);
GO

CREATE TABLE dbo.Patients
(
    PatientId uniqueidentifier NOT NULL CONSTRAINT PK_Patients PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    PatientCode nvarchar(20) NOT NULL,
    FullName nvarchar(200) NOT NULL,
    DateOfBirth date NOT NULL,
    Gender nvarchar(10) NOT NULL,
    Phone nvarchar(20) NOT NULL,
    NationalIdCiphertext varchar(512) NOT NULL,
    NationalIdHash char(64) NOT NULL,
    Address nvarchar(500) NOT NULL,
    AllergyNotes nvarchar(max) NULL,
    MedicalHistory nvarchar(max) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Patients_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_Patients_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_Patients_PatientCode UNIQUE (PatientCode),
    CONSTRAINT UQ_Patients_NationalIdHash UNIQUE (NationalIdHash),
    CONSTRAINT CK_Patients_Gender CHECK (Gender IN (N'Nam', N'Nữ', N'Khác')),
    CONSTRAINT FK_Patients_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.Visits
(
    VisitId uniqueidentifier NOT NULL CONSTRAINT PK_Visits PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    VisitCode nvarchar(30) NOT NULL,
    PatientId uniqueidentifier NOT NULL,
    DoctorId uniqueidentifier NOT NULL,
    CreatedBy uniqueidentifier NOT NULL,
    VisitType nvarchar(30) NOT NULL,
    Status smallint NOT NULL CONSTRAINT DF_Visits_Status DEFAULT 0,
    ChiefComplaint nvarchar(1000) NULL,
    TotalAmount decimal(19,2) NOT NULL CONSTRAINT DF_Visits_Total DEFAULT 0,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Visits_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_Visits_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_Visits_VisitCode UNIQUE (VisitCode),
    CONSTRAINT CK_Visits_Status CHECK (Status IN (-1, 0, 1, 2, 3, 4)),
    CONSTRAINT CK_Visits_VisitType CHECK (VisitType IN (N'NEW', N'FOLLOW_UP_PAID', N'FOLLOW_UP_FREE')),
    CONSTRAINT CK_Visits_Total CHECK (TotalAmount >= 0),
    CONSTRAINT FK_Visits_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(PatientId),
    CONSTRAINT FK_Visits_Doctor FOREIGN KEY (DoctorId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_Visits_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.Products
(
    ProductId uniqueidentifier NOT NULL CONSTRAINT PK_Products PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ProductCode nvarchar(40) NOT NULL,
    ProductName nvarchar(200) NOT NULL,
    Category nvarchar(30) NOT NULL,
    Unit nvarchar(30) NOT NULL,
    MinimumStock decimal(18,3) NOT NULL CONSTRAINT DF_Products_MinimumStock DEFAULT 0,
    IsActive bit NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT 1,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Products_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_Products_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_Products_ProductCode UNIQUE (ProductCode),
    CONSTRAINT CK_Products_Category CHECK (Category IN (N'MEDICINE', N'MEDICAL_SUPPLY', N'CONSUMABLE')),
    CONSTRAINT CK_Products_MinimumStock CHECK (MinimumStock >= 0),
    CONSTRAINT FK_Products_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.Warehouses
(
    WarehouseId uniqueidentifier NOT NULL CONSTRAINT PK_Warehouses PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    WarehouseCode nvarchar(30) NOT NULL,
    WarehouseName nvarchar(150) NOT NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_Warehouses_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_Warehouses_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_Warehouses_Code UNIQUE (WarehouseCode),
    CONSTRAINT FK_Warehouses_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.InventoryLots
(
    LotId uniqueidentifier NOT NULL CONSTRAINT PK_InventoryLots PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ProductId uniqueidentifier NOT NULL,
    WarehouseId uniqueidentifier NOT NULL,
    LotNumber nvarchar(80) NOT NULL,
    SerialNumber nvarchar(100) NULL,
    ExpiresAt date NOT NULL,
    ReceivedAt datetime2(3) NOT NULL CONSTRAINT DF_InventoryLots_ReceivedAt DEFAULT SYSUTCDATETIME(),
    UnitCost decimal(19,4) NOT NULL,
    QuantityOnHand decimal(18,3) NOT NULL,
    QuantityReserved decimal(18,3) NOT NULL CONSTRAINT DF_InventoryLots_Reserved DEFAULT 0,
    QuantityBlocked decimal(18,3) NOT NULL CONSTRAINT DF_InventoryLots_Blocked DEFAULT 0,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_InventoryLots_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_InventoryLots_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT CK_InventoryLots_Cost CHECK (UnitCost >= 0),
    CONSTRAINT CK_InventoryLots_Quantities CHECK
        (QuantityOnHand >= 0 AND QuantityReserved >= 0 AND QuantityBlocked >= 0
         AND QuantityReserved + QuantityBlocked <= QuantityOnHand),
    CONSTRAINT FK_InventoryLots_Product FOREIGN KEY (ProductId) REFERENCES dbo.Products(ProductId),
    CONSTRAINT FK_InventoryLots_Warehouse FOREIGN KEY (WarehouseId) REFERENCES dbo.Warehouses(WarehouseId),
    CONSTRAINT FK_InventoryLots_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE INDEX IX_InventoryLots_Fifo
ON dbo.InventoryLots(ProductId, WarehouseId, ReceivedAt, ExpiresAt)
INCLUDE (QuantityOnHand, QuantityReserved, QuantityBlocked, UnitCost)
WHERE IsDeleted = 0;
GO

CREATE TABLE dbo.InventoryTransactions
(
    InventoryTransactionId uniqueidentifier NOT NULL CONSTRAINT PK_InventoryTransactions PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    LotId uniqueidentifier NOT NULL,
    VisitId uniqueidentifier NULL,
    TransactionType nvarchar(20) NOT NULL,
    Quantity decimal(18,3) NOT NULL,
    UnitCost decimal(19,4) NOT NULL,
    ReferenceCode nvarchar(50) NOT NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_InventoryTransactions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_InventoryTransactions_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT CK_InventoryTransactions_Type CHECK (TransactionType IN (N'RECEIPT', N'ISSUE', N'RESERVE', N'RELEASE')),
    CONSTRAINT CK_InventoryTransactions_Quantity CHECK (Quantity > 0 AND UnitCost >= 0),
    CONSTRAINT FK_InventoryTransactions_Lot FOREIGN KEY (LotId) REFERENCES dbo.InventoryLots(LotId),
    CONSTRAINT FK_InventoryTransactions_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(VisitId),
    CONSTRAINT FK_InventoryTransactions_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.ChartOfAccounts
(
    AccountCode nvarchar(20) NOT NULL CONSTRAINT PK_ChartOfAccounts PRIMARY KEY,
    AccountName nvarchar(200) NOT NULL,
    IsActive bit NOT NULL CONSTRAINT DF_ChartOfAccounts_IsActive DEFAULT 1,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_ChartOfAccounts_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_ChartOfAccounts_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT FK_ChartOfAccounts_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.JournalEntries
(
    JournalEntryId uniqueidentifier NOT NULL CONSTRAINT PK_JournalEntries PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    EntryCode nvarchar(40) NOT NULL,
    Description nvarchar(1000) NOT NULL,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_JournalEntries_Status DEFAULT N'DRAFT',
    CreatedBy uniqueidentifier NOT NULL,
    ApprovedBy uniqueidentifier NULL,
    ApprovedAt datetime2(3) NULL,
    PostedAt datetime2(3) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_JournalEntries_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_JournalEntries_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_JournalEntries_EntryCode UNIQUE (EntryCode),
    CONSTRAINT CK_JournalEntries_Status CHECK (Status IN (N'DRAFT', N'APPROVED', N'POSTED', N'REVERSED')),
    CONSTRAINT FK_JournalEntries_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_JournalEntries_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_JournalEntries_SelfApproval CHECK (ApprovedBy IS NULL OR ApprovedBy <> CreatedBy)
);
GO

CREATE TABLE dbo.JournalLines
(
    JournalLineId uniqueidentifier NOT NULL CONSTRAINT PK_JournalLines PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    JournalEntryId uniqueidentifier NOT NULL,
    AccountCode nvarchar(20) NOT NULL,
    Debit decimal(19,2) NOT NULL CONSTRAINT DF_JournalLines_Debit DEFAULT 0,
    Credit decimal(19,2) NOT NULL CONSTRAINT DF_JournalLines_Credit DEFAULT 0,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_JournalLines_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_JournalLines_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT CK_JournalLines_Amounts CHECK
        (Debit >= 0 AND Credit >= 0 AND NOT (Debit > 0 AND Credit > 0)),
    CONSTRAINT FK_JournalLines_Entry FOREIGN KEY (JournalEntryId) REFERENCES dbo.JournalEntries(JournalEntryId),
    CONSTRAINT FK_JournalLines_Account FOREIGN KEY (AccountCode) REFERENCES dbo.ChartOfAccounts(AccountCode),
    CONSTRAINT FK_JournalLines_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.CashShifts
(
    CashShiftId uniqueidentifier NOT NULL CONSTRAINT PK_CashShifts PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    ShiftCode nvarchar(40) NOT NULL,
    CashierId uniqueidentifier NOT NULL,
    Status nvarchar(20) NOT NULL CONSTRAINT DF_CashShifts_Status DEFAULT N'OPEN',
    OpeningFloat decimal(19,2) NOT NULL,
    CountedCash decimal(19,2) NULL,
    ExpectedCash decimal(19,2) NULL,
    DifferenceAmount decimal(19,2) NULL,
    OpenedAt datetime2(3) NOT NULL CONSTRAINT DF_CashShifts_OpenedAt DEFAULT SYSUTCDATETIME(),
    ClosedAt datetime2(3) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_CashShifts_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_CashShifts_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_CashShifts_ShiftCode UNIQUE (ShiftCode),
    CONSTRAINT CK_CashShifts_Status CHECK (Status IN (N'OPEN', N'PENDING_CLOSE', N'CLOSED', N'RECONCILED')),
    CONSTRAINT CK_CashShifts_OpeningFloat CHECK (OpeningFloat >= 0),
    CONSTRAINT FK_CashShifts_Cashier FOREIGN KEY (CashierId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_CashShifts_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.PaymentTransactions
(
    PaymentTransactionId uniqueidentifier NOT NULL CONSTRAINT PK_PaymentTransactions PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    PaymentCode nvarchar(40) NOT NULL,
    PatientId uniqueidentifier NOT NULL,
    VisitId uniqueidentifier NULL,
    CashShiftId uniqueidentifier NULL,
    Amount decimal(19,2) NOT NULL,
    Method nvarchar(20) NOT NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_PaymentTransactions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NOT NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_PaymentTransactions_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT UQ_PaymentTransactions_Code UNIQUE (PaymentCode),
    CONSTRAINT CK_PaymentTransactions_Amount CHECK (Amount > 0),
    CONSTRAINT CK_PaymentTransactions_Method CHECK (Method IN (N'CASH', N'BANK_TRANSFER', N'CARD')),
    CONSTRAINT FK_PaymentTransactions_Patient FOREIGN KEY (PatientId) REFERENCES dbo.Patients(PatientId),
    CONSTRAINT FK_PaymentTransactions_Visit FOREIGN KEY (VisitId) REFERENCES dbo.Visits(VisitId),
    CONSTRAINT FK_PaymentTransactions_CashShift FOREIGN KEY (CashShiftId) REFERENCES dbo.CashShifts(CashShiftId),
    CONSTRAINT FK_PaymentTransactions_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.AuditLogs
(
    AuditLogId uniqueidentifier NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId uniqueidentifier NULL,
    Action nvarchar(100) NOT NULL,
    EntityName nvarchar(100) NOT NULL,
    EntityId nvarchar(100) NULL,
    OccurredAt datetime2(3) NOT NULL CONSTRAINT DF_AuditLogs_OccurredAt DEFAULT SYSUTCDATETIME(),
    DetailJson nvarchar(max) NULL,
    CreatedAt datetime2(3) NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy uniqueidentifier NULL,
    UpdatedAt datetime2(3) NULL,
    IsDeleted bit NOT NULL CONSTRAINT DF_AuditLogs_IsDeleted DEFAULT 0,
    DeletedAt datetime2(3) NULL,
    DeletedBy uniqueidentifier NULL,
    DeleteReason nvarchar(500) NULL,
    CONSTRAINT FK_AuditLogs_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_AuditLogs_DetailJson CHECK (DetailJson IS NULL OR ISJSON(DetailJson) = 1)
);
GO

INSERT INTO dbo.ChartOfAccounts (AccountCode, AccountName, CreatedBy)
SELECT seed.AccountCode, seed.AccountName, NULL
FROM (VALUES
    (N'111', N'Tiền mặt'),
    (N'112', N'Tiền gửi ngân hàng'),
    (N'131', N'Phải thu khách hàng'),
    (N'1388', N'Phải thu khác'),
    (N'152', N'Nguyên liệu, vật liệu'),
    (N'156', N'Hàng hóa'),
    (N'331', N'Phải trả nhà cung cấp'),
    (N'3388', N'Phải trả khác'),
    (N'511', N'Doanh thu dịch vụ'),
    (N'632', N'Giá vốn hàng bán'),
    (N'641', N'Chi phí bán hàng'),
    (N'642', N'Chi phí quản lý'),
    (N'811', N'Chi phí khác')
) seed(AccountCode, AccountName)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.ChartOfAccounts existingAccount
    WHERE existingAccount.AccountCode = seed.AccountCode
);
GO

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
WHERE t.is_ms_shipped = 0 AND t.name NOT LIKE N'%Deleted';

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

COMMIT TRANSACTION;
GO
