SET NOCOUNT ON;

DECLARE @DoctorId uniqueidentifier = (SELECT TOP 1 [id] FROM [User] WHERE [username] = 'BacSi');
DECLARE @ReceptionistId uniqueidentifier = (SELECT TOP 1 [id] FROM [User] WHERE [username] = 'TiepNhan');
DECLARE @AccountantId uniqueidentifier = (SELECT TOP 1 [id] FROM [User] WHERE [username] = 'Ketoan');
DECLARE @WarehouseId uniqueidentifier = (SELECT TOP 1 [id] FROM [User] WHERE [username] = 'Kho');

IF NOT EXISTS (SELECT 1 FROM [Patient] WHERE [patientCode] = 'BN#000001')
INSERT INTO [Patient] ([id],[patientCode],[fullName],[dateOfBirth],[gender],[phone],[nationalId],[allergies],[isDeleted],[createdAt],[updatedAt])
VALUES (NEWID(),'BN#000001',N'Nguyễn Hà My','1998-04-12','FEMALE','0903218842','079098000001',N'Không ghi nhận',0,GETDATE(),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [Patient] WHERE [patientCode] = 'BN#000002')
INSERT INTO [Patient] ([id],[patientCode],[fullName],[dateOfBirth],[gender],[phone],[nationalId],[allergies],[isDeleted],[createdAt],[updatedAt])
VALUES (NEWID(),'BN#000002',N'Lê Hoàng Nam','1985-11-03','MALE','0984502291','079085000002',N'Dị ứng Penicillin',0,GETDATE(),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [Patient] WHERE [patientCode] = 'BN#000003')
INSERT INTO [Patient] ([id],[patientCode],[fullName],[dateOfBirth],[gender],[phone],[nationalId],[allergies],[isDeleted],[createdAt],[updatedAt])
VALUES (NEWID(),'BN#000003',N'Phạm Thùy Chi','1992-07-25','FEMALE','0936674412','079092000003',N'Không ghi nhận',0,GETDATE(),GETDATE());

DECLARE @Patient1 uniqueidentifier = (SELECT [id] FROM [Patient] WHERE [patientCode] = 'BN#000001');
DECLARE @Patient2 uniqueidentifier = (SELECT [id] FROM [Patient] WHERE [patientCode] = 'BN#000002');
DECLARE @Patient3 uniqueidentifier = (SELECT [id] FROM [Patient] WHERE [patientCode] = 'BN#000003');

IF NOT EXISTS (SELECT 1 FROM [ServiceCatalog] WHERE [serviceCode] = 'DENTAL_IMPLANT')
INSERT INTO [ServiceCatalog] ([id],[serviceCode],[serviceName],[category],[defaultPrice],[requiresConsent],[isActive],[createdAt],[updatedAt]) VALUES (NEWID(),'DENTAL_IMPLANT',N'Cấy Implant',N'Implant',24000000,1,1,GETDATE(),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [ServiceCatalog] WHERE [serviceCode] = 'ROOT_CANAL')
INSERT INTO [ServiceCatalog] ([id],[serviceCode],[serviceName],[category],[defaultPrice],[requiresConsent],[isActive],[createdAt],[updatedAt]) VALUES (NEWID(),'ROOT_CANAL',N'Điều trị tủy',N'Endodontics',2400000,0,1,GETDATE(),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [ServiceCatalog] WHERE [serviceCode] = 'FOLLOW_UP')
INSERT INTO [ServiceCatalog] ([id],[serviceCode],[serviceName],[category],[defaultPrice],[requiresConsent],[isActive],[createdAt],[updatedAt]) VALUES (NEWID(),'FOLLOW_UP',N'Tái khám theo phác đồ',N'Follow-up',0,0,1,GETDATE(),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [PriceListLine] WHERE [priceCode] = 'PL-2026-ROOT-CANAL')
INSERT INTO [PriceListLine] ([id],[priceCode],[serviceCode],[effectiveFrom],[unitPrice],[taxRate],[createdAt]) VALUES (NEWID(),'PL-2026-ROOT-CANAL','ROOT_CANAL','2026-01-01',2400000,0,GETDATE());

IF NOT EXISTS (SELECT 1 FROM [Visit] WHERE [visitCode] = 'STN#20261006/0001')
INSERT INTO [Visit] ([id],[visitCode],[patientId],[doctorId],[type],[status],[grossCharge],[createdAt],[updatedAt]) VALUES (NEWID(),'STN#20261006/0001',@Patient1,@DoctorId,'NEW','WAITING_PAYMENT',2400000,GETDATE(),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [Visit] WHERE [visitCode] = 'STN#20261006/0002')
INSERT INTO [Visit] ([id],[visitCode],[patientId],[doctorId],[type],[status],[grossCharge],[createdAt],[updatedAt]) VALUES (NEWID(),'STN#20261006/0002',@Patient2,@DoctorId,'NEW','IN_PROGRESS',24000000,GETDATE(),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [Visit] WHERE [visitCode] = 'STN#20261006/0003')
INSERT INTO [Visit] ([id],[visitCode],[patientId],[doctorId],[type],[status],[grossCharge],[createdAt],[updatedAt]) VALUES (NEWID(),'STN#20261006/0003',@Patient3,@DoctorId,'ZERO_COST_FOLLOW_UP','COMPLETED',0,GETDATE(),GETDATE());

DECLARE @Visit1 uniqueidentifier = (SELECT [id] FROM [Visit] WHERE [visitCode] = 'STN#20261006/0001');
DECLARE @Visit2 uniqueidentifier = (SELECT [id] FROM [Visit] WHERE [visitCode] = 'STN#20261006/0002');
DECLARE @Visit3 uniqueidentifier = (SELECT [id] FROM [Visit] WHERE [visitCode] = 'STN#20261006/0003');

IF NOT EXISTS (SELECT 1 FROM [EmrRecord] WHERE [visitId] = @Visit1)
INSERT INTO [EmrRecord] ([id],[visitId],[clinicalNote],[lockedAt],[createdAt],[updatedAt]) VALUES (NEWID(),@Visit1,N'Điều trị tủy răng 36. Sinh hiệu ổn định.',GETDATE(),GETDATE(),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [EmrRecord] WHERE [visitId] = @Visit2)
INSERT INTO [EmrRecord] ([id],[visitId],[clinicalNote],[createdAt],[updatedAt]) VALUES (NEWID(),@Visit2,N'Tư vấn kế hoạch cấy Implant vùng răng 26.',GETDATE(),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [EmrRecord] WHERE [visitId] = @Visit3)
INSERT INTO [EmrRecord] ([id],[visitId],[clinicalNote],[lockedAt],[createdAt],[updatedAt]) VALUES (NEWID(),@Visit3,N'Tái khám sau điều trị, không phát sinh chi phí.',GETDATE(),GETDATE(),GETDATE());

DECLARE @Emr1 uniqueidentifier = (SELECT [id] FROM [EmrRecord] WHERE [visitId] = @Visit1);
DECLARE @Emr2 uniqueidentifier = (SELECT [id] FROM [EmrRecord] WHERE [visitId] = @Visit2);
DECLARE @Emr3 uniqueidentifier = (SELECT [id] FROM [EmrRecord] WHERE [visitId] = @Visit3);
IF NOT EXISTS (SELECT 1 FROM [TreatmentLine] WHERE [emrId] = @Emr1)
INSERT INTO [TreatmentLine] ([id],[emrId],[serviceCode],[serviceName],[unitPrice],[quantity],[requiresConsent],[createdAt]) VALUES (NEWID(),@Emr1,'ROOT_CANAL',N'Điều trị tủy răng 36',2400000,1,0,GETDATE());
IF NOT EXISTS (SELECT 1 FROM [TreatmentLine] WHERE [emrId] = @Emr2)
INSERT INTO [TreatmentLine] ([id],[emrId],[serviceCode],[serviceName],[unitPrice],[quantity],[requiresConsent],[createdAt]) VALUES (NEWID(),@Emr2,'DENTAL_IMPLANT',N'Cấy Implant răng 26',24000000,1,1,GETDATE());
IF NOT EXISTS (SELECT 1 FROM [TreatmentLine] WHERE [emrId] = @Emr3)
INSERT INTO [TreatmentLine] ([id],[emrId],[serviceCode],[serviceName],[unitPrice],[quantity],[requiresConsent],[createdAt]) VALUES (NEWID(),@Emr3,'FOLLOW_UP',N'Tái khám theo phác đồ',0,1,0,GETDATE());
IF NOT EXISTS (SELECT 1 FROM [Consent] WHERE [consentCode] = 'CST#20261006/0001')
INSERT INTO [Consent] ([id],[consentCode],[emrId],[serviceCode],[status],[signedAt],[signedDocumentUrl],[createdAt]) VALUES (NEWID(),'CST#20261006/0001',@Emr2,'DENTAL_IMPLANT','SIGNED',GETDATE(),N'/documents/consent/CST-20261006-0001.pdf',GETDATE());
IF NOT EXISTS (SELECT 1 FROM [Settlement] WHERE [settlementCode] = 'SET#20261006-0001')
INSERT INTO [Settlement] ([id],[settlementCode],[emrId],[idempotencyKey],[grossCharge],[createdAt]) VALUES (NEWID(),'SET#20261006-0001',@Emr1,'idem-settlement-0001',2400000,GETDATE());

IF NOT EXISTS (SELECT 1 FROM [CashShift] WHERE [shiftCode] = 'SHIFT#20261006/001')
INSERT INTO [CashShift] ([id],[shiftCode],[cashierId],[status],[openingFloat],[cashCollected],[cashPaidOut],[openedAt]) VALUES (NEWID(),'SHIFT#20261006/001',(SELECT [id] FROM [User] WHERE [username]='TiepNhan'),'OPEN',1000000,2400000,0,GETDATE());
DECLARE @Shift uniqueidentifier = (SELECT [id] FROM [CashShift] WHERE [shiftCode] = 'SHIFT#20261006/001');
IF NOT EXISTS (SELECT 1 FROM [Payment] WHERE [transactionCode] = 'PAY#20261006/0001')
INSERT INTO [Payment] ([id],[transactionCode],[idempotencyKey],[visitId],[cashShiftId],[createdById],[method],[amount],[createdAt]) VALUES (NEWID(),'PAY#20261006/0001','idem-payment-0001',@Visit1,@Shift,(SELECT [id] FROM [User] WHERE [username]='TiepNhan'),'CASH',2400000,GETDATE());

IF NOT EXISTS (SELECT 1 FROM [InventoryItem] WHERE [itemCode] = 'MED-024')
INSERT INTO [InventoryItem] ([id],[itemCode],[name],[unit],[requiresLot],[createdAt],[updatedAt]) VALUES (NEWID(),'MED-024',N'Augmentin 1g',N'tablet',1,GETDATE(),GETDATE());
DECLARE @Item uniqueidentifier = (SELECT [id] FROM [InventoryItem] WHERE [itemCode] = 'MED-024');
IF NOT EXISTS (SELECT 1 FROM [StockLot] WHERE [itemId] = @Item AND [lotCode] = 'AUG2026-04')
INSERT INTO [StockLot] ([id],[lotCode],[itemId],[quantityOnHand],[quantityReserved],[unitCost],[expiryDate],[status],[createdAt]) VALUES (NEWID(),'AUG2026-04',@Item,50,6,22000,'2026-10-18','RESERVED',GETDATE());
IF NOT EXISTS (SELECT 1 FROM [StockReservation] WHERE [reservationCode] = 'RES#20261006/0001')
INSERT INTO [StockReservation] ([id],[reservationCode],[visitId],[itemId],[lotId],[quantity],[status],[createdAt]) VALUES (NEWID(),'RES#20261006/0001',@Visit1,@Item,(SELECT [id] FROM [StockLot] WHERE [itemId]=@Item AND [lotCode]='AUG2026-04'),6,'RESERVED',GETDATE());

IF NOT EXISTS (SELECT 1 FROM [SterilizationCycle] WHERE [cycleCode] = 'STER#20261006/001')
INSERT INTO [SterilizationCycle] ([id],[cycleCode],[machineName],[temperatureC],[pressureBar],[durationMinutes],[resultStatus],[operatorId],[startedAt],[completedAt],[createdAt]) VALUES (NEWID(),'STER#20261006/001',N'Autoclave A',134,2.1,45,'PASSED',(SELECT [id] FROM [User] WHERE [username]='PhuTa'),DATEADD(MINUTE,-60,GETDATE()),DATEADD(MINUTE,-15,GETDATE()),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [InstrumentPack] WHERE [packCode] = 'PACK#20261006/001')
INSERT INTO [InstrumentPack] ([id],[packCode],[packName],[sterilizationCycleId],[sterilizedAt],[expiryAt],[status],[createdAt]) VALUES (NEWID(),'PACK#20261006/001',N'Bộ phẫu thuật Implant',(SELECT [id] FROM [SterilizationCycle] WHERE [cycleCode]='STER#20261006/001'),DATEADD(MINUTE,-15,GETDATE()),DATEADD(DAY,30,GETDATE()),'STERILE',GETDATE());

IF NOT EXISTS (SELECT 1 FROM [DentalLabTicket] WHERE [ticketCode] = 'LB#20261006/001')
INSERT INTO [DentalLabTicket] ([id],[ticketCode],[visitId],[patientId],[labName],[restorationType],[status],[sentAt],[dueAt],[createdAt]) VALUES (NEWID(),'LB#20261006/001',@Visit2,@Patient2,N'Bright Dental Lab',N'Mão sứ Zirconia','IN_PROGRESS',GETDATE(),DATEADD(DAY,7,GETDATE()),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [LabReworkCycle] WHERE [reworkCode] = 'REWORK#20261006/001')
INSERT INTO [LabReworkCycle] ([id],[reworkCode],[labTicketId],[reason],[responsibility],[charge],[status],[createdAt]) VALUES (NEWID(),'REWORK#20261006/001',(SELECT [id] FROM [DentalLabTicket] WHERE [ticketCode]='LB#20261006/001'),N'Sai màu lần thử đầu','LAB',0,'OPEN',GETDATE());

IF NOT EXISTS (SELECT 1 FROM [InsuranceClaim] WHERE [claimCode] = 'CLM#20261006/001')
INSERT INTO [InsuranceClaim] ([id],[claimCode],[visitId],[patientId],[payerName],[status],[submittedAt],[approvedAmount],[patientAmount],[createdAt]) VALUES (NEWID(),'CLM#20261006/001',@Visit1,@Patient1,N'Bao Viet','SUBMITTED',GETDATE(),1800000,600000,GETDATE());
IF NOT EXISTS (SELECT 1 FROM [Deposit] WHERE [depositCode] = 'DEP#20261006/001')
INSERT INTO [Deposit] ([id],[depositCode],[patientId],[visitId],[amount],[appliedAmount],[status],[createdAt]) VALUES (NEWID(),'DEP#20261006/001',@Patient2,@Visit2,5000000,0,'AVAILABLE',GETDATE());

IF NOT EXISTS (SELECT 1 FROM [AccountingVoucher] WHERE [voucherCode] = 'PT#20261006/0001')
INSERT INTO [AccountingVoucher] ([id],[voucherCode],[voucherType],[sourceType],[sourceId],[amount],[status],[createdById],[createdAt]) VALUES (NEWID(),'PT#20261006/0001','RECEIPT','PAYMENT','PAY#20261006/0001',2400000,'APPROVED',@ReceptionistId,GETDATE());
IF NOT EXISTS (SELECT 1 FROM [JournalEntry] WHERE [entryCode] = 'JV#20261006/0001')
INSERT INTO [JournalEntry] ([id],[entryCode],[sourceType],[sourceId],[status],[totalDebit],[totalCredit],[createdById],[createdAt]) VALUES (NEWID(),'JV#20261006/0001','PAYMENT','PAY#20261006/0001','POSTED',2400000,2400000,@AccountantId,GETDATE());
DECLARE @Journal uniqueidentifier = (SELECT [id] FROM [JournalEntry] WHERE [entryCode]='JV#20261006/0001');
IF NOT EXISTS (SELECT 1 FROM [JournalLine] WHERE [journalEntryId]=@Journal AND [accountCode]='1111')
INSERT INTO [JournalLine] ([id],[journalEntryId],[accountCode],[description],[debit],[credit]) VALUES (NEWID(),@Journal,'1111',N'Thu tiền dịch vụ',2400000,0);
IF NOT EXISTS (SELECT 1 FROM [JournalLine] WHERE [journalEntryId]=@Journal AND [accountCode]='5111')
INSERT INTO [JournalLine] ([id],[journalEntryId],[accountCode],[description],[debit],[credit]) VALUES (NEWID(),@Journal,'5111',N'Doanh thu dịch vụ',0,2400000);

IF NOT EXISTS (SELECT 1 FROM [Warranty] WHERE [warrantyCode] = 'WAR#20261006/001')
INSERT INTO [Warranty] ([id],[warrantyCode],[patientId],[visitId],[serviceCode],[status],[startDate],[endDate],[createdAt]) VALUES (NEWID(),'WAR#20261006/001',@Patient3,@Visit3,'ROOT_CANAL','ACTIVE',GETDATE(),DATEADD(MONTH,36,GETDATE()),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [DiscountApproval] WHERE [approvalCode] = 'DAR#20261006/001')
INSERT INTO [DiscountApproval] ([id],[approvalCode],[visitId],[requestedById],[approvedById],[percentage],[amount],[status],[reason],[createdAt],[approvedAt]) VALUES (NEWID(),'DAR#20261006/001',@Visit2,@DoctorId,(SELECT [id] FROM [User] WHERE [username]='Admin'),10,2400000,'APPROVED',N'Chương trình khách hàng thân thiết',GETDATE(),GETDATE());
IF NOT EXISTS (SELECT 1 FROM [Addendum] WHERE [addendumCode] = 'ADD#20261006/001')
INSERT INTO [Addendum] ([id],[addendumCode],[emrId],[reason],[content],[createdById],[createdAt]) VALUES (NEWID(),'ADD#20261006/001',@Emr1,N'Bổ sung ghi chú sau khám',N'Bệnh nhân được dặn tái khám sau 7 ngày.',@DoctorId,GETDATE());
IF NOT EXISTS (SELECT 1 FROM [CommissionAdjustment] WHERE [adjustmentCode] = 'CADJ#20261006/001')
INSERT INTO [CommissionAdjustment] ([id],[adjustmentCode],[visitId],[doctorId],[amount],[reason],[createdAt]) VALUES (NEWID(),'CADJ#20261006/001',@Visit1,@DoctorId,120000,N'Điều chỉnh hoa hồng theo tiền thực thu',GETDATE());
IF NOT EXISTS (SELECT 1 FROM [Prescription] WHERE [prescriptionCode] = 'RX#20261006/001')
INSERT INTO [Prescription] ([id],[prescriptionCode],[visitId],[patientId],[status],[issuedAt]) VALUES (NEWID(),'RX#20261006/001',@Visit1,@Patient1,'ISSUED',GETDATE());
IF NOT EXISTS (SELECT 1 FROM [LabOrder] WHERE [orderCode] = 'CLS#20261006/001')
INSERT INTO [LabOrder] ([id],[orderCode],[visitId],[patientId],[testName],[status],[orderedAt]) VALUES (NEWID(),'CLS#20261006/001',@Visit2,@Patient2,N'Panorama X-ray','COMPLETED',GETDATE());
IF NOT EXISTS (SELECT 1 FROM [AuditLog] WHERE [logCode] = 'AUD#20261006/001')
INSERT INTO [AuditLog] ([id],[logCode],[actorId],[action],[entityName],[entityId],[metadata],[createdAt]) VALUES (NEWID(),'AUD#20261006/001',@ReceptionistId,'CREATE','Patient',CONVERT(nvarchar(36),@Patient1),N'{"source":"mock-data-seed"}',GETDATE());
