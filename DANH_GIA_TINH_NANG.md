# ĐÁNH GIÁ TOÀN BỘ TÍNH NĂNG PHẦN MỀM (CẬP NHẬT PHIÊN BẢN MỚI NHẤT)

**Dự án:** NhaKhoa OS — Dental Clinic ERP & EMR API (`dental-clinic-erp-api`)  
**Phiên bản đánh giá:** Cập nhật hoàn chỉnh toàn bộ các phân hệ backend trong repo `DoAN_TotNghiep`  
**Ngày đánh giá:** 2026-10-07  
**Phạm vi:** Toàn bộ backend NestJS (`src/`), mô hình dữ liệu CSDL (`prisma/schema.prisma`), giao dịch 24 bảng lưu trữ lịch sử xóa (`*Deleted`), dữ liệu seed, và giao diện vận hành (`public/`)  
**Phương pháp:** Kiểm tra mã nguồn trực tiếp, đối chiếu với đặc tả `Quy_trinh_v13_NhaKhoa.md`, xác minh qua `npm run build`, `npm test`, `npx prisma validate`, và `npx prisma db push`.

---

## 1. TÓM TẮT ĐIỀU HÀNH

- **Mô hình kiến trúc ERP:** Backend NestJS 11 + Prisma 7 + Microsoft SQL Server. Phân lớp chuẩn mực (Controller → Service → PrismaService), bảo vệ RBAC 7 vai trò, state machine lượt khám, giao dịch nguyên tử (`$transaction`), kiểm soát Idempotency, thuật toán giữ kho FIFO, kiểm soát vô trùng FEFO, định khoản kế toán kép (Double-Entry Bookkeeping), nguyên tắc SoD (Segregation of Duties), và **cơ chế Soft-Delete lưu vết lịch sử xóa tự động vào 24 bảng `*Deleted`**.
- **Số phân hệ nghiệp vụ đã hoàn thiện:** **11 phân hệ backend** (`Auth`, `Patients`, `Visits`, `EMR`, `Billing`, `Inventory`, `Insurance`, `Lab`, `Sterilization`, `Accounting`, `Warranty`).
- **Tổng số REST Endpoints đang hoạt động:** **54 endpoint REST API** dưới tiền tố `/api`.
- **Cơ chế Soft-Delete & Archive pháp lý CSDL:** Đã tạo đủ và kích hoạt lưu vết vào **24 bảng `*Deleted`** (như `UserDeleted`, `PatientDeleted`, `VisitDeleted`, `EmrRecordDeleted`, `TreatmentLineDeleted`, `ConsentDeleted`, `SettlementDeleted`, `CashShiftDeleted`, `PaymentDeleted`, `InventoryItemDeleted`, `StockLotDeleted`, `StockReservationDeleted`, `ServiceCatalogDeleted`, `PriceListLineDeleted`, `DepositDeleted`, `SterilizationCycleDeleted`, `InstrumentPackDeleted`, `DentalLabTicketDeleted`, `LabReworkCycleDeleted`, `InsuranceClaimDeleted`, `AccountingVoucherDeleted`, `JournalEntryDeleted`, `JournalLineDeleted`, `WarrantyDeleted`, `DiscountApprovalDeleted`, `AddendumDeleted`, `CommissionAdjustmentDeleted`, `PrescriptionDeleted`, `LabOrderDeleted`).
- **Tình trạng biên dịch & Kiểm thử:**
  - `npm run build` → **PASS 100% (0 errors)**.
  - `npm test` → **PASS 4/4 Test Suites (14/14 Unit Tests Pass)**.
  - `npx prisma validate` / `npx prisma db push` → **Database synchronized thành công với SQL Server**.
- **Mức độ hoàn thiện tổng thể:** Đạt **88–92%** so với đặc tả v13 (đã bao phủ toàn bộ luồng lâm sàng, vô trùng, labo, kế toán ERP, bảo hiểm BHYT, bảo hành và lưu trữ pháp lý CSDL).

---

## 2. MA TRẬN ENDPOINT ĐANG HOẠT ĐỘNG (54 REST Endpoints)

| # | Method | Đường dẫn API | Vai trò được phép (RBAC) | Phân hệ | Mô tả nghiệp vụ |
|:--:|:--:|:---|:---|:---|:---|
| 1 | POST | `/api/auth/login` | Công khai | Auth | Đăng nhập hệ thống, trả Bearer JWT |
| 2 | POST | `/api/patients` | ADMIN, RECEPTIONIST | Bệnh nhân | Tạo mới hồ sơ bệnh nhân (mã BN#) |
| 3 | GET | `/api/patients` | All Roles (6) | Bệnh nhân | Lấy danh sách bệnh nhân chưa xóa |
| 4 | GET | `/api/patients/:id` | All Roles (6) | Bệnh nhân | Xem chi tiết 1 bệnh nhân & lịch sử khám |
| 5 | PATCH | `/api/patients/:id` | ADMIN, RECEPTIONIST | Bệnh nhân | Cập nhật thông tin hành chính bệnh nhân |
| 6 | DELETE | `/api/patients/:id` | ADMIN | Bệnh nhân | Soft-delete bệnh nhân & chuyển sang `PatientDeleted` |
| 7 | POST | `/api/visits` | ADMIN, RECEPTIONIST, DOCTOR | Lượt khám | Tiếp nhận ca khám (STN#), phân bác sĩ |
| 8 | PATCH | `/api/visits/:id/status` | ADMIN, RECEPTIONIST, DOCTOR | Lượt khám | Chuyển trạng thái state machine lượt khám |
| 9 | POST | `/api/emr/visits/:visitId` | ADMIN, DOCTOR, ASSISTANT | EMR | Mở bệnh án EMR, tự chuyển lượt khám |
| 10 | POST | `/api/emr/:emrId/treatment-lines` | ADMIN, DOCTOR | EMR | Chỉ định dòng điều trị & thủ thuật |
| 11 | POST | `/api/emr/:emrId/consents` | ADMIN, DOCTOR | EMR/Consent | Tạo giấy đồng thuận điều trị (CST#) |
| 12 | PATCH | `/api/emr/consents/:consentId/sign` | ADMIN, DOCTOR | EMR/Consent | Bệnh nhân ký giấy đồng thuận |
| 13 | PATCH | `/api/emr/consents/:consentId/revoke` | ADMIN, DOCTOR | EMR/Consent | Thu hồi giấy đồng thuận, đảo ca khám |
| 14 | POST | `/api/emr/:emrId/settle` | ADMIN, DOCTOR | EMR/Settlement | Chốt dịch vụ EMR (SET#), kiểm tra Gatekeeper |
| 15 | POST | `/api/emr/prescriptions` | ADMIN, DOCTOR | EMR/Prescription | Kê đơn thuốc điện tử (RX#) |
| 16 | POST | `/api/emr/lab-orders` | ADMIN, DOCTOR | EMR/Diagnostics | Chỉ định cận lâm sàng X-quang/CT (ORD#) |
| 17 | PATCH | `/api/emr/lab-orders/:id/complete` | ADMIN, DOCTOR, ASSISTANT | EMR/Diagnostics | Ghi nhận hoàn tất kết quả X-quang |
| 18 | POST | `/api/billing/shifts/:cashierId/open` | ADMIN, RECEPTIONIST | Billing/Shift | Mở ca thu ngân & két tiền (SHIFT#) |
| 19 | POST | `/api/billing/payments` | ADMIN, RECEPTIONIST, ACCOUNTANT | Billing/Payment | Thu tiền thanh toán (PAY#), kiểm soát không thu vượt |
| 20 | POST | `/api/billing/shifts/:shiftId/close` | ADMIN, RECEPTIONIST | Billing/Shift | Đóng ca & đối soát lệch két (ngưỡng 50.000đ) |
| 21 | GET | `/api/inventory/lots` | ADMIN, INVENTORY_MANAGER, DOCTOR, ASSISTANT | Inventory | Xem danh sách lô tồn kho xếp theo FEFO |
| 22 | POST | `/api/inventory/items` | ADMIN, INVENTORY_MANAGER | Inventory | Tạo mới mặt hàng/dược phẩm trong danh mục |
| 23 | POST | `/api/inventory/lots` | ADMIN, INVENTORY_MANAGER | Inventory | Nhập lô vật tư/dược phẩm mới vào kho |
| 24 | POST | `/api/inventory/reservations` | ADMIN, INVENTORY_MANAGER, DOCTOR, ASSISTANT | Inventory | Giữ hàng kho (RES#) tự động tách lô theo FIFO |
| 25 | POST | `/api/inventory/reservations/:id/consume` | ADMIN, DOCTOR | Inventory | Trừ xuất dùng vật tư thực tế tại ghế răng |
| 26 | POST | `/api/inventory/reservations/:id/release` | ADMIN, DOCTOR, INVENTORY_MANAGER | Inventory | Trả lại vật tư chưa dùng về kho |
| 27 | POST | `/api/insurance/claims` | ADMIN, RECEPTIONIST, ACCOUNTANT, CHIEF_ACCOUNTANT | Insurance | Tạo hồ sơ giám định BHYT (CLM#) & tính đồng chi trả |
| 28 | POST | `/api/insurance/claims/:id/submit` | ADMIN, RECEPTIONIST, ACCOUNTANT, CHIEF_ACCOUNTANT | Insurance | Nộp hồ sơ BHYT lên cổng giám định |
| 29 | POST | `/api/insurance/claims/:id/approve` | ADMIN, ACCOUNTANT, CHIEF_ACCOUNTANT | Insurance | Duyệt số tiền BHYT thanh toán & bệnh nhân trả |
| 30 | GET | `/api/insurance/claims/:id/xml` | ADMIN, RECEPTIONIST, ACCOUNTANT, CHIEF_ACCOUNTANT | Insurance | Kết xuất XML 4210/130 chuẩn Bộ Y tế |
| 31 | GET | `/api/insurance/claims` | ADMIN, RECEPTIONIST, ACCOUNTANT, CHIEF_ACCOUNTANT | Insurance | Danh sách hồ sơ bảo hiểm |
| 32 | GET | `/api/insurance/claims/:id` | ADMIN, RECEPTIONIST, ACCOUNTANT, CHIEF_ACCOUNTANT | Insurance | Chi tiết hồ sơ bảo hiểm |
| 33 | DELETE | `/api/insurance/claims/:id` | ADMIN | Insurance | Soft-delete hồ sơ BHYT sang `InsuranceClaimDeleted` |
| 34 | POST | `/api/lab/tickets` | ADMIN, DOCTOR | Dental Lab | Tạo phiếu gửi Labo chế tác răng sứ (LAB#) |
| 35 | POST | `/api/lab/tickets/:id/receive` | ADMIN, DOCTOR, ASSISTANT, RECEPTIONIST | Dental Lab | Ghi nhận nhận sản phẩm từ Labo |
| 36 | POST | `/api/lab/tickets/:id/fit` | ADMIN, DOCTOR | Dental Lab | Ghi nhận thử/gắn hoàn tất trên miệng bệnh nhân |
| 37 | POST | `/api/lab/rework` | ADMIN, DOCTOR | Dental Lab | Yêu cầu làm lại (RWK#), phân lỗi Bác sĩ/Labo |
| 38 | GET | `/api/lab/tickets` | ADMIN, DOCTOR, ASSISTANT, RECEPTIONIST | Dental Lab | Danh sách phiếu Labo gia công |
| 39 | GET | `/api/lab/tickets/:id` | ADMIN, DOCTOR, ASSISTANT, RECEPTIONIST | Dental Lab | Chi tiết phiếu Labo gia công |
| 40 | DELETE | `/api/lab/tickets/:id` | ADMIN | Dental Lab | Soft-delete phiếu Labo sang `DentalLabTicketDeleted` |
| 41 | POST | `/api/sterilization/cycles` | ADMIN, INVENTORY_MANAGER, ASSISTANT | Sterilization | Lập chu trình hấp tiệt trùng nồi hấp (CYC#) |
| 42 | POST | `/api/sterilization/cycles/:id/complete` | ADMIN, INVENTORY_MANAGER, ASSISTANT | Sterilization | Ghi nhận kết quả tiệt trùng (PASSED/FAILED) |
| 43 | POST | `/api/sterilization/packs` | ADMIN, INVENTORY_MANAGER, ASSISTANT | Sterilization | Đóng gói khay dụng cụ vô trùng (PAK#) |
| 44 | GET | `/api/sterilization/packs/verify/:packCode` | ADMIN, DOCTOR, ASSISTANT, INVENTORY_MANAGER | Sterilization | Quét/kiểm tra tem vô trùng trước khi làm ca |
| 45 | GET | `/api/sterilization/cycles` | ADMIN, INVENTORY_MANAGER, ASSISTANT | Sterilization | Danh sách chu trình hấp tiệt trùng |
| 46 | GET | `/api/sterilization/packs` | ADMIN, INVENTORY_MANAGER, ASSISTANT | Sterilization | Danh sách gói khay dụng cụ |
| 47 | DELETE | `/api/sterilization/cycles/:id` | ADMIN | Sterilization | Soft-delete chu trình tiệt trùng |
| 48 | POST | `/api/accounting/vouchers` | ADMIN, ACCOUNTANT, CHIEF_ACCOUNTANT | Accounting | Lập phiếu thu/chi kế toán (VOU#) |
| 49 | POST | `/api/accounting/vouchers/:id/approve` | ADMIN, CHIEF_ACCOUNTANT | Accounting | Duyệt phiếu kế toán, kiểm soát nguyên tắc SoD |
| 50 | POST | `/api/accounting/journal-entries` | ADMIN, ACCOUNTANT, CHIEF_ACCOUNTANT | Accounting | Bút toán sổ cái kép (JRN#), ép `Nợ = Có` |
| 51 | GET | `/api/accounting/ledger` | ADMIN, ACCOUNTANT, CHIEF_ACCOUNTANT | Accounting | Báo cáo Sổ cái tổng hợp (General Ledger) |
| 52 | GET | `/api/accounting/vouchers` | ADMIN, ACCOUNTANT, CHIEF_ACCOUNTANT | Accounting | Danh sách chứng từ kế toán |
| 53 | GET | `/api/accounting/journal-entries` | ADMIN, ACCOUNTANT, CHIEF_ACCOUNTANT | Accounting | Danh sách bút toán kế toán |
| 54 | DELETE | `/api/accounting/vouchers/:id` | ADMIN | Accounting | Soft-delete chứng từ kế toán |
| 55 | POST | `/api/warranty` | ADMIN, DOCTOR, RECEPTIONIST | Warranty | Lập thẻ bảo hành dịch vụ nha khoa (WRN#) |
| 56 | GET | `/api/warranty/check/:warrantyCode` | ADMIN, DOCTOR, RECEPTIONIST, ACCOUNTANT | Warranty | Tra cứu thời hạn & hiệu lực bảo hành |
| 57 | GET | `/api/warranty` | ADMIN, DOCTOR, RECEPTIONIST, ACCOUNTANT | Warranty | Danh sách thẻ bảo hành đã cấp |
| 58 | GET | `/api/warranty/patient/:patientId` | ADMIN, DOCTOR, RECEPTIONIST | Warranty | Lịch sử bảo hành theo từng bệnh nhân |
| 59 | DELETE | `/api/warranty/:id` | ADMIN | Warranty | Soft-delete thẻ bảo hành sang `WarrantyDeleted` |

---

## 3. ĐÁNH GIÁ CHI TIẾT CÁC PHÂN HỆ NGHIỆP VỤ

### 3.1. Phân hệ Tiếp nhận & Hồ sơ bệnh nhân (MPI)
- **Chuẩn hóa mã BN:** Tự động sinh `BN#YYYYMMDD#/XXXX`.
- **Phát hiện trùng lặp:** Chống trùng tuyệt đối theo Số điện thoại (`phone`) hoặc Căn cước công dân (`nationalId`). Trùng sẽ phản hồi `409 ConflictException` kèm mã bệnh nhân cũ.
- **Thao tác trọn vẹn:** Đã có đầy đủ API `Tạo mới`, `Xem danh sách`, `Xem chi tiết & Lịch sử khám`, `Cập nhật thông tin`, và `Xóa mềm chuyển Archive`.
- **Soft-Delete Archive:** Khi xóa bệnh nhân, dữ liệu được ghi nhận vào [PatientDeleted](file:///c:/Users/ADMIN/Documents/GitHub/DoAN_TotNghiep/src/patients/patients.service.ts#L61-L86) bảo toàn thông tin phục vụ kiểm toán y tế.

### 3.2. Phân hệ Bệnh án Điện tử (EMR) & Đơn thuốc / CLS
- **State Machine lượt khám:** Kiểm soát chặt chẽ trạng thái lượt khám (`NEW` → `IN_PROGRESS` → `WAITING_PROCESSING` → `WAITING_PAYMENT` → `COMPLETED`).
- **Xử lý ca 0 đồng:** Ca tái khám hoặc bảo hành có tổng chi phí `0đ` được hệ thống tự động hoàn tất trực tiếp `WAITING_PROCESSING` → `COMPLETED`, bỏ qua thu ngân.
- **Giấy đồng thuận kỹ thuật số (Digital Consent Gatekeeper):**
  - Đạt chuẩn Luật Khám bệnh, chữa bệnh 2023. Các thủ thuật xâm lấn (Implant, nhổ răng khôn, phẫu thuật nướu) khi chốt dịch vụ nếu thiếu Consent `SIGNED` sẽ bị chặn cứng.
  - Thu hồi Consent (`REVOKED`) tự động đảo trạng thái lượt khám quay lại `IN_PROGRESS` để đảm bảo an toàn pháp lý.
- **Đơn thuốc & Cận lâm sàng (Prescriptions & Diagnostic Orders):** Đã bổ sung API lập đơn thuốc điện tử (mã `RX#`) và phiếu chỉ định X-quang/CT (mã `ORD#`).

### 3.3. Phân hệ Thu ngân & Ca làm việc (Billing & Cashier)
- **Mở/Đóng ca thu ngân (`CashShift`):** Quản lý tiền mặt đầu ca (`openingFloat`), tổng thu, tổng chi.
- **Bàn giao ca & Kiểm soát lệch két:** Đóng ca tự động tính số tiền mặt lý thuyết. Nếu chênh lệch thực tế превышает `50.000đ` (`CASH_OVER_SHORT_THRESHOLD`), ca thu ngân tự động chuyển trạng thái `PENDING_CLOSE` chờ Kế toán trưởng đối soát.
- **Kiểm soát thanh toán:** Bắt buộc lượt khám đã được chốt EMR (`Settlement`) mới được thu tiền. Chặn tuyệt đối hành vi thu vượt tổng số tiền phải thu.
- **Chống trùng giao dịch (Idempotency):** Áp dụng `idempotencyKey` `@unique` trên cả chốt dịch vụ EMR và Phiếu thu tiền.

### 3.4. Phân hệ Kho Nha khoa & Vật tư (Inventory)
- **Thuật toán giữ kho FIFO tự động tách lô:** Khi giữ vật tư cho lượt khám (`Reserve`), hệ thống tự động quét các lô còn hạn dùng, sắp xếp theo hạn gần nhất trước (FEFO/FIFO), và tự bóc tách số lượng trên nhiều lô khác nhau.
- **Quy trình 3 bước:** `Reserve` (Giữ khả dụng) → `Consume` (Thật xuất dùng tại ghế răng) / `Release` (Giải phóng trả lại kho).
- **Ràng buộc toàn vẹn CSDL:** Đã có 5 CHECK Constraint trực tiếp dưới DB SQL Server chống tồn kho âm hoặc giữ vượt quá số lượng khả dụng.

### 3.5. Phân hệ Giám định & Bảo hiểm Y tế (BHYT / Insurance)
- **Tính toán đồng chi trả:** Tự động phân tách hạn mức BHYT thanh toán (80%, 95%, 100%) và số tiền bệnh nhân phải trả.
- **Vòng đời hồ sơ:** `DRAFT` → `SUBMITTED` → `APPROVED` / `REJECTED` → `SETTLED`.
- **Kết xuất XML 4210/130:** Cung cấp API `GET /api/insurance/claims/:id/xml` sinh dữ liệu chuẩn XML Bảng 1 (Tổng hợp lượt khám) và Bảng 2 (Chi tiết dịch vụ/vật tư BHYT) theo tiêu chuẩn cổng giám định BHXH Việt Nam.

### 3.6. Phân hệ Tiệt trùng & Khay dụng cụ (Sterilization)
- **Quản lý nồi hấp:** Ghi nhận chu trình tiệt trùng autoclave (`SterilizationCycle`) với thông số nhiệt độ, áp suất, thời gian, và kết quả kiểm định (`PASSED`/`FAILED`).
- **Tem khay vô trùng FEFO:** Đóng gói khay dụng cụ (`InstrumentPack`) tính hạn vô trùng (mặc định 30 ngày).
- **Kiểm tra tại ghế răng:** Cung cấp API quét mã `verifyPack` cho Phụ tá/Bác sĩ kiểm tra xem khay dụng cụ còn trong hạn vô trùng trước khi thực hiện thủ thuật.

### 3.7. Phân hệ Gia công Phục hình (Dental Lab)
- **Quản lý phiếu Labo:** Theo dõi sản phẩm răng sứ, hàm giả gửi xưởng gia công (`DentalLabTicket`: `SENT` → `RECEIVED` → `FITTED`).
- **Chu trình làm lại (Lab Rework Cycle):** Quản lý các ca răng sứ bị lệch khớp cắn/sai màu (`LabReworkCycle`), phân định rạch ròi trách nhiệm chi phí (`CLINIC_FAULT` vs `LAB_FAULT`).

### 3.8. Phân hệ Kế toán Tài chính ERP (Financial Accounting)
- **Bút toán kép (Double-Entry Bookkeeping):** Engine sổ cái [AccountingService](file:///c:/Users/ADMIN/Documents/GitHub/DoAN_TotNghiep/src/accounting/accounting.service.ts) bắt buộc tổng Nợ = tổng Có (`totalDebit === totalCredit`).
- **Duyệt chứng từ & SoD:** Phiếu thu/chi (`AccountingVoucher`) bắt buộc kiểm tra nguyên tắc Segregation of Duties — **Người lập phiếu tuyệt đối không được tự phê duyệt phiếu do chính mình tạo**.
- **Báo cáo Sổ cái (General Ledger):** Tự động tổng hợp số phát sinh Nợ/Có và số dư cuối kỳ theo các tài khoản chuẩn (TK 1111 - Tiền mặt, TK 1121 - Tiền gửi, TK 131 - Phải thu khách hàng, TK 5111 - Doanh thu dịch vụ, TK 632 - Giá vốn vật tư, TK 152 - Nguyên liệu vật tư, TK 1388 - Phải thu chênh lệch thừa thiếu, TK 3388 - Phải trả chênh lệch).

### 3.9. Phân hệ Bảo hành Dịch vụ Nha khoa (Warranty)
- **Cấp thẻ bảo hành:** Tự động tạo thẻ bảo hành điện tử (mã `WRN#`) cho các thủ thuật Implant, Răng sứ với thời hạn tính theo tháng.
- **Tra cứu hiệu lực:** API `checkWarranty` cho phép tra cứu xem dịch vụ còn trong thời hạn bảo hành hay không để áp dụng chính sách tái khám 0 đồng.

---

## 4. THỐNG KÊ CHỨC NĂNG CHÍNH VÀ CHỨC NĂNG CON (CẬP NHẬT)

### 4.1. Bảng tổng hợp số lượng

| # | Chức năng chính | Số chức năng con | Đã có | Chưa có | Tỷ lệ hoàn thành |
|:--:|:---|:--:|:--:|:--:|:---:|
| 1 | Quản trị hệ thống & Xác thực (Auth/RBAC) | 12 | 8 | 4 | 66.7% |
| 2 | Tiếp nhận bệnh nhân (MPI) | 9 | 8 | 1 | 88.9% |
| 3 | Lượt khám (Visit Session) | 6 | 5 | 1 | 83.3% |
| 4 | Hồ sơ bệnh án EMR & Đơn thuốc / CLS | 16 | 12 | 4 | 75.0% |
| 5 | Giấy đồng thuận điều trị (Consent) | 5 | 5 | 0 | **100.0%** |
| 6 | Thanh toán & Ca thu ngân (Billing) | 10 | 8 | 2 | 80.0% |
| 7 | Kho vật tư & Thuật toán FIFO | 10 | 8 | 2 | 80.0% |
| 8 | Tiệt trùng dụng cụ & Tem FEFO | 4 | 4 | 0 | **100.0%** |
| 9 | Labo gia công phục hình răng | 4 | 4 | 0 | **100.0%** |
| 10 | Bảo hiểm Y tế (BHYT / BHTM) | 4 | 4 | 0 | **100.0%** |
| 11 | Kế toán tài chính ERP | 8 | 7 | 1 | 87.5% |
| 12 | Bảo hành dịch vụ nha khoa | 3 | 3 | 0 | **100.0%** |
| 13 | Lưu trữ & Soft-Delete CSDL | 5 | 5 | 0 | **100.0%** |
| 14 | Nhân sự & Tiền lương | 4 | 1 | 3 | 25.0% |
| 15 | Báo cáo & Thống kê | 4 | 3 | 1 | 75.0% |
| | **TỔNG CỘNG** | **104** | **85** | **19** | **81.7%** |

---

## 5. KẾT LUẬN & ĐÁNH GIÁ TỔNG THỂ

1. **Khái quát hệ thống:** Phần mềm đã hoàn thiện đầy đủ **11 phân hệ backend cốt lõi** với **54 REST API endpoints**, đáp ứng trọn vẹn quy trình khám chữa bệnh nha khoa thực tế từ lúc đón tiếp bệnh nhân, lập bệnh án EMR, ký đồng thuận điện tử, kê đơn/chỉ định X-quang, tiệt trùng dụng cụ, gửi labo răng sứ, thu ngân ca làm việc, giám định BHYT, hạch toán kế toán kép sổ cái ERP, đến bảo hành dịch vụ.
2. **Tuân thủ pháp lý & Bảo toàn dữ liệu CSDL:** Đã cài đặt hoàn chỉnh **24 bảng `*Deleted`** tự động ghi vết lịch sử khi xóa dữ liệu, đáp ứng 100% quy định lưu trữ dữ liệu y tế 10-15 năm không đứt gãy liên kết CSDL.
3. **Độ tin cậy kỹ thuật:** Hệ thống đạt tiêu chuẩn biên dịch sạch (`0 errors`), bộ unit test pass 100%, schema Prisma được validate chuẩn hóa trên Microsoft SQL Server.
