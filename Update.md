# DentalCare ERP — chức năng hiện có

**Cập nhật:** 09/10/2026
**Phạm vi tài liệu:** chức năng đang được triển khai trong mã nguồn hiện tại; đây không phải danh sách yêu cầu tương lai hay tuyên bố hệ thống đã sẵn sàng production.

## 1. Hệ thống

DentalCare ERP là ứng dụng quản lý phòng khám nha khoa gồm giao diện React/Vite, API Node.js/Express và cơ sở dữ liệu SQL Server.

| Thành phần | Hiện trạng |
| --- | --- |
| Frontend | React 19, TypeScript, Vite; chạy mặc định tại `http://127.0.0.1:5173` |
| Backend | Node.js, Express 5, TypeScript; cổng mặc định `3000` |
| Database | SQL Server; migration tại `backend/sql/001` đến `004` |
| API health | `GET /health` |
| Đăng nhập | JWT Bearer; đăng nhập giới hạn 50 lần trong 15 phút |
| Mã hóa dữ liệu nhạy cảm | AES-256-GCM cho dữ liệu được bảo vệ; HMAC lookup hash cho so khớp CCCD |
| Lưu vết/xóa | Audit log cho các thao tác nghiệp vụ được tích hợp; cơ chế soft-delete và bảng lưu bản ghi xóa được tạo trong migration |

## 2. Vai trò và màn hình

Backend chấp nhận bảy vai trò. Sidebar và lối tắt dashboard được lọc theo role; API cũng xác thực JWT và kiểm tra quyền trên từng route.

| Vai trò | Màn hình được cấp trên UI |
| --- | --- |
| `ADMIN` | Tổng quan, Tiếp nhận, Hồ sơ bệnh nhân, EMR, Thu ngân, Kho, Vô khuẩn, Labo, Bảo hiểm, Bảo hành, Kế toán, Nhân sự, Tài sản |
| `RECEPTIONIST` | Tổng quan, Tiếp nhận, Hồ sơ bệnh nhân, Thu ngân, Kho (xem), Bảo hiểm, Bảo hành |
| `DOCTOR` | Tổng quan, Tiếp nhận, Hồ sơ bệnh nhân, EMR, Kho, Labo, Bảo hành |
| `ASSISTANT` | Tổng quan, Tiếp nhận, Hồ sơ bệnh nhân, EMR, Kho, Vô khuẩn, Labo |
| `ACCOUNTANT` | Tổng quan, Thu ngân, Kho, Bảo hiểm, Kế toán, Nhân sự, Tài sản |
| `CHIEF_ACCOUNTANT` | Tổng quan, Thu ngân, Kho, Bảo hiểm, Kế toán |
| `INVENTORY_MANAGER` | Tổng quan, Kho, Vô khuẩn, Tài sản |

Quyền ghi chính:

- `ADMIN` và `RECEPTIONIST`: tạo hồ sơ bệnh nhân/lượt khám; `ADMIN` và `INVENTORY_MANAGER`: quản lý danh mục kho, nhận hàng.
- `DOCTOR` và `ADMIN`: sửa EMR, chỉ định dịch vụ và chốt chuyên môn. Bác sĩ bị giới hạn theo lượt khám được phân công ở các nghiệp vụ tương ứng.
- `RECEPTIONIST` và `ADMIN`: mở ca và thu tiền; `ADMIN` hoặc `CHIEF_ACCOUNTANT` khác người thực hiện mới được đối soát ca.
- `ACCOUNTANT`: lập bút toán; `CHIEF_ACCOUNTANT`: duyệt bút toán của người khác. `ADMIN` chỉ xem danh sách bút toán.
- `ASSISTANT` được tạo chu trình tiệt trùng và phiếu Labo nhưng không được sửa EMR.

## 3. Chức năng theo nghiệp vụ

### Đăng nhập, người dùng và dashboard

- Đăng nhập kiểm tra mật khẩu bằng bcrypt, phát JWT; API yêu cầu JWT ngoại trừ `/health` và đăng nhập.
- `ADMIN` có thể tạo người dùng với một trong bảy role; mật khẩu phải dài 9–200 ký tự, có chữ hoa và ký tự đặc biệt.
- Dashboard tải dữ liệu lượt khám, bệnh nhân và tồn kho theo quyền của role; hiển thị chỉ số, lượt gần đây và lối tắt được phép.

### Hồ sơ bệnh nhân và tiếp nhận

- Tra cứu danh sách bệnh nhân và tìm theo thông tin hỗ trợ; tạo hồ sơ với thông tin liên hệ, định danh, dị ứng và tiền sử.
- Phát hiện trùng theo số điện thoại hoặc định danh; API trả kết quả trùng để giao diện cảnh báo.
- Thông tin định danh và ghi chú nhạy cảm được bảo vệ khi lưu; hỗ trợ xóa mềm bệnh nhân kèm lý do.
- Tạo lượt khám gắn bệnh nhân với bác sĩ đang hoạt động; mã lượt khám được sinh theo ngày.
- Trạng thái lượt khám được quản lý theo các bước `0` chờ, `1` đang khám, `2` đã chốt chuyên môn, `3` chờ thanh toán, `4` hoàn tất; `-1` là đã hủy. API giới hạn chuyển trạng thái và vai trò được phép thực hiện.
- Giao diện hỗ trợ danh sách, tìm kiếm, tạo hồ sơ/lượt khám và thao tác hủy lượt theo quyền.

### Bệnh án điện tử (EMR) và đồng thuận

- Chọn lượt khám; xem và lưu sinh hiệu, chẩn đoán, diễn biến lâm sàng và sơ đồ răng FDI.
- Tra cứu danh mục dịch vụ, thêm dịch vụ vào lượt khám; giá được ghi nhận cùng dòng chỉ định.
- Ghi nhận đồng thuận điện tử cho dịch vụ xâm lấn, gồm chữ ký trên giao diện và người làm chứng; API hỗ trợ thu hồi đồng thuận kèm lý do.
- Chốt chuyên môn kiểm tra EMR đã lưu và đồng thuận cho các dịch vụ xâm lấn; lượt khám miễn phí không được chốt kèm dịch vụ tính phí.
- Nội dung EMR chuyển sang chỉ đọc sau khi chốt; có thao tác hủy chốt/mở sửa trước bước thanh toán theo quy tắc chuyển trạng thái.

### Thu ngân và ca quỹ

- Xem lượt chờ thanh toán, ca hiện tại, lịch sử giao dịch và ca chờ đối soát.
- Mở ca với tiền đầu ca; ghi nhận thanh toán bằng tiền mặt, chuyển khoản hoặc thẻ.
- Tiền mặt cần gắn ca đang mở; giao dịch có idempotency key, không thu vượt số dư phải trả. Thu đủ tiền hoàn tất lượt khám.
- Đóng ca ghi nhận tiền kiểm đếm và chênh lệch, chuyển sang chờ đối soát; người đối soát phải khác người mở ca.

### Kho vật tư

- Xem mặt hàng, kho, lô hàng, tồn khả dụng, hàng cận hạn và cảnh báo tồn thấp.
- Tạo mặt hàng/kho; nhập hàng theo lô, hạn dùng, số lượng, đơn giá và serial tùy chọn.
- Xuất kho phân bổ FIFO theo thứ tự nhận lô, loại lô hết hạn và kiểm tra tồn khả dụng; giao dịch kho được ghi nhận.
- Dự trữ vật tư cho lượt khám; hỗ trợ tiêu thụ hoặc giải phóng dự trữ. Giải phóng yêu cầu lý do; dự trữ hết hạn được xử lý khi tiêu thụ.

### Vô khuẩn

- Tra cứu và ghi nhận chu trình hấp gồm thiết bị, nhiệt độ, áp suất, thời lượng và kết quả chỉ thị `PENDING`, `PASSED` hoặc `FAILED`.
- Chu trình đạt tạo thời hạn vô trùng 30 ngày. Màn hình hiển thị thông tin trạng thái chu trình.

### Labo

- Tra cứu và tạo phiếu Labo gắn với lượt khám, xưởng, mô tả sản phẩm, ngày hẹn và chi phí ước tính; mã phiếu được sinh tự động.
- Màn hình tổng hợp số phiếu và trạng thái hiện có. API cung cấp danh sách/tạo phiếu.

### Bảo hiểm

- Tra cứu và tạo hồ sơ yêu cầu bảo hiểm thương mại hoặc BHYT, gắn với lượt khám đã chốt có phát sinh phí.
- Lưu đơn vị chi trả, số tiền yêu cầu và trạng thái ban đầu của hồ sơ.

### Bảo hành

- Tra cứu và cấp thẻ bảo hành dịch vụ gắn lượt khám hoàn tất; lưu tên dịch vụ và thời hạn hiệu lực theo tháng.

### Kế toán

- Tra cứu danh sách bút toán.
- Kế toán viên tạo bút toán nháp từ các dòng định khoản; yêu cầu tối thiểu hai dòng, số tiền hợp lệ một bên Nợ/Có và tổng Nợ bằng tổng Có.
- Kế toán trưởng duyệt bút toán do người khác lập; ràng buộc phân nhiệm được kiểm tra ở API và cơ sở dữ liệu.
- Migration cung cấp danh mục tài khoản kế toán, bao gồm các tài khoản bổ sung theo TT 99/2025/TT-BTC.

### Nhân sự và tài sản

- Nhân sự: tra cứu và thêm hồ sơ gồm họ tên, chức danh, số chứng chỉ hành nghề và điện thoại; trường điện thoại được bảo vệ khi lưu.
- Tài sản: tra cứu và ghi tăng tài sản theo nhóm thiết bị, số serial, ngày ghi tăng, nguyên giá và thời gian sử dụng.

### Bảo mật, audit và dữ liệu

- Middleware kiểm tra JWT, role và quyền theo route; request nghiệp vụ được kiểm tra dữ liệu đầu vào.
- Ghi nhận audit cho đăng nhập và các thao tác được tích hợp như đọc/tạo hồ sơ, EMR/đồng thuận, thanh toán, kho và module vận hành.
- Migration `001` tạo schema nền cho user, bệnh nhân, lượt khám, kho, kế toán, ca quỹ, thanh toán và audit; `002` hỗ trợ lưu ghi chú bệnh nhân đã bảo vệ; `003` bổ sung EMR, đồng thuận và các module lâm sàng/vận hành; `004` bổ sung danh mục tài khoản.

## 4. API hiện có

Các API nghiệp vụ nằm dưới `/api`; mọi route được bảo vệ bằng JWT và/hoặc kiểm tra role theo cấu hình route.

| Nhóm | Route hiện có |
| --- | --- |
| Auth | `POST /api/auth/login`, `POST /api/auth/users` |
| Bệnh nhân/lượt khám | `GET/POST /api/patients`, `DELETE /api/patients/:patientId`, `GET/POST /api/visits`, `PATCH /api/visits/:visitId/status`, `GET /api/staff/doctors` |
| Dịch vụ/EMR/đồng thuận | `GET/POST /api/clinical/services`, `GET/PUT /api/clinical/visits/:visitId/emr`, `POST /api/clinical/visits/:visitId/services`, `POST /api/clinical/consents`, `POST /api/clinical/consents/:consentId/revoke`, `POST /api/clinical/visits/:visitId/settle` |
| Thu ngân | `GET /api/cashier/shifts/current`, `GET /api/cashier/shifts/pending`, `GET /api/cashier/payments`, `POST /api/cashier/shifts/open`, `POST /api/cashier/shifts/close`, `POST /api/cashier/shifts/:id/reconcile`, `POST /api/visits/:visitId/payments` |
| Kho/dự trữ | `GET/POST /api/inventory/products`, `GET/POST /api/inventory/warehouses`, `GET /api/inventory`, `POST /api/inventory/receipts`, `POST /api/inventory/issues`, `GET /api/inventory/reservation-visits`, `GET/POST /api/inventory/reservations`, `POST /api/inventory/reservations/:id/consume`, `POST /api/inventory/reservations/:id/release` |
| Vận hành | `GET/POST /api/sterilization/cycles`, `/api/operations/labo`, `/api/insurance/claims`, `/api/warranties`, `/api/hr/employees`, `/api/assets` |
| Kế toán | `GET/POST /api/accounting/journals`, `POST /api/accounting/journals/:id/approve` |

## 5. Phạm vi API ở các module vận hành

Phần này mô tả đúng hành động hiện được cung cấp, không suy diễn rằng trường trạng thái trong database đã có vòng đời thao tác tương ứng:

- Chu trình vô khuẩn, phiếu Labo, hồ sơ bảo hiểm, thẻ bảo hành, nhân sự và tài sản: API danh sách/tạo (`GET`/`POST`).
- Bút toán: danh sách, tạo và duyệt; giao diện nhập các dòng định khoản ở dạng JSON.
- Bệnh nhân: danh sách, tạo và xóa mềm; chưa có API cập nhật hồ sơ.
- Danh mục sản phẩm/kho: danh sách và tạo; luồng kho có nhập, xuất và quản lý dự trữ.
- Các bảng trạng thái của Labo/bảo hiểm/bảo hành không tự tạo thành luồng chuyển trạng thái; các API cập nhật/chuyển trạng thái tương ứng chưa được cung cấp.
- UI kho/vô khuẩn chưa có luồng tem QR khay và quét tại ghế; các chức năng kho hiện tại áp dụng FIFO theo lô hàng, không ghi nhận quy trình quét dụng cụ tại ghế.

## 6. Kiểm thử và xác minh ngày 09/10/2026

### Tự động

- Backend: `npm test` — **3 file, 15 test đạt**; gồm chính sách mật khẩu, bảo vệ PII, bất biến chuyển trạng thái lượt khám, đối soát ca, phân bổ FIFO và cân bút toán.
- Frontend: `npm test` — **1 file, 4 test đạt**; kiểm tra ma trận quyền menu/tạo theo role.
- `npm run build` backend: **đạt**.
- `npm run build` frontend: **đạt**.

### Kiểm tra trực tiếp trên ứng dụng

- API `GET /health` và proxy `/health` qua Vite trả trạng thái `ok`.
- Đăng nhập trực tiếp thành công với cả 7 tài khoản demo đã ghi trong `README.md`.
- Mở Dashboard và tất cả menu được cấp cho từng role: **50 lượt mở màn hình**, không thấy lỗi API `4xx`/`5xx` hoặc lỗi runtime JavaScript.
- Kiểm tra quyền tạo trên **36 tổ hợp role/màn hình**: nút xuất hiện đúng ma trận quyền; mở form thành công ở mọi trường hợp được phép.
- Không gửi form tạo, không thu tiền, không thay đổi trạng thái nghiệp vụ và không xóa dữ liệu trong lượt kiểm tra này. Vì vậy các thao tác ghi và toàn bộ vòng đời tích hợp chưa được xác nhận bằng kiểm thử end-to-end trên dữ liệu mới.
- Khi mở màn hình Thu ngân, trạng thái rỗng của hàng chờ thanh toán hiển thị bình thường; không còn cảnh báo DOM/hydration đã thấy trước đó.

### Lệnh chạy kiểm tra

Chạy từ từng thư mục ứng dụng:

```powershell
# Backend
npm test
npm run build

# Frontend
npm test
npm run build
```
