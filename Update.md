# Update.md — Nhật ký chức năng & tiến độ

Tài liệu này mô tả **phần mềm đang làm gì**, **đã làm xong những gì**, và **còn thiếu gì** so với đặc tả `Quy_trinh_v13_NhaKhoa.md`. Dùng file này khi tiếp tục phát triển: đánh dấu trạng thái, ghi changelog, tránh làm lại hoặc quên ràng buộc.

> Ngày rà soát mã nguồn: **09/10/2026**  
> Tên hiển thị UI: **DentalCare ERP**  
> Đặc tả mục tiêu: **v13 – Quản lý phòng khám nha khoa tích hợp ERP và bảo mật EMR**  
> Mức độ hiện tại: **baseline MVP mở rộng, chưa production-ready**

Cách đọc trạng thái:

| Ký hiệu | Ý nghĩa |
|:---|:---|
| **DONE** | Có schema + API + màn hình chính; dùng được trên luồng happy-path |
| **PARTIAL** | Có nền tảng (schema/API/UI) nhưng thiếu vòng đời đầy đủ, tích hợp hoặc test |
| **PLANNED** | Có trong v13, chưa triển khai hoặc chỉ ghi chú UI |

---

## 1. Phần mềm này làm gì?

Hệ thống quản trị **phòng khám nha khoa**: đón tiếp bệnh nhân → ghi bệnh án điện tử (EMR) → chốt dịch vụ (có cổng đồng thuận xâm lấn) → thu tiền / đóng ca quỹ → quản lý kho FIFO → các module vận hành (tiệt trùng, Labo, bảo hiểm, bảo hành, kế toán, nhân sự, tài sản).

**Phạm vi Lean MVP (theo v13):** không làm đặt lịch hẹn phức tạp, không CSKH đa kênh, không mua hàng PO nhiều cấp. Giữ tồn kho + nhập/xuất trực tiếp.

**Không phải:** EMR pháp lý đầy đủ, ERP kế toán tự động hoàn chỉnh, hay hệ thống sẵn sàng production.

---

## 2. Kiến trúc & cách chạy

```
frontend/     React 19 + Vite 6  →  http://127.0.0.1:5173  (proxy /api → :3000)
backend/      Node.js/Express 5 + TypeScript + SQL Server
backend/sql/  Migration 001 → 004
```

| Thành phần | Chi tiết |
|:---|:---|
| API | `backend/src/index.ts`, cổng mặc định `3000` |
| Health | `GET /health` |
| Auth | JWT Bearer, hết hạn mặc định 900 giây |
| CSDL | SQL Server (Windows Integrated Auth, ODBC Driver 18) |
| Bảo mật PII | AES-256-GCM + HMAC lookup hash (CCCD, ghi chú dị ứng/bệnh sử, chữ ký consent, SĐT nhân sự) |
| Xóa dữ liệu | Soft-delete: mỗi bảng có bảng `*Deleted` + trigger `INSTEAD OF DELETE`; không `ON DELETE CASCADE` |
| UI | SPA một file `frontend/src/App.tsx`, điều hướng theo vai trò |

Chạy local (rút gọn từ `backend/README.md`):

1. `backend`: copy `.env.example` → `.env` (JWT + 2 khóa PII).
2. `sqlcmd` lần lượt: `001` → `002` → bootstrap admin → `003` → `004`.
3. Optional: `npm run seed-test-users`.
4. `npm run dev` (API) và `frontend`: `npm run dev`.

Script SQL:

| File | Việc |
|:---|:---|
| `001_initial_schema.sql` | Users, Patients, Visits, kho, kế toán, ca quỹ, audit, bảng Deleted |
| `002_encrypt_patient_notes.sql` | Mã hóa ghi chú bệnh nhân (chỉ khi chưa có dòng bệnh nhân) |
| `003_clinical_and_erp_modules.sql` | EMR, consent, dịch vụ, reservation, tiệt trùng, Labo, BH, bảo hành, HR, TSCĐ |
| `004_tt99_accounting_accounts.sql` | Bổ sung TK 1331/1332, 211/2141, 3331, 521, 621/622/627, 711 |

Test hiện có (chỉ backend unit): `pii`, `password-policy`, `invariants` (FIFO, journal cân, chuyển trạng thái lượt khám, đóng ca). **Chưa có integration test API/UI.**

---

## 3. Vai trò (RBAC)

Đã khai báo trong JWT / `allowRoles`:

| Role | Tên UI | Menu thấy được (rút gọn) |
|:---|:---|:---|
| `ADMIN` | Quản trị viên | Gần như toàn bộ (không phải break-glass EMR đúng v13) |
| `RECEPTIONIST` | Tiếp nhận | Tiếp nhận, BN, thu ngân, kho (xem), BH, bảo hành |
| `DOCTOR` | Bác sĩ | Tiếp nhận, BN, EMR, kho, Labo, bảo hành |
| `ASSISTANT` | Phụ tá | Tiếp nhận, BN, EMR, kho, tiệt trùng, Labo |
| `ACCOUNTANT` | Kế toán viên | Thu ngân, kho, BH, kế toán, HR, TSCĐ |
| `CHIEF_ACCOUNTANT` | Kế toán trưởng | Thu ngân, kho, BH, kế toán, HR, TSCĐ |
| `INVENTORY_MANAGER` | Quản lý kho | Kho, tiệt trùng, TSCĐ |

Tạo user: `POST /api/auth/users` (**chỉ ADMIN**). Chính sách mật khẩu code: ≥ 9 ký tự, có chữ hoa, có ký tự đặc biệt.

**Lệch đặc tả v13 cần nhớ khi update:**

- Admin **vẫn xem EMR** trên UI/API (chưa Break-glass).
- `POST /patients` và `POST /visits` **chỉ RECEPTIONIST**; Admin bấm “Tiếp nhận mới” trên UI có thể bị 403.
- Chưa MFA, chưa thu hồi phiên, chưa khóa tài khoản sau nhiều lần sai (chỉ rate-limit login 10 lần / 15 phút).

---

## 4. Bảng chức năng theo module (để kiểm soát khi update)

### 4.1 Đăng nhập & dashboard — **DONE** (cơ bản)

Đã có:

- Màn hình đăng nhập, JWT, 401 tự đăng xuất.
- Sidebar lọc theo role, dashboard: lượt hôm nay, hàng chờ, giá trị tồn, lối tắt.

Còn thiếu:

- MFA, refresh token, logout server-side, khóa phiên.

---

### 4.2 Hồ sơ bệnh nhân — **PARTIAL**

Đã có:

- Mã `BN#000001` (sequence, không reset theo ngày).
- Tạo hồ sơ: họ tên, NS, giới tính, SĐT `0xxxxxxxxx`, CCCD (mã hóa + hash dò trùng), địa chỉ, dị ứng, tiền sử.
- Cảnh báo trùng **SĐT hoặc CCCD** (API 409 `PATIENT_DUPLICATE_MATCH`).
- Soft-delete có lý do + audit.
- UI danh sách + tìm kiếm; tạo kèm lượt khám trong một form tiếp nhận.

Còn thiếu so với v13:

- Cảnh báo trùng SĐT dạng popup “mở hồ sơ cũ” trên UI (API đã trả `matches`).
- Nhóm tuổi, quốc tịch, BHYT/BHTM trên hồ sơ, MST/HĐĐT.
- Patient Merge (`MERGED`, không sửa mã BN).
- Sửa hồ sơ (PUT/PATCH).
- `POST /patients` cho ADMIN (hiện chỉ lễ tân).

---

### 4.3 Lượt tiếp nhận (Visit) — **PARTIAL**

Đã có:

- Mã `STN#YYYYMMDD#/0001`, reset theo ngày (`VisitCounters`).
- Loại: `NEW` / `FOLLOW_UP_PAID` / `FOLLOW_UP_FREE`.
- Gán bác sĩ; trạng thái `-1, 0, 1, 2, 3, 4` với ma trận chuyển `canTransitionVisit`.
- Hủy khi `0` hoặc `1`; UI hủy lượt.
- Chốt ca 0đ (`FOLLOW_UP_FREE`, không gắn dịch vụ thu phí) → thẳng `2 → 4`.

Còn thiếu:

- Ghế nha / phòng / chi nhánh.
- Đối tượng thanh toán (tự trả / BHTM / BHYT).
- Dịch vụ đăng ký ban đầu tại quầy (không hạch toán).
- Liên kết `Treatment_Phase_ID` / STN gốc cho tái khám.
- Cổng ký số MySign khi chốt ca thuộc danh mục bắt buộc (chi tiết mục **4.14**).

---

### 4.4 EMR & đồng thuận — **PARTIAL**

Đã có:

- Danh mục dịch vụ lâm sàng (`GET/POST /clinical/services`).
- EMR: sinh hiệu, sơ đồ răng FDI (chọn răng), chẩn đoán, diễn biến; ghi chú mã hóa; bác sĩ chỉ sửa ca được gán.
- Thêm chỉ định: snapshot giá vào `VisitServiceItems`.
- Consent điện tử: chữ ký PNG, mã hóa, SHA-256, chỉ dịch vụ xâm lấn đã chỉ định, khi ca đang `Status = 1`.
- Thu hồi consent (`revoke` + lý do).
- Gatekeeper chốt ca: bắt buộc EMR đã lưu; thiếu consent xâm lấn thì 409 `CONSENT_REQUIRED`.
- UI tab: Tổng quan / Sinh hiệu / Sơ đồ răng / Khám lâm sàng / Điều trị + modal ký.

Còn thiếu (tabs A–I v13):

- Tab đơn thuốc, CLS, vật tư đặc thù, phiếu Labo trong EMR, lời dặn sau khám đầy đủ.
- Phân quyền phụ tá đúng ma trận (Tab A/B/G/I hạn chế; cấm kê thuốc / chốt ca).
- Addendum sau khi khóa bệnh án.
- Cờ banner dị ứng nhấp nháy, trạng thái consent trên header.
- UI thu hồi consent (API revoke đã có).
- Rollback `2 → 1` khi consent REVOKED trước khi thủ thuật xong.
- **Không nhầm với MySign:** chữ ký PNG trên tablet là đồng thuận **người bệnh**; MySign là chữ ký số **Bác sĩ / Kế toán trưởng** (mục 4.14).

---

### 4.5 Thu ngân & ca quỹ — **PARTIAL → gần DONE luồng chính**

Đã có:

- Mở ca (`openingFloat`), thu tiền `CASH` / `BANK_TRANSFER` / `CARD`.
- Tiền mặt bắt buộc gắn ca `OPEN`; idempotency key; thu đúng số còn phải thu (exact balance).
- Đóng ca → `PENDING_CLOSE` (kể cả khi khớp tiền).
- Đối soát độc lập: `ADMIN` hoặc `CHIEF_ACCOUNTANT` **khác** người mở ca → `RECONCILED`.
- UI: hàng chờ status `3`, mở/đóng ca, duyệt ca.

Còn thiếu:

- Cọc, ghi nợ, hoàn tiền.
- Chiết khấu + ma trận duyệt, trần làm tròn `MAX_ROUNDING_AMOUNT`.
- Ngưỡng `CASH_OVER_SHORT_THRESHOLD` và hạch toán 1388/3388.
- Hóa đơn điện tử.
- Kế toán viên đối soát (API reconcile hiện ADMIN / CHIEF_ACCOUNTANT).

---

### 4.6 Kho vật tư — **PARTIAL → luồng FIFO/reserve dùng được**

Đã có:

- Sản phẩm, kho, tồn theo lô (hạn dùng, serial tùy chọn, reserved/blocked/available).
- Nhập kho; xuất FIFO tách lô trong transaction; không xuất lô hết hạn.
- Reserve → Consume → Release (lý do ≥ 5 ký tự); hết hạn reservation khi consume.
- UI: tồn, cận hạn, tồn thấp, giữ/tiêu thụ/giải phóng.

Còn thiếu:

- Serial duy nhất bắt buộc với hàng cấy ghép.
- Xuất hủy hết hạn/hư hỏng có quy trình riêng.
- Job tự động release reservation hết hạn.
- Đối soát kế toán kho (621/152/156/632 tự động).
- UI xuất theo `visitId` (field có nhưng danh sách lượt khám trống).

---

### 4.7 Tiệt trùng — **PARTIAL** (list/create)

Đã có: ghi chu trình hấp (nhiệt độ, áp suất, phút, PENDING/PASSED/FAILED); PASSED → `SterileUntil` +30 ngày.

Còn thiếu: tem QR khay, quét tại ghế, FEFO gói dụng cụ, cấm dùng khay hết hạn trong EMR.

---

### 4.8 Labo — **PARTIAL** (list/create)

Đã có: phiếu gắn visit đang hoạt động (`1–4`), mã `LB#…`.

Còn thiếu: vòng đời gửi → nhận → gắn → rework; công nợ Labo; đóng vòng rework.

---

### 4.9 Bảo hiểm — **PARTIAL** (list/create)

Đã có: claim từ visit status `3` hoặc `4` và `TotalAmount > 0`; loại COMMERCIAL / BHYT.

Còn thiếu: SUBMITTED → APPROVED/DISPUTED; XML Bảng 1-2-3 QĐ 4210; số tiền được duyệt.

---

### 4.10 Bảo hành — **PARTIAL** (list/create)

Đã có: cấp thẻ cho visit `Status = 4`; số tháng hiệu lực.

Còn thiếu: kích hoạt ca bảo hành miễn phí (cùng cơ chế `2 → 4` 0đ); hết hạn tự động; lịch sử sử dụng thẻ.

---

### 4.11 Kế toán — **PARTIAL**

Đã có:

- Chart of accounts (111, 112, 131, 152, 156, 331, 511, 632, 641, 642, 811 + bản 004).
- Tạo bút toán cân Nợ=Có (≥ 2 dòng); SoD: người lập không tự duyệt; UI nhập `linesJson`.

Còn thiếu:

- Ma trận định khoản tự động từ thu/chi/kho.
- POSTED / ghi sổ / báo cáo tài chính.
- VAT theo chính sách phòng khám (không suy từ một khoản thu).
- UI dòng bút toán thân thiện (không JSON).
- Kế toán trưởng ký MySign trước khi chứng từ sang `DA_HACH_TOAN` / `POSTED` (mục 4.14).

---

### 4.12 Nhân sự & TSCĐ — **PARTIAL** (list/create)

Đã có: nhân viên (chức danh, CCHN, SĐT mã hóa); TSCĐ (ghế, imaging, autoclave, nguyên giá, số tháng KH).

Còn thiếu: chấm công, bảng lương, hoa hồng cash-basis + clawback; khấu hao định kỳ TK 2141; lịch bảo trì.

---

### 4.13 Audit, lưu trữ, hạ tầng — **PARTIAL**

Đã có: `AuditLogs` cho login, tạo user, đọc/tạo BN/visit, EMR/consent, thu, kho, module operations; session context khi xóa.

Còn thiếu: break-glass 60 phút; cold storage 10–15 năm; DR tự động; e-invoice; 2FA.

---

## 5. Bản đồ API (đã implement)

Mọi route trừ `/health` và login cần JWT.

| Method | Path | Ghi chú |
|:---|:---|:---|
| POST | `/api/auth/login` | Rate limit |
| POST | `/api/auth/users` | ADMIN |
| GET | `/api/staff/doctors` | |
| GET/POST | `/api/patients` | POST: RECEPTIONIST |
| DELETE | `/api/patients/:patientId` | Soft-delete |
| GET/POST | `/api/visits` | POST: RECEPTIONIST |
| PATCH | `/api/visits/:visitId/status` | |
| GET/POST | `/api/clinical/services` | |
| GET/PUT | `/api/clinical/visits/:visitId/emr` | |
| POST | `/api/clinical/visits/:visitId/services` | |
| POST | `/api/clinical/consents` | |
| POST | `/api/clinical/consents/:consentId/revoke` | |
| POST | `/api/clinical/visits/:visitId/settle` | |
| GET | `/api/cashier/shifts/current` | |
| GET | `/api/cashier/shifts/pending` | |
| GET | `/api/cashier/payments` | |
| POST | `/api/cashier/shifts/open` | |
| POST | `/api/cashier/shifts/close` | |
| POST | `/api/cashier/shifts/:id/reconcile` | SoD |
| POST | `/api/visits/:visitId/payments` | Idempotent |
| GET/POST | `/api/inventory/products` | |
| GET/POST | `/api/inventory/warehouses` | |
| GET | `/api/inventory` | Tồn lô |
| POST | `/api/inventory/receipts` | |
| POST | `/api/inventory/issues` | FIFO |
| GET | `/api/inventory/reservation-visits` | |
| GET/POST | `/api/inventory/reservations` | |
| POST | `/api/inventory/reservations/:id/consume` | |
| POST | `/api/inventory/reservations/:id/release` | |
| GET/POST | `/api/sterilization/cycles` | |
| GET/POST | `/api/operations/labo` | |
| GET/POST | `/api/insurance/claims` | |
| GET/POST | `/api/warranties` | |
| GET/POST | `/api/hr/employees` | |
| GET/POST | `/api/assets` | |
| GET/POST | `/api/accounting/journals` | |
| POST | `/api/accounting/journals/:id/approve` | SoD |

---

## 6. File quan trọng khi sửa code

| File | Vai trò |
|:---|:---|
| `Quy_trinh_v13_NhaKhoa.md` | Đặc tả nghiệp vụ mục tiêu (bảng §0.1 **lỗi thời** so với code; ưu tiên README + file này) |
| `backend/README.md` | Setup, gap kỹ thuật, chart of accounts |
| `backend/src/domain/invariants.ts` | Chuyển trạng thái visit, FIFO, journal, đóng ca |
| `backend/src/middleware/auth.ts` | Role |
| `backend/src/security/pii.ts` | Mã hóa PII |
| `frontend/src/App.tsx` | Toàn bộ UI |
| `frontend/src/api.ts` | Client fetch + danh sách section |

Khi thêm module: schema SQL (kèm `*Deleted` + trigger) → API + RBAC + audit → UI + cập nhật **mục 4 và mục 8** của file này.

---

## 7. Gợi ý thứ tự update tiếp theo

Ưu tiên bám v13 và phần đã có nền:

1. Sửa quyền tạo BN/visit cho ADMIN; popup trùng hồ sơ trên UI.
2. Gắn revoke consent với chuyển `2 → 1`; nút thu hồi trên EMR.
3. Phân quyền phụ tá trên EMR; khóa tab sau chốt.
4. Vòng đời Labo / insurance / warranty (PATCH status), không chỉ create.
5. Quét khay tiệt trùng + chặn EMR nếu hết hạn.
6. Chiết khấu / làm tròn / cọc-hoàn; ngưỡng lệch két.
7. Ma trận định khoản tự động + bỏ nhập JSON.
8. MFA, break-glass, integration test.

**Cố ý chưa làm (Lean MVP):** booking lịch phức tạp, CSKH omnichannel, PO mua hàng nhiều cấp.

---

## 8. Changelog (ghi tiếp mỗi lần update)

Quy tắc: mỗi lần xong một chức năng, thêm một mục **mới nhất ở trên**. Đánh dấu lại bảng mục 4.

### 2026-10-09 — Rà soát baseline & tạo file này

- Rà soát `frontend` + `backend` + SQL 001–004 so với v13.
- Kết luận: UI đủ 13 màn hình; lõi tiếp nhận / EMR-consent / thu ngân-ca quỹ / kho FIFO-reserve đã chạy happy-path.
- Module tiệt trùng, Labo, BH, bảo hành, HR, TSCĐ: **chỉ list + create**.
- Chưa production; thiếu MFA, HĐĐT, payroll, journal matrix, test tích hợp.

---

*Cập nhật file này cùng lúc với code. Không đánh **DONE** nếu thiếu một trong: schema, API, UI, test nhánh lỗi chính.*
