# Repository

Tài liệu này là bản đồ cấu trúc và đầu mối cập nhật các chức năng của DentalCare ERP. Khi thêm, đổi tên hoặc chuyển module, cập nhật mục tương ứng tại đây.

## Cấu trúc hiện tại

```text
backend/
  src/
    features/
      auth/routes.ts
      cashier/routes.ts
      emr/routes.ts
      erp/routes.ts
      inventory/reservations.ts
      operations/routes.ts
    cli/                 # Công cụ khởi tạo và dữ liệu demo
    domain/              # Quy tắc nghiệp vụ dùng chung
    middleware/          # Xác thực, phân quyền và xử lý lỗi
    security/            # Chính sách mật khẩu và bảo vệ dữ liệu
    services/            # Dịch vụ dùng chung
  sql/                   # Migration cơ sở dữ liệu, chạy theo thứ tự số
frontend/
  src/
    features/
      cashier/CashierWorkspace.tsx
      dashboard/Dashboard.tsx
      emr/EmrWorkspace.tsx
      inventory/InventoryWorkspace.tsx
      operations/OperationalModule.tsx
      patient-care/PatientsAndVisits.tsx
    shared/               # Thành phần và dữ liệu dùng chung
    App.tsx               # Đăng nhập, điều hướng và khung ứng dụng
    api.ts                # Gọi API, kiểu dữ liệu và tiện ích định dạng
```

Backend và frontend vẫn là hai ứng dụng độc lập, mỗi ứng dụng có package, cấu hình và lệnh chạy riêng. Các module đặt trong `src/features/<ten-chuc-nang>`; mã dùng chung không thuộc riêng chức năng nào nằm ngoài `features`.

## Bản đồ chức năng

| Chức năng | Frontend | Backend / API |
| --- | --- | --- |
| Đăng nhập và tài khoản | `frontend/src/App.tsx` (màn hình đăng nhập và phiên làm việc) | `backend/src/features/auth/routes.ts` |
| Tổng quan | `frontend/src/features/dashboard/Dashboard.tsx` | Dùng dữ liệu bệnh nhân, lượt khám và kho từ các route ERP hiện có |
| Tiếp nhận và hồ sơ bệnh nhân | `frontend/src/features/patient-care/PatientsAndVisits.tsx` | `backend/src/features/erp/routes.ts` (bệnh nhân, lượt khám); `backend/src/features/emr/routes.ts` (danh sách bác sĩ) |
| Bệnh án điện tử | `frontend/src/features/emr/EmrWorkspace.tsx` | `backend/src/features/emr/routes.ts` |
| Thu ngân và ca quỹ | `frontend/src/features/cashier/CashierWorkspace.tsx` | `backend/src/features/cashier/routes.ts` |
| Kho vật tư | `frontend/src/features/inventory/InventoryWorkspace.tsx` | `backend/src/features/inventory/reservations.ts` và `backend/src/features/erp/routes.ts` |
| Vô khuẩn, Labo, bảo hiểm, bảo hành, kế toán, nhân sự, tài sản | `frontend/src/features/operations/OperationalModule.tsx` (màn hình cấu hình dùng chung) | `backend/src/features/operations/routes.ts`; một số API dùng chung hiện vẫn nằm trong `backend/src/features/erp/routes.ts` |

`backend/src/features/erp/routes.ts` hiện là nhóm route tổng hợp từ cấu trúc trước đây, gồm bệnh nhân, lượt khám, kho cơ bản và kế toán. Khi phát triển sâu các nghiệp vụ này, hãy tách route vào feature tương ứng và cập nhật lại bản đồ trên. Tương tự, màn hình `operations` hiện dùng một thành phần chung cho nhiều mục; có thể tách thành phần riêng khi từng mục phát triển độc lập.

## Thành phần dùng chung và dữ liệu

- `frontend/src/shared/components.tsx`: trạng thái, modal, thống kê và các thành phần bảng dùng lại.
- `frontend/src/shared/constants.ts`: nhãn vai trò hiển thị.
- `frontend/src/api.ts`: kiểu dữ liệu giao tiếp chung và hàm gọi API; kiểu chỉ phục vụ một feature nên được đặt gần feature đó.
- `backend/src/index.ts`: cấu hình ứng dụng Express và đăng ký các router.
- `backend/src/config.ts`, `db.ts`, `middleware/`, `domain/`, `security/`, `services/`: hạ tầng hoặc logic dùng chung, không đặt lặp lại trong feature.
- `backend/sql/`: các script schema/migration; thêm script mới theo số thứ tự và ghi rõ thứ tự chạy trong hướng dẫn database.

## Quy ước cập nhật

1. Đặt mã giao diện tại `frontend/src/features/<ten-chuc-nang>/` và mã API tại `backend/src/features/<ten-chuc-nang>/`.
2. Dùng cùng tên thư mục cho một chức năng ở cả hai ứng dụng khi chức năng có cả giao diện và API. Nếu một phía chưa có module riêng, ghi rõ nơi xử lý hiện tại trong bản đồ chức năng.
3. Đăng ký router mới tại `backend/src/index.ts`; để `App.tsx` chủ yếu điều phối màn hình, đăng nhập và bố cục chung.
4. Giữ các tiện ích, xác thực, phân quyền và quy tắc dùng bởi nhiều chức năng ở vùng dùng chung; không sao chép chúng sang từng feature.
5. Khi thay đổi API hoặc schema, cập nhật kiểu dữ liệu liên quan, script trong `backend/sql/` nếu cần, và phần chức năng tương ứng trong tài liệu này.
6. Chạy build và test ở ứng dụng bị ảnh hưởng trước khi hoàn tất.

## Lệnh kiểm tra

Chạy lệnh trong thư mục ứng dụng tương ứng:

```powershell
# Backend
cd backend
npm run build
npm test

# Frontend
cd frontend
npm run build
npm test
```
