# ĐÁNH GIÁ TOÀN BỘ TÍNH NĂNG PHẦN MỀM

**Dự án:** NhaKhoa OS — Dental Clinic ERP & EMR API (`dental-clinic-erp-api`)
**Phiên bản đánh giá:** dựa trên mã nguồn hiện tại trong repo `DoAN_TotNghiep`
**Ngày đánh giá:** 2026-10-07
**Người đánh giá:** Sixth (đọc mã nguồn trực tiếp + chạy build/test/boot)
**Phạm vi:** toàn bộ backend NestJS (`src/`), mô hình dữ liệu (`prisma/schema.prisma`), dữ liệu seed, và giao diện vận hành (`public/`)
**Phương pháp:** đọc trực tiếp từng file nguồn, đối chiếu với đặc tả nghiệp vụ `Quy_trinh_v13_NhaKhoa.md`, và chạy thực tế `npm run build`, `npm test`, `npm run start:dev`, kiểm tra DB bằng `sqlcmd`.

---

## 1. TÓM TẮT ĐIỀU HÀNH

- Phần mềm là **backend ERP/EMR cho phòng khám nha khoa**, viết bằng NestJS 11 + Prisma 7 + Microsoft SQL Server, kèm một giao diện vận hành web tĩnh.
- **Cấu trúc mô hình ERP: đạt.** Phân lớp rõ ràng (Controller → Service → Prisma), có JWT + RBAC 7 vai trò, state machine cho lượt khám, giao dịch nguyên tử (atomic transaction), idempotency, thuật toán kho FIFO, soft-delete archive theo yêu cầu pháp lý.
- **Số tính năng thực sự có API đang chạy:** 6 phân hệ, **20 endpoint** REST dưới tiền tố `/api`.
- **Số tính năng mới chỉ tồn tại ở tầng dữ liệu (có bảng + seed, chưa có API):** 15+ thực thể (kế toán, tiệt trùng, labo, bảo hiểm, bảo hành, chiết khấu, công nợ, audit…).
- **Tình trạng chạy:** biên dịch `PASS`, 14/14 unit test `PASS`, ứng dụng **boot và map đủ 20 route**, database đã dựng sẵn (60 bảng) và seed dữ liệu — **nhưng KHÔNG kết nối được CSDL** nên chưa chạy end-to-end được (xem mục 5).
- **Mức độ hoàn thiện tổng thể:** khoảng **40–45%** so với đặc tả v13 (đúng như chính bảng tự đánh giá trong đặc tả mục 0.1).

---

## 2. KIẾN TRÚC & CÔNG NGHỆ

| Thành phần | Công nghệ | Ghi chú |
|:---|:---|:---|
| Framework | NestJS 11 (`@nestjs/common`, `core`, `platform-express`) | Monolith module hóa |
| Truy cập dữ liệu | Prisma ORM 7 + `@prisma/adapter-mssql` (driver `mssql`/tedious) | Adapter driver, không dùng engine Rust |
| CSDL | Microsoft SQL Server (`sqlserver` provider), DB `DoAnTotNghiep` | 60 bảng |
| Xác thực | `@nestjs/jwt`, `passport-jwt`, `bcrypt` | JWT hạn 8 giờ, mật khẩu bcrypt cost 12 |
| Kiểm tra dữ liệu | `class-validator`, `class-transformer` | `ValidationPipe({ whitelist, transform })` |
| Kiểm thử | Jest + ts-jest | 4 file `.spec.ts` |
| Giao diện | HTML/CSS/JS tĩnh trong `public/`, phục vụ qua `useStaticAssets` | Console nội bộ |

**Sơ đồ phân lớp:**
```
HTTP → Controller (Guards: JwtAuthGuard + RolesGuard, @Roles)
     → Service (kiểm tra nghiệp vụ, $transaction, idempotency)
     → PrismaService (global) → SQL Server
DTO (class-validator) · domain/enums.ts (hằng số trạng thái) · prisma/schema.prisma (mô hình)
```

**Bảng chú giải trạng thái dùng trong tài liệu này:**

| Nhãn | Ý nghĩa |
|:---|:---|
| `HOÀN CHỈNH` | Có API + xử lý nghiệp vụ + có unit test cho các nhánh chính |
| `MỘT PHẦN` | Có API nhưng thiếu ràng buộc, thiếu test, hoặc chưa bao phủ hết đặc tả |
| `CHỈ DỮ LIỆU` | Có bảng + dữ liệu seed nhưng chưa có API/module xử lý |
| `KẾ HOẠCH` | Mới nằm trong đặc tả, chưa có cả dữ liệu lẫn API |
| `GIAO DIỆN` | Chỉ là màn hình tĩnh/mock, chưa nối API |
---

## 3. MA TRẬN ENDPOINT ĐANG HOẠT ĐỘNG (20 route)

| # | Method | Đường dẫn (tiền tố `/api`) | Vai trò được phép | Phân hệ |
|:--:|:--:|:---|:---|:---|
| 1 | POST | `/auth/login` | Công khai | Auth |
| 2 | POST | `/patients` | ADMIN, RECEPTIONIST | Bệnh nhân |
| 3 | GET | `/patients` | ADMIN, RECEPTIONIST, DOCTOR, ASSISTANT, ACCOUNTANT, CHIEF_ACCOUNTANT | Bệnh nhân |
| 4 | POST | `/visits` | ADMIN, RECEPTIONIST, DOCTOR | Lượt khám |
| 5 | PATCH | `/visits/:id/status` | ADMIN, RECEPTIONIST, DOCTOR | Lượt khám |
| 6 | POST | `/emr/visits/:visitId` | ADMIN, DOCTOR, ASSISTANT | EMR |
| 7 | POST | `/emr/:emrId/treatment-lines` | ADMIN, DOCTOR | EMR |
| 8 | POST | `/emr/:emrId/consents` | ADMIN, DOCTOR | EMR/Consent |
| 9 | PATCH | `/emr/consents/:consentId/sign` | ADMIN, DOCTOR | EMR/Consent |
| 10 | PATCH | `/emr/consents/:consentId/revoke` | ADMIN, DOCTOR | EMR/Consent |
| 11 | POST | `/emr/:emrId/settle` | ADMIN, DOCTOR | EMR/Settlement |
| 12 | POST | `/billing/shifts/:cashierId/open` | ADMIN, RECEPTIONIST | Billing |
| 13 | POST | `/billing/payments` | ADMIN, RECEPTIONIST, ACCOUNTANT | Billing |
| 14 | POST | `/billing/shifts/:shiftId/close` | ADMIN, RECEPTIONIST | Billing |
| 15 | GET | `/inventory/lots` | ADMIN, INVENTORY_MANAGER, DOCTOR, ASSISTANT | Kho |
| 16 | POST | `/inventory/items` | ADMIN, INVENTORY_MANAGER | Kho |
| 17 | POST | `/inventory/lots` | ADMIN, INVENTORY_MANAGER | Kho |
| 18 | POST | `/inventory/reservations` | ADMIN, INVENTORY_MANAGER, DOCTOR, ASSISTANT | Kho |
| 19 | POST | `/inventory/reservations/:id/consume` | ADMIN, DOCTOR | Kho |
| 20 | POST | `/inventory/reservations/:id/release` | ADMIN, DOCTOR, INVENTORY_MANAGER | Kho |

**Bộ enum miền (`src/domain/enums.ts`):** `UserRole` (7), `VisitType` (4), `VisitStatus` (6), `ConsentStatus` (4), `CashShiftStatus` (4), `PaymentMethod` (4), `StockLotStatus` (5), `ReservationStatus` (3).

---

## 4. ĐÁNH GIÁ TÍNH NĂNG THEO PHÂN HỆ

### 4.1. Xác thực & Phân quyền (Auth / RBAC)

| Tính năng | Trạng thái | Chi tiết |
|:---|:---:|:---|
| Đăng nhập JWT | `HOÀN CHỈNH` | `POST /auth/login`; so khớp `bcrypt.compare`; ký JWT payload `{sub, username, role}`, hạn 8h |
| Chiến lược JWT | `HOÀN CHỈNH` | `JwtStrategy` lấy Bearer token từ header, `validate()` trả `{userId, username, role}` |
| Guard xác thực | `HOÀN CHỈNH` | `JwtAuthGuard` (passport-jwt) gắn trên mọi controller nghiệp vụ |
| Guard phân quyền | `HOÀN CHỈNH` | `RolesGuard` đọc metadata `@Roles()`; không yêu cầu role → cho qua |
| Ma trận vai trò 7 nhóm | `HOÀN CHỈNH` | ADMIN, RECEPTIONIST, DOCTOR, ASSISTANT, ACCOUNTANT, CHIEF_ACCOUNTANT, INVENTORY_MANAGER |
| Chính sách mật khẩu | `HOÀN CHỈNH` | `LoginDto` regex: ≥9 ký tự, có hoa/thường/số/ký tự đặc biệt |
| Seed tài khoản dev | `HOÀN CHỈNH` | `prisma/seed.js` + `seed.sql` tạo 7 tài khoản bcrypt cost 12 |

**Hạn chế:** không có refresh token; không có rate-limit / khóa đăng nhập sai nhiều lần; không có 2FA (đặc tả mục 11 yêu cầu 2FA OTP — `KẾ HOẠCH`); `username` case-sensitive tùy collation SQL Server.

---

### 4.2. Tiếp nhận bệnh nhân — Master Patient Index (MPI)

| Tính năng | Trạng thái | Chi tiết |
|:---|:---:|:---|
| Tạo hồ sơ bệnh nhân | `HOÀN CHỈNH` | `POST /patients`; tự sinh `patientCode = BN#%06d` |
| Chống trùng theo SĐT/CCCD | `HOÀN CHỈNH` | Truy vấn `OR` trên `phone`/`nationalId`; trùng → `409 ConflictException` kèm mã BN cũ |
| Ràng buộc dữ liệu | `HOÀN CHỈNH` | Họ tên ≥2, ngày sinh ISO, SĐT `0\d{9}`, quốc tịch/giới tính, dị ứng tùy chọn |
| Danh sách bệnh nhân | `HOÀN CHỈNH` | `GET /patients` lọc `isDeleted=false`, sắp xếp mới nhất trước |
| Chuẩn hóa tên | `MỘT PHẦN` | Chỉ `.trim()`; đặc tả yêu cầu chuẩn hóa **Title Case** — chưa làm |
| Trường đặc tả chưa có | `KẾ HOẠCH` | Địa chỉ, nhóm đối tượng, quốc tịch/dân tộc, thẻ BHYT/BHTM, thông tin HĐĐT — **chưa có cột trong schema** |
| Mã hóa CCCD AES-256 | `KẾ HOẠCH` | Đặc tả mục 2.1 yêu cầu; hiện `nationalId` lưu **plain text** (`@unique`) |
| Hợp nhất hồ sơ trùng (Merge) | `KẾ HOẠCH` | Chưa có API; schema cũng chưa có cột `mergedIntoId`/trạng thái `MERGED` |

---

### 4.3. Lượt khám (Visit Session)

| Tính năng | Trạng thái | Chi tiết |
|:---|:---:|:---|
| Tạo lượt khám | `HOÀN CHỈNH` | `POST /visits`; kiểm tra bệnh nhân (không xóa) + bác sĩ tồn tại; sinh `visitCode = STN#YYYYMMDD#/NNNN` |
| State machine trạng thái | `HOÀN CHỈNH` | Bảng `transitions`: `NEW→IN_PROGRESS│CANCELLED`, `IN_PROGRESS→WAITING_PROCESSING│CANCELLED`, `WAITING_PROCESSING→IN_PROGRESS│WAITING_PAYMENT│COMPLETED`, `WAITING_PAYMENT→COMPLETED` |
| Chặn chuyển trạng thái sai | `HOÀN CHỈNH` | `BadRequestException` khi chuyển không hợp lệ (có test) |
| Ca 0 đồng → hoàn tất thẳng | `HOÀN CHỈNH` | `WAITING_PROCESSING` + `grossCharge=0` → nhảy `COMPLETED` (có test) |
| Loại lượt khám | `HOÀN CHỈNH` | Enum `VisitType`: NEW, PAID_FOLLOW_UP, ZERO_COST_FOLLOW_UP, WARRANTY |
| Ràng buộc chống hủy sau khi đã chốt | `HOÀN CHỈNH` | Bảng transitions không cho `CANCELLED` từ `WAITING_PROCESSING/PAYMENT` |
| Tạo mã chống trùng (concurrency) | `MỘT PHẦN` | Sinh mã bằng `count()+1` rồi `create` — **có race condition**, chưa có retry khi trùng unique |
| Ranh giới "trong ngày" | `MỘT PHẦN` | Mốc ngày dùng `T00:00:00.000Z` (UTC) nhưng nghiệp vụ UTC+7 → số thứ tự ngày có thể lệch |
| Ghế nha / phòng / chi nhánh | `KẾ HOẠCH` | Đặc tả mục 2.2 yêu cầu; **chưa có cột trong `Visit`** |
---

### 4.4. Hồ sơ bệnh án điện tử (EMR) + Consent + Chốt dịch vụ (Settlement)

| Tính năng | Trạng thái | Chi tiết |
|:---|:---:|:---|
| Mở hồ sơ EMR cho lượt khám | `HOÀN CHỈNH` | `POST /emr/visits/:visitId`; idempotent (đã có thì trả lại), tự chuyển `NEW→IN_PROGRESS`; chặn ca đã `CANCELLED/COMPLETED` |
| Ghi chú lâm sàng | `HOÀN CHỈNH` | Trường `clinicalNote` tùy chọn khi tạo EMR |
| Thêm dòng điều trị | `HOÀN CHỈNH` | `POST /emr/:emrId/treatment-lines`; chặn nếu EMR đã khóa (`lockedAt`) |
| Tạo giấy đồng thuận | `HOÀN CHỈNH` | `POST /emr/:emrId/consents`; sinh `consentCode = CST#YYYYMMDD#/NNNN`; trạng thái `PENDING_SIGNATURE` |
| Ký đồng thuận | `HOÀN CHỈNH` | `PATCH /emr/consents/:id/sign`; chỉ cho ký khi `PENDING_SIGNATURE`; ghi `signedAt` |
| Thu hồi đồng thuận | `HOÀN CHỈNH` | `PATCH /emr/consents/:id/revoke`; chỉ `SIGNED` mới thu hồi; **tự đảo lượt khám `WAITING_PROCESSING→IN_PROGRESS` và mở khóa EMR** (có test) |
| Cổng kiểm soát Consent (Gatekeeper) | `HOÀN CHỈNH` | Khi chốt ca: dịch vụ `requiresConsent` mà thiếu consent `SIGNED` → chặn, báo mã dịch vụ thiếu (có test) |
| Chốt dịch vụ nguyên tử | `HOÀN CHỈNH` | `POST /emr/:emrId/settle`; bắt buộc visit `IN_PROGRESS`; tính `grossCharge = Σ(unitPrice×qty)`; `$transaction` tạo Settlement + khóa EMR + cập nhật Visit |
| Idempotency chốt ca | `HOÀN CHỈNH` | Trùng `idempotencyKey` → trả lại kết quả cũ; đã chốt khác key → `409` |
| Phân loại sau chốt | `HOÀN CHỈNH` | `grossCharge=0` → `COMPLETED`; `>0` → `WAITING_PAYMENT` (có test) |
| Addendum (đính chính sau khóa) | `CHỈ DỮ LIỆU` | Bảng `Addendum` + seed có, **chưa có API** |
| Ký số Viettel MySign & Bypass 24h | `KẾ HOẠCH` | Đặc tả mục 3.3; chưa có tích hợp, chưa có cờ `KY_OFFLINE_CHO_BU` |
| Tab lâm sàng A–I (Odontogram, đơn thuốc, CLS…) | `KẾ HOẠCH` | Chưa có mô hình cho odontogram, sinh hiệu, CLS |
| Đơn thuốc điện tử (Prescription) | `CHỈ DỮ LIỆU` | Bảng `Prescription` + seed có, chưa có API/cảnh báo dị ứng |

---

### 4.5. Thanh toán & Ca thu ngân (Billing / Cashier)

| Tính năng | Trạng thái | Chi tiết |
|:---|:---:|:---|
| Mở ca thu ngân | `HOÀN CHỈNH` | `POST /billing/shifts/:cashierId/open`; một thu ngân chỉ có 1 ca `OPEN`; sinh `shiftCode = SHIFT#YYYYMMDD#/NNN`; lưu tiền đầu ca |
| Ghi nhận thanh toán | `HOÀN CHỈNH` | `POST /billing/payments`; yêu cầu EMR đã chốt + visit `WAITING_PAYMENT` |
| Chặn thu vượt phải thu | `HOÀN CHỈNH` | So tổng đã thu + số mới với `grossCharge`; vượt → `BadRequestException` |
| Bắt buộc ca cho tiền mặt | `HOÀN CHỈNH` | `method=CASH` phải kèm `cashShiftId` đang `OPEN` (có test) |
| Idempotency thanh toán | `HOÀN CHỈNH` | Trùng `idempotencyKey` → trả lại bản ghi cũ |
| Cập nhật quỹ & tự hoàn tất | `HOÀN CHỈNH` | `$transaction`: tăng `cashCollected`, và khi thu đủ → visit `COMPLETED` (có test) |
| Phương thức thanh toán | `HOÀN CHỈNH` | Enum `PaymentMethod`: CASH, BANK_TRANSFER, DEPOSIT, RECEIVABLE |
| Đóng ca & đối soát lệch két | `HOÀN CHỈNH` | `POST /billing/shifts/:id/close`; tính tiền mặt lý thuyết = đầu ca + thu − chi; `|lệch| > 50.000đ` → `PENDING_CLOSE` (cần duyệt), ngược lại `CLOSED` (có 2 test) |
| Ngưỡng lệch két cấu hình cứng | `MỘT PHẦN` | Hằng số `CASH_OVER_SHORT_THRESHOLD = 50000` trong code, **chưa cấu hình động** |
| Ghi nhận người tạo chứng từ | `MỘT PHẦN` | `createdById` lấy từ **body** thay vì từ JWT → **rủi ro giả mạo người tạo (SoD)** |
| Tiền cọc / cấn trừ cọc | `CHỈ DỮ LIỆU` | Bảng `Deposit` + seed có; **chưa có API**; enum trạng thái cọc chưa có |
| Ghi nợ / thu nợ bệnh nhân | `CHỈ DỮ LIỆU` | Chỉ có `PaymentMethod.RECEIVABLE`; chưa có API công nợ |
| Đổi/trả/hủy & hoàn cọc | `KẾ HOẠCH` | Đặc tả mục 4.6; chưa có API |
| Chiết khấu & làm tròn tiền lẻ | `CHỈ DỮ LIỆU` | Bảng `DiscountApproval` + seed có; **chưa có API**, chưa có ma trận thẩm quyền/`MAX_ROUNDING_AMOUNT` |
| Hạch toán tự động (ma trận định khoản) | `CHỈ DỮ LIỆU` | `AccountingVoucher`, `JournalEntry/Line` + seed có; **chưa có API sinh bút toán** |

---

### 4.6. Kho vật tư (Inventory)

| Tính năng | Trạng thái | Chi tiết |
|:---|:---:|:---|
| Danh mục mặt hàng | `HOÀN CHỈNH` | `POST /inventory/items`; mặc định `requiresLot=true`; ràng buộc mã/tên ≥2 |
| Nhập lô | `HOÀN CHỈNH` | `POST /inventory/lots`; chặn số lượng ≤0, giá vốn <0; lưu hạn dùng |
| Xem tồn theo lô | `HOÀN CHỈNH` | `GET /inventory/lots`; sắp xếp FEFO (`expiryDate` tăng dần, rồi `createdAt`) |
| Giữ hàng (Reserve) FIFO tự tách lô | `HOÀN CHỈNH` | `POST /inventory/reservations`; chỉ lô còn hạn; tính khả dụng = onHand−reserved; tách nhiều dòng theo lô cũ nhất trước (có 3 test) |
| Chặn giữ quá tồn | `HOÀN CHỈNH` | Không đủ khả dụng → `BadRequestException`, không ghi dòng nào (có test) |
| Phát hiện dữ liệu lô bất nhất | `HOÀN CHỈNH` | reserved>onHand hoặc âm → chặn (có test) |
| Xuất dùng (Consume) | `HOÀN CHỈNH` | `POST /inventory/reservations/:id/consume`; trừ `quantityOnHand` + `quantityReserved`; hết tồn → `CONSUMED` (có test chặn khi onHand < reserved) |
| Trả hàng (Release) | `HOÀN CHỈNH` | `POST /inventory/reservations/:id/release`; chỉ giảm `quantityReserved`, không đổi onHand (có test) |
| Chống xuất quá tồn ở tầng CSDL | `HOÀN CHỈNH` | Migration `0001_inventory_non_negative` thêm 5 CHECK constraint |
| Cảnh báo cận hạn 30/60/90 ngày | `KẾ HOẠCH` | Đặc tả mục 5.1; API chỉ trả danh sách, chưa có cảnh báo |
| Phiếu nhập/xuất kho & bút toán kho | `KẾ HOẠCH` | Chưa có API phiếu NK/PX; bảng Journal có nhưng chưa sinh bút toán |
| Xuất hủy hàng hỏng/hết hạn | `KẾ HOẠCH` | Chưa có API |
---

### 4.7. Giao diện vận hành web (`public/`)

| Màn hình / tính năng | Trạng thái | Chi tiết |
|:---|:---:|:---|
| Đăng nhập | `HOÀN CHỈNH` | `submitLogin()` gọi thật `POST /api/auth/login`, lưu `accessToken`/`currentUser` vào localStorage |
| Khung ứng dụng (app shell) + điều hướng | `HOÀN CHỈNH` | Sidebar 8 mục: Tổng quan, Bệnh nhân, Lượt khám, EMR, Thanh toán, Kho, Báo cáo, Cấu hình |
| Tạo bệnh nhân (modal) | `HOÀN CHỈNH` | `submitPatient()` gọi thật `POST /api/patients`, chèn dòng mới vào danh sách |
| Kho — đồng bộ tồn từ API | `HOÀN CHỈNH` | `refreshInventory()` gọi thật `GET /api/inventory/lots`, render bảng lô |
| Bảng "Hàng đợi hôm nay" | `GIAO DIỆN` | Dữ liệu **hardcode** trong `app.js` (`queue`), không gọi API |
| Danh sách bệnh nhân | `GIAO DIỆN` | Mảng `patients` hardcode; chỉ cập nhật khi tạo mới qua API |
| Danh sách lượt khám | `GIAO DIỆN` | `renderVisits()` từ mảng mock; chưa có màn hình đổi trạng thái |
| Hồ sơ EMR (chọn ca, tab lâm sàng) | `GIAO DIỆN` | Mock 3 bệnh nhân; nút "Chốt dịch vụ" chỉ hiện toast minh họa |
| Màn hình Thanh toán | `GIAO DIỆN` | Placeholder ("đang được nối tiếp từ module Billing API") |
| Màn hình Báo cáo / Cấu hình | `GIAO DIỆN` | Placeholder |
| Nhập lô (nút "+ Nhập lô") | `GIAO DIỆN` | Chỉ hiện toast, chưa mở form gọi API |
| Tìm kiếm bệnh nhân / kho | `HOÀN CHỈNH` | Lọc phía client trên dữ liệu đang hiển thị |

**Kết luận giao diện:** đây là **vỏ demo (shell)**, không phải ứng dụng nghiệp vụ đầy đủ. Chỉ 3 luồng nối API thật (đăng nhập, tạo bệnh nhân, xem kho); phần lớn màn hình hiển thị dữ liệu mẫu tĩnh.

---

### 4.8. Tính năng tồn tại ở tầng DỮ LIỆU nhưng CHƯA có API

Các thực thể dưới đây **đã có bảng trong `schema.prisma`, đã có migration, và đã có dữ liệu seed mẫu**, nhưng **chưa có module/controller/service** — tức chưa thao tác được qua phần mềm.

| # | Thực thể (bảng) | Nghiệp vụ tương ứng | Trạng thái |
|:--:|:---|:---|:---:|
| 1 | `Deposit` | Tiền cọc / tạm ứng / cấn trừ cọc | `CHỈ DỮ LIỆU` |
| 2 | `ServiceCatalog`, `PriceListLine` | Danh mục dịch vụ + bảng giá hiệu lực (SCD Type 2) | `CHỈ DỮ LIỆU` |
| 3 | `SterilizationCycle`, `InstrumentPack` | Chu trình hấp tiệt trùng + khay dụng cụ (FEFO hạn vô trùng) | `CHỈ DỮ LIỆU` |
| 4 | `DentalLabTicket`, `LabReworkCycle` | Phiếu gửi Labo + chu trình làm lại | `CHỈ DỮ LIỆU` |
| 5 | `InsuranceClaim` | Hồ sơ bảo hiểm / giám định BHYT | `CHỈ DỮ LIỆU` |
| 6 | `AccountingVoucher` | Phiếu thu/chi & duyệt chứng từ | `CHỈ DỮ LIỆU` |
| 7 | `JournalEntry`, `JournalLine` | Bút toán kép / sổ cái | `CHỈ DỮ LIỆU` |
| 8 | `Warranty` | Tra cứu & áp giá bảo hành dịch vụ | `CHỈ DỮ LIỆU` |
| 9 | `DiscountApproval` | Duyệt chiết khấu theo ma trận thẩm quyền | `CHỈ DỮ LIỆU` |
| 10 | `Addendum` | Đính chính bệnh án sau khóa | `CHỈ DỮ LIỆU` |
| 11 | `CommissionAdjustment` | Điều chỉnh/thu hồi hoa hồng bác sĩ (clawback) | `CHỈ DỮ LIỆU` |
| 12 | `Prescription` | Đơn thuốc điện tử | `CHỈ DỮ LIỆU` |
| 13 | `LabOrder` | Chỉ định cận lâm sàng (CLS) | `CHỈ DỮ LIỆU` |
| 14 | `AuditLog` | Nhật ký kiểm toán mọi thao tác | `CHỈ DỮ LIỆU` |
| 15 | `DeletedRecord` + 24 bảng `*Deleted` | Lưu trữ/xóa mềm theo yêu cầu pháp lý | `CHỈ DỮ LIỆU` |
| 16 | `User` (quản lý tài khoản) | CRUD tài khoản & phân quyền runtime | `CHỈ DỮ LIỆU` |

> **Lưu ý quan trọng:** các bảng `*Deleted` là **cơ chế lưu trữ (archive)**, không phải API xóa. Trong mã nguồn hiện tại **không có một endpoint DELETE nào**, và cũng **chưa có logic ghi vào các bảng archive** — đặc tả mục 15 yêu cầu cơ chế xóa mềm + trigger CSDL vẫn chưa được hiện thực.

---

### 4.9. Mô hình dữ liệu (điểm mạnh)

- **60 bảng** phủ gần như toàn bộ miền nghiệp vụ nha khoa: lâm sàng, tài chính, kho, tiệt trùng, labo, bảo hiểm, kế toán, bảo hành, quản trị.
- **Khóa tự nhiên bất biến:** `patientCode` (BN#), `visitCode` (STN#), `consentCode` (CST#), `settlementCode` (SET#), `shiftCode` (SHIFT#), `transactionCode` (PAY#), `reservationCode` (RES#) — mỗi mã đều `@unique`.
- **Idempotency:** `Settlement.idempotencyKey`, `Payment.idempotencyKey` đều `@unique`.
- **Index tối ưu truy vấn:** nhiều `@@index` trên `patientId+createdAt`, `status+createdAt`, `itemId+expiryDate+createdAt`, `visitId+status`, `entityName+entityId+createdAt`…
- **Kiểm soát toàn vẹn dữ liệu kho ở CSDL:** 5 CHECK constraint (không âm, reserved ≤ onHand).
- **`Decimal(18,2)` cho tiền, `Decimal(18,3)` cho số lượng kho** — đúng chuẩn kế toán.
---

## 5. TỔNG HỢP CHỨC NĂNG: CHỨC NĂNG CHÍNH → CHỨC NĂNG CON

### 5.1. Định nghĩa phân loại

- **Chức năng chính (main function):** một phân hệ/nhóm nghiệp vụ lớn (ví dụ: *Quản trị hệ thống & Tài khoản*, *Kho vật tư*).
- **Chức năng con (sub-function):** một thao tác/capability nguyên tử mà người dùng thực hiện được (ví dụ: *đăng nhập*, *tạo tài khoản*, *đổi mật khẩu* — mỗi cái tính là **một** chức năng con).
- **Đã có:** chức năng con đã được hiện thực trong mã nguồn (có API hoặc có field/logic thực).
- **Chưa có:** chức năng con nằm trong đặc tả v13 nhưng chưa được xây (có thể đã có bảng dữ liệu, nhưng chưa thao tác được).

### 5.2. Bảng tổng hợp số lượng

| # | Chức năng chính | Số chức năng con | Đã có | Chưa có |
|:--:|:---|:--:|:--:|:--:|
| 1 | Quản trị hệ thống & Tài khoản | 12 | 2 | 10 |
| 2 | Tiếp nhận bệnh nhân (MPI) | 9 | 4 | 5 |
| 3 | Lượt khám (Visit) | 6 | 4 | 2 |
| 4 | Hồ sơ bệnh án EMR | 16 | 4 | 12 |
| 5 | Giấy đồng thuận (Consent) | 5 | 4 | 1 |
| 6 | Thanh toán & Ca thu ngân (Billing) | 10 | 4 | 6 |
| 7 | Kho vật tư (Inventory) | 10 | 6 | 4 |
| 8 | Tiệt trùng dụng cụ | 4 | 0 | 4 |
| 9 | Labo gia công phục hình | 4 | 0 | 4 |
| 10 | Bảo hiểm & BHYT | 4 | 0 | 4 |
| 11 | Kế toán tài chính | 8 | 0 | 8 |
| 12 | Bảo hành dịch vụ | 3 | 0 | 3 |
| 13 | Nhân sự & Tiền lương | 4 | 0 | 4 |
| 14 | Tài sản cố định | 3 | 0 | 3 |
| 15 | Báo cáo & Thống kê | 4 | 0 | 4 |
| | **TỔNG CỘNG** | **102** | **28** | **74** |

> **Kết luận số lượng:** phần mềm có **15 chức năng chính** và **102 chức năng con** theo thiết kế v13. Trong đó **28 chức năng con đã được hiện thực** và **74 chức năng con còn ở dạng thiết kế/chưa xây** (chiếm ~72,5%).

### 5.3. Chi tiết từng chức năng chính và các chức năng con

**1. Quản trị hệ thống & Tài khoản — 12 chức năng con** (đã có: 2)
1. Đăng nhập — *đã có*
2. Đăng xuất — *chưa có*
3. Tạo tài khoản người dùng — *chưa có*
4. Sửa thông tin tài khoản — *chưa có*
5. Khóa / mở khóa tài khoản — *chưa có*
6. Đổi mật khẩu — *chưa có*
7. Đặt lại / khôi phục mật khẩu — *chưa có*
8. Phân quyền theo vai trò (RBAC 7 nhóm) — *đã có (nền guard + seed)*
9. Xác thực hai lớp (2FA/OTP) — *chưa có*
10. Truy cập khẩn cấp Break-glass (có audit) — *chưa có*
11. Cấu hình tham số hệ thống — *chưa có*
12. Nhật ký kiểm toán (Audit Log) — *chưa có (mới có bảng)*

**2. Tiếp nhận bệnh nhân (MPI) — 9 chức năng con** (đã có: 4)
1. Tạo hồ sơ bệnh nhân — *đã có*
2. Tra cứu / liệt kê bệnh nhân — *đã có*
3. Phát hiện trùng theo SĐT/CCCD — *đã có*
4. Ghi nhận dị ứng & bệnh nền — *đã có (trường dữ liệu)*
5. Cập nhật hồ sơ bệnh nhân — *chưa có*
6. Hợp nhất hồ sơ trùng (Patient Merge) — *chưa có*
7. Quản lý thẻ BHYT / BHTM — *chưa có*
8. Thông tin xuất hóa đơn điện tử — *chưa có*
9. Lưu trữ / xóa mềm hồ sơ — *chưa có (mới có bảng)*

**3. Lượt khám (Visit) — 6 chức năng con** (đã có: 4)
1. Tạo lượt khám — *đã có*
2. Chuyển trạng thái lượt khám — *đã có*
3. Xử lý ca tái khám không thu phí (0 đồng) — *đã có*
4. Hủy lượt khám — *đã có*
5. Theo dõi hàng đợi / danh sách lượt — *chưa có (giao diện mock)*
6. Phân bổ ghế nha / phòng / chi nhánh — *chưa có*

**4. Hồ sơ bệnh án EMR — 16 chức năng con** (đã có: 4)
1. Mở hồ sơ EMR cho lượt khám — *đã có*
2. Ghi chú lâm sàng — *đã có*
3. Thêm dòng điều trị — *đã có*
4. Chốt dịch vụ (Settlement) — *đã có*
5. Tab sinh hiệu (Vital Signs) — *chưa có*
6. Tab sơ đồ răng (Odontogram FDI) — *chưa có*
7. Tab bệnh sử & khám chi tiết (ICD-10) — *chưa có*
8. Tab kế hoạch điều trị nhiều giai đoạn — *chưa có*
9. Tab kê đơn thuốc + cảnh báo dị ứng — *chưa có (mới có bảng)*
10. Tab chỉ định & kết quả CLS — *chưa có (mới có bảng)*
11. Tab vật tư y tế sử dụng — *đã có (mượn module Kho)*
12. Tab phiếu gửi Labo — *chưa có (mới có bảng)*
13. Tab tổng kết ca điều trị — *chưa có*
14. Đính chính bệnh án (Addendum) — *chưa có (mới có bảng)*
15. Ký số MySign + Bypass 24h — *chưa có*
16. Tra cứu lịch sử khám (Timeline) — *chưa có*

**5. Giấy đồng thuận (Consent) — 5 chức năng con** (đã có: 4)
1. Tạo giấy đồng thuận — *đã có*
2. Ký đồng thuận — *đã có*
3. Thu hồi đồng thuận — *đã có*
4. Cổng kiểm soát chốt ca (Consent Gatekeeper) — *đã có*
5. Quản lý biểu mẫu cam kết theo thủ thuật — *chưa có*

**6. Thanh toán & Ca thu ngân — 10 chức năng con** (đã có: 4)
1. Mở ca thu ngân — *đã có*
2. Thu tiền dịch vụ — *đã có*
3. Chống ghi trùng giao dịch (idempotency) — *đã có*
4. Đóng ca & đối soát lệch két — *đã có*
5. Thu / hoàn tiền cọc — *chưa có (mới có bảng)*
6. Cấn trừ tiền cọc vào doanh thu — *chưa có*
7. Ghi nợ / thu nợ bệnh nhân — *chưa có*
8. Đổi / trả / hủy dịch vụ & hoàn tiền — *chưa có*
9. Duyệt chiết khấu theo ma trận thẩm quyền — *chưa có (mới có bảng)*
10. Làm tròn tiền lẻ — *chưa có*

**7. Kho vật tư — 10 chức năng con** (đã có: 6)
1. Quản lý danh mục mặt hàng — *đã có*
2. Nhập lô hàng — *đã có*
3. Xem tồn kho theo lô (FEFO) — *đã có*
4. Giữ hàng theo FIFO tự tách lô — *đã có*
5. Xuất dùng vật tư (Consume) — *đã có*
6. Trả lại hàng giữ (Release) — *đã có*
7. Kiểm kê kho — *chưa có*
8. Lập phiếu nhập / xuất kho — *chưa có*
9. Xuất hủy hàng hỏng / hết hạn — *chưa có*
10. Cảnh báo cận hạn (30/60/90 ngày) — *chưa có*
**8. Tiệt trùng dụng cụ — 4 chức năng con** (đã có: 0)
1. Tạo chu trình hấp tiệt trùng — *chưa có (mới có bảng)*
2. Đóng gói & in tem khay dụng cụ — *chưa có (mới có bảng)*
3. Quét mã khay tại ghế răng — *chưa có*
4. Cảnh báo khay quá hạn vô trùng — *chưa có*

**9. Labo gia công phục hình — 4 chức năng con** (đã có: 0)
1. Tạo phiếu gửi Labo — *chưa có (mới có bảng)*
2. Nhận mẫu & nghiệm thu — *chưa có*
3. Quản lý chu trình làm lại (Rework) — *chưa có (mới có bảng)*
4. Hạch toán chi phí gia công Labo — *chưa có*

**10. Bảo hiểm & BHYT — 4 chức năng con** (đã có: 0)
1. Tạo hồ sơ bảo hiểm (Claim) — *chưa có (mới có bảng)*
2. Kết xuất XML giám định BHYT (bảng 1-2-3) — *chưa có*
3. Xử lý kết quả giám định (duyệt/từ chối) — *chưa có*
4. Tất toán công nợ bảo hiểm — *chưa có*

**11. Kế toán tài chính — 8 chức năng con** (đã có: 0)
1. Lập phiếu thu / phiếu chi — *chưa có (mới có bảng)*
2. Duyệt chứng từ 4 bước — *chưa có*
3. Hạch toán tự động (ma trận định khoản) — *chưa có (mới có bảng)*
4. Bút toán kép / sổ cái — *chưa có (mới có bảng)*
5. Quản lý công nợ chi tiết — *chưa có*
6. Tính hoa hồng bác sĩ (cash-basis) — *chưa có (mới có bảng)*
7. Thu hồi / điều chỉnh hoa hồng (Clawback) — *chưa có (mới có bảng)*
8. Báo cáo tài chính (P&L, cân đối phát sinh) — *chưa có*

**12. Bảo hành dịch vụ — 3 chức năng con** (đã có: 0)
1. Tạo thẻ bảo hành — *chưa có (mới có bảng)*
2. Tra cứu bảo hành theo mã BN / SĐT / QR — *chưa có (mới có bảng)*
3. Áp giá 0đ cho ca tái khám bảo hành — *chưa có*

**13. Nhân sự & Tiền lương — 4 chức năng con** (đã có: 0)
1. Quản lý hồ sơ nhân sự — *chưa có*
2. Chấm công — *chưa có*
3. Tính bảng lương (kèm hoa hồng) — *chưa có*
4. Xem lịch sử khám cá nhân — *chưa có*

**14. Tài sản cố định — 3 chức năng con** (đã có: 0)
1. Quản lý tài sản (ghế nha, máy X-quang, autoclave) — *chưa có*
2. Tính khấu hao định kỳ — *chưa có*
3. Nhắc lịch bảo trì / bảo dưỡng — *chưa có*

**15. Báo cáo & Thống kê — 4 chức năng con** (đã có: 0)
1. Báo cáo doanh thu — *chưa có*
2. Báo cáo công nợ — *chưa có*
3. Báo cáo hiệu suất phòng khám — *chưa có*
4. Báo cáo lãi gộp từng ca điều trị — *chưa có*

> **Ghi chú về cách đếm:** các con số trên được phân loại theo **mức độ chi tiết chức năng người dùng** (mỗi thao tác riêng biệt = 1 chức năng con). Nếu gộp các thao tác cùng nhóm lại (ví dụ coi "tạo/sửa/khóa tài khoản" là một mục "quản lý tài khoản"), tổng số chức năng con sẽ giảm; nếu tách chi tiết hơn (theo từng trường/nhánh nghiệp vụ) thì sẽ tăng. Con số **15 chức năng chính** là ổn định.

---

## 6. TÌNH TRẠNG CHẠY, RỦI RO & KHUYẾN NGHỊ

### 6.1. Bằng chứng đã chạy thực tế

```
node -v                     -> v24.21.0 ; npm -v -> 11.19.0
npm run build               -> tsc -p tsconfig.build.json : OK, 0 lỗi
npm test                    -> 4 suites / 14 tests : PASS
npm run start:dev           -> Nest boot OK, map 20 route, sau đó DỪNG:
   ConnectionError: Login failed for user ''
   at node_modules\mssql\lib\tedious\connection-pool.js:86
Test-NetConnection localhost:3000 -> False (app chưa từng mở cổng)
sqlcmd -S "DESKTOP-F5CFA0D,1433" -E -> kết nối OK
   -> DB DoAnTotNghiep: 60 bảng; User=7, Patient=3, Visit=3 (đã seed)
SERVERPROPERTY('IsIntegratedSecurityOnly') = 1  (chỉ Windows Authentication)
sys.sql_logins: sa disabled=1
```

### 6.2. Nguyên nhân gốc lỗi kết nối (đã kiểm chứng)

1. `.env` dùng chuỗi `sqlserver://...;integratedSecurity=true;...`.
2. Adapter `@prisma/adapter-mssql` (nền `mssql`/tedious) **không hỗ trợ** `integratedSecurity`. Đọc code `node_modules/@prisma/adapter-mssql/dist/index.js` → hàm `parseConnectionString` chỉ xử lý `database, user/uid/username, password/pwd, encrypt, trustServerCertificate, authentication (Entra)…`; tham số `integratedSecurity` **bị bỏ qua** → `config.user` rỗng → `Login failed for user ''`.
3. Máy đang ở chế độ **Windows Authentication only** và tài khoản `sa` bị **disabled**, trong khi tedious không có cơ chế SSPI/trusted connection như `msnodesqlv8`.

**Cách khắc phục (chọn 1):**
- **A. Bật mixed-mode SQL Server** (đổi registry `LoginMode=2` cho `MSSQL$SQLEXPRESS` → restart service → `CREATE LOGIN app WITH PASSWORD=…` + gán user cho DB → sửa `.env` sang `user=…;password=…`). Khôi phục ngược được.
- **B. Dùng tài khoản SQL có sẵn** → chỉ sửa `.env`.
- **C. (không khuyến nghị cho máy hiện tại)** nếu máy bật mixed-mode: dùng `sa` + mật khẩu để kết nối.

### 6.3. Rủi ro kỹ thuật (quan sát khi đọc mã nguồn)

| # | Rủi ro | Mức | Ghi chú |
|:--:|:---|:---:|:---|
| R1 | Lệch adapter ↔ `integratedSecurity` → không chạy được | Cao | Cần sửa `.env`/cấu hình SQL (mục 6.2) |
| R2 | Sinh mã tuần tự `count()+1` (BN#, STN#, PAY#…) **race condition** | Trung bình | Nên dùng sequence/SQL identity hoặc retry khi trùng unique |
| R3 | `patient.count()` không lọc `isDeleted` → lệch số mã | Trung bình | Lọc điều kiện khi đếm |
| R4 | Ranh giới "trong ngày" dùng UTC nhưng nghiệp vụ UTC+7 | Trung bình | Reset số thứ tự theo ngày có thể sai lệch |
| R5 | `createdById` lấy từ **body** thay vì JWT → giả mạo người tạo (SoD) | Cao | Lấy từ `req.user.userId` |
| R6 | Chưa có Audit Log ghi thật dù schema có | Trung bình | Đặc tả yêu cầu mọi thao tác phải audit |
| R7 | Chưa có rate-limit / khóa đăng nhập sai | Trung bình | Bảo mật xác thực |
| R8 | CCCD (`nationalId`) lưu plain text, chưa mã hóa AES-256 | Cao | Yêu cầu bảo vệ dữ liệu cá nhân (NĐ 13/2023) |
| R9 | Không có endpoint DELETE / logic archive dù có 24 bảng `*Deleted` | Trung bình | Cơ chế lưu trữ pháp lý chưa hoạt động |
| R10 | Giao diện chủ yếu là mock tĩnh | Thấp | Cần nối API cho các màn hình nghiệp vụ |

### 6.4. Khuyến nghị ưu tiên

1. **Sửa kết nối CSDL** (mục 6.2) để hệ chạy end-to-end — đây là việc chặn đầu tiên.
2. **Lấy người tạo chứng từ từ JWT** (R5) và **thêm ghi Audit Log** (R6) trước khi mở rộng nghiệp vụ tài chính.
3. **Thay cơ chế sinh mã** bằng sequence/identity hoặc retry-unique (R2, R4).
4. **Mã hóa trường CCCD** và bổ sung chức năng tài khoản cơ bản (tạo/đổi mật khẩu/khóa — đang thiếu 7–8 chức năng con của nhóm Quản trị).
5. Hoàn thiện dần theo thứ tự nghiệp vụ: **Kế toán định khoản → Kho phiếu nhập/xuất → Tiệt trùng → Labo → Bảo hiểm → Bảo hành → Nhân sự → Báo cáo**.

### 6.5. Kết luận

- **Về cấu trúc mô hình ERP:** phần mềm **đúng và bài bản** — phân lớp rõ, RBAC 7 vai trò, state machine, giao dịch nguyên tử, idempotency, thuật toán FIFO, mô hình 60 bảng bao trùm cả các module chưa xây.
- **Về khối lượng chức năng:** theo thiết kế v13 có **15 chức năng chính / 102 chức năng con**, trong đó **28 chức năng con (~27,5%) đã được hiện thực**, tập trung ở 6 phân hệ lõi (Auth, Bệnh nhân, Lượt khám, EMR/Consent, Billing, Kho).
- **Về khả năng chạy:** biên dịch và kiểm thử đạt, ứng dụng **boot và nạp đủ route**, database đã dựng sẵn và seed — nhưng **chưa chạy end-to-end do lỗi xác thực CSDL** (có thể khắc phục nhanh theo mục 6.2).
- **Đánh giá tổng thể:** đây là một **nền tảng ERP/EMR nha khoa đúng hướng, khung sườn tốt**, đang ở mức hoàn thiện khoảng **40–45%** so với đặc tả; phần đã xong là các nghiệp vụ lõi và an toàn; phần còn lại là kế toán, kho nâng cao, tiệt trùng, labo, bảo hiểm, bảo hành và giao diện nghiệp vụ.
