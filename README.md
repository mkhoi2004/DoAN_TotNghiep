# DentalCare ERP

Ứng dụng quản lý phòng khám nha khoa, gồm giao diện React/Vite, API
Node.js/Express và cơ sở dữ liệu Microsoft SQL Server. Repo hiện là baseline
MVP để demo và phát triển; **chưa phải hệ thống production-ready**, EMR pháp lý
hoàn chỉnh hay phần mềm kế toán hoàn chỉnh.

## 1. Tính năng hiện có

- Đăng nhập JWT và phân quyền theo vai trò.
- Tiếp nhận bệnh nhân, tạo hồ sơ và lượt khám.
- EMR: sinh hiệu, chẩn đoán, ghi chú mã hóa, sơ đồ răng và chỉ định dịch vụ.
- Ký đồng thuận điều trị bằng chữ ký trên giao diện; chặn chốt khi thiếu đồng
  thuận cho dịch vụ xâm lấn.
- Chốt lượt khám, thu ngân, thanh toán và đóng/đối soát ca.
- Kho theo lô, FIFO và dự trữ vật tư.
- Các màn hình vận hành tiệt trùng, Labo, bảo hiểm, bảo hành, kế toán, nhân sự
  và tài sản; một số module mới hỗ trợ một phần luồng list/create.

Trạng thái lượt khám: `-1` đã hủy, `0` mới, `1` đang khám, `2` đã chốt chuyên
môn, `3` chờ thanh toán, `4` hoàn tất. Chốt chuyên môn khóa EMR; người có quyền
có thể hủy chốt `2 → 1` để chỉnh sửa. Hủy chờ thanh toán `3 → 2` chỉ được phép
khi chưa ghi nhận thanh toán; trạng thái `4` không được mở lại. Ứng dụng hiện
chưa có chức năng in phiếu/hóa đơn.

Tích hợp chữ ký số MySign/Viettel-CA đang tạm hoãn. Bước chốt/duyệt nội bộ
không phải chữ ký số có giá trị pháp lý.

## 2. Cấu trúc dự án

```text
backend/       API Express + TypeScript, kết nối SQL Server
  sql/         Script khởi tạo và migration cơ sở dữ liệu
  src/         Routes, nghiệp vụ, xác thực và bảo mật
frontend/      Ứng dụng React 19 + Vite 6
Update.md      Nhật ký tính năng, tiến độ và các phần còn thiếu
```

## 3. Yêu cầu môi trường (Windows)

- Windows 10/11.
- Node.js 22 trở lên và npm.
- SQL Server (ví dụ SQL Server Express) đang chạy và có thể kết nối.
- Microsoft ODBC Driver 18 for SQL Server.
- `sqlcmd` để chạy các script SQL.
- Tài khoản Windows hiện tại được cấp quyền kết nối SQL Server; khi chạy lần
  đầu cần có quyền tạo database và áp dụng schema.

Kiểm tra công cụ trong PowerShell:

```powershell
node --version
npm --version
sqlcmd -?
```

Tên SQL Server trong ví dụ là `DESKTOP-F5CFA0D\SQLEXPRESS`. Thay giá trị này
bằng instance SQL Server trên máy của bạn. Các script hiện tạo database
`DoAnTotNghiep`; kiểm tra nội dung script trước khi chạy trên máy hoặc database
đã có dữ liệu. Sao lưu database trước khi áp dụng migration lên môi trường có
dữ liệu thật.

Lưu ý: `001_initial_schema.sql` hiện đặt database owner thành principal
Windows `DESKTOP-F5CFA0D\ADMIN`. Nếu máy của bạn không có principal này, sửa
dòng `ALTER AUTHORIZATION` trong script thành tài khoản SQL Server hợp lệ trước
khi chạy.

## 4. Cài đặt và khởi tạo database

Mở PowerShell tại thư mục repo:

```powershell
cd C:\Users\<TEN_NGUOI_DUNG>\Documents\GitHub\DoAN_TotNghiep
```

### 4.1 Cài thư viện

```powershell
cd backend
npm install
cd ..\frontend
npm install
cd ..\backend
```

### 4.2 Tạo cấu hình backend

Tạo file riêng `backend\.env` từ mẫu:

```powershell
Copy-Item .env.example .env
```

Sinh ba giá trị bí mật độc lập bằng Node.js:

```powershell
node -e "const c=require('crypto'); console.log('JWT_SECRET='+c.randomBytes(32).toString('hex')); console.log('PII_ENCRYPTION_KEY='+c.randomBytes(32).toString('hex')); console.log('PII_HASH_KEY='+c.randomBytes(32).toString('hex'))"
```

Điền các giá trị được sinh vào `backend\.env`. Không dùng chung các khóa và
không đưa `.env` hoặc khóa thật lên Git. Giữ các giá trị PII ổn định sau khi đã
có dữ liệu mã hóa; nếu thay khóa, dữ liệu cũ có thể không giải mã/đối chiếu
được.

Ví dụ các biến còn lại:

```dotenv
NODE_ENV=development
PORT=3000
JWT_EXPIRES_IN_SECONDS=900
DB_SERVER=DESKTOP-F5CFA0D\SQLEXPRESS
DB_DATABASE=DoAnTotNghiep
DB_DRIVER={ODBC Driver 18 for SQL Server}
DB_TRUST_SERVER_CERTIFICATE=false
```

Điều chỉnh `DB_SERVER` theo SQL Server trên máy. `DB_TRUST_SERVER_CERTIFICATE`
chỉ nên đặt `true` trong môi trường local cần chứng thư tự ký; production phải
cấu hình chứng thư TLS đáng tin cậy.

### 4.3 Chạy script SQL đúng thứ tự

Chạy tại thư mục `backend` bằng tài khoản Windows có quyền phù hợp:

```powershell
sqlcmd -S "DESKTOP-F5CFA0D\SQLEXPRESS" -E -i .\sql\001_initial_schema.sql
sqlcmd -S "DESKTOP-F5CFA0D\SQLEXPRESS" -E -i .\sql\002_encrypt_patient_notes.sql
```

`001_initial_schema.sql` là script khởi tạo cho database trống. `002` phải chạy
trước khi tạo hồ sơ bệnh nhân; script từ chối chạy nếu đã có dữ liệu bệnh nhân.

Tạo tài khoản quản trị đầu tiên trước migration 003. Nhập mật khẩu qua prompt
bảo mật (không ghi mật khẩu vào câu lệnh):

```powershell
$env:BOOTSTRAP_ADMIN_USERNAME = "admin"
$securePassword = Read-Host "Nhập mật khẩu quản trị" -AsSecureString
$env:BOOTSTRAP_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
npm run bootstrap-admin
Remove-Item Env:\BOOTSTRAP_ADMIN_USERNAME
Remove-Item Env:\BOOTSTRAP_ADMIN_PASSWORD
```

Mật khẩu phải có ít nhất 9 ký tự, chữ hoa và ký tự đặc biệt. Lệnh bootstrap
chỉ hoạt động khi database chưa có tài khoản `ADMIN`.

Sau khi tạo admin, áp dụng các migration còn lại:

```powershell
sqlcmd -S "DESKTOP-F5CFA0D\SQLEXPRESS" -E -i .\sql\003_clinical_and_erp_modules.sql
sqlcmd -S "DESKTOP-F5CFA0D\SQLEXPRESS" -E -i .\sql\004_tt99_accounting_accounts.sql
```

Script `003` tạo schema EMR, đồng thuận và các module vận hành; `004` bổ sung
danh mục tài khoản kế toán. Không chạy các script khởi tạo/migration trên
database có dữ liệu mà chưa sao lưu và kiểm tra tác động.

## 5. Chạy ứng dụng local

Mở **hai terminal PowerShell** tại repo.

Terminal 1 — API:

```powershell
cd C:\Users\<TEN_NGUOI_DUNG>\Documents\GitHub\DoAN_TotNghiep\backend
npm run dev
```

API mặc định chạy tại `http://localhost:3000`. Kiểm tra:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Kết quả bình thường:

```text
status
------
ok
```

Terminal 2 — giao diện:

```powershell
cd C:\Users\<TEN_NGUOI_DUNG>\Documents\GitHub\DoAN_TotNghiep\frontend
npm run dev
```

Mở `http://127.0.0.1:5173`. Vite proxy các request `/api` và `/health` sang
backend ở cổng `3000`; vì vậy cần giữ cả hai terminal đang chạy. Đăng nhập bằng
tài khoản `ADMIN` vừa bootstrap.

## 6. Tài khoản demo theo vai trò (tùy chọn)

Không có tài khoản hay mật khẩu mặc định được lưu trong repo. Có thể tạo user
phát triển bằng seeder; seeder chỉ chạy khi `NODE_ENV` không phải `production`
và không ghi đè username đã tồn tại. Từ thư mục `backend`, nhập mật khẩu tại
prompt để không lưu trong shell history:

```powershell
$testPassword = [System.Net.NetworkCredential]::new("", (Read-Host "Mật khẩu test (ít nhất 9 ký tự, có chữ hoa và ký tự đặc biệt)" -AsSecureString)).Password
$testUsers = @(
  @{ username = "TiepNhan"; password = $testPassword; role = "RECEPTIONIST" },
  @{ username = "BacSi"; password = $testPassword; role = "DOCTOR" },
  @{ username = "KeToan"; password = $testPassword; role = "ACCOUNTANT" },
  @{ username = "KeToanTruong"; password = $testPassword; role = "CHIEF_ACCOUNTANT" }
)
$env:TEST_USERS_JSON = ConvertTo-Json -InputObject $testUsers -Compress
npm run seed-test-users
Remove-Item Env:\TEST_USERS_JSON
Remove-Variable testPassword, testUsers
```

Đổi username/mật khẩu tùy ý; không sử dụng thông tin tài khoản thật trong demo.
Seeder không tạo bệnh nhân/lượt khám mẫu. Tạo dữ liệu demo qua giao diện để
kiểm soát dữ liệu và audit log.

## 7. Luồng demo nhanh

1. Đăng nhập bằng `ADMIN`; tạo các user qua `POST /api/auth/users` (endpoint
   chỉ dành cho admin), hoặc dùng seeder phát triển ở trên.
2. Đăng nhập `RECEPTIONIST`, tạo hồ sơ bệnh nhân, mở lượt khám và gán bác sĩ.
3. Đăng nhập `DOCTOR`, vào EMR và chọn lượt khám được giao.
4. Lưu EMR và thêm chỉ định dịch vụ. Với dịch vụ xâm lấn, ghi nhận đồng thuận
   trước khi chốt.
5. Chốt chuyên môn. Status đi từ `1 → 2 → 3`; status `2` khóa nội dung EMR.
   Nếu cần sửa trước khi thanh toán, dùng **Hủy chốt · Mở sửa** (`2 → 1`).
6. Đăng nhập lễ tân để thu tiền. Khi thu đủ, lượt chuyển `3 → 4`; hiện không
   có chức năng in phiếu/hóa đơn.
7. Với kế toán: tạo bút toán cân bằng dưới user `ACCOUNTANT`; user
   `CHIEF_ACCOUNTANT` khác người lập có thể duyệt.

Tên menu/nút có thể thay đổi theo phiên bản UI. Các module Labo, tiệt trùng,
bảo hiểm, bảo hành, nhân sự, tài sản và kế toán chưa hoàn tất toàn bộ vòng đời
nghiệp vụ.

## 8. Test và build

Backend — chạy tại thư mục `backend`:

```powershell
npm test
npm run build
```

Frontend — chạy tại thư mục `frontend`:

```powershell
npm test
npm run build
```

Build production frontend tạo file trong `frontend\dist`; backend build TypeScript
ra `backend\dist`. Chạy backend đã build bằng `npm start` sau khi đã cấu hình
`.env` và database.

## 9. Một số lỗi thường gặp

| Hiện tượng | Kiểm tra / cách xử lý |
|---|---|
| API báo thiếu biến môi trường hoặc lỗi parse config | Kiểm tra `backend\.env`; các secret cần được thay bằng giá trị thật, PII keys phải đúng 64 ký tự hex. |
| Không kết nối được database | Kiểm tra SQL Server service/instance, `DB_SERVER`, database name, ODBC Driver 18 và quyền Windows Integrated Authentication của tài khoản đang chạy Node. |
| `sqlcmd` không tìm thấy server | Dùng đúng tên instance; thử kết nối bằng SSMS/SQL Server Configuration Manager và xác nhận SQL Server Browser/TCP tùy cấu hình instance. |
| Lỗi không tìm thấy bảng/cột | Xác nhận đã chạy đủ script `001`, `002`, bootstrap admin, `003`, `004` đúng thứ tự trên cùng database. |
| Đăng nhập báo sai tài khoản/mật khẩu | Không có tài khoản mặc định; tạo admin bằng bootstrap khi chưa có admin hoặc đăng nhập bằng tài khoản đã seed/tạo. |
| Giao diện không gọi được API | Đảm bảo API đang chạy cổng 3000, frontend 5173 và Vite proxy chưa bị thay đổi. Kiểm tra `http://localhost:3000/health`. |
| Chốt EMR trả lỗi thiếu đồng thuận | Kiểm tra danh mục dịch vụ có đánh dấu xâm lấn; ký đồng thuận cho từng dịch vụ bắt buộc trước khi chốt. |
| Không thể hủy bước chờ thanh toán | Chỉ được lùi `3 → 2` khi chưa có khoản thanh toán; nếu đã thu tiền, cần quy trình hoàn/đảo giao dịch (chưa triển khai đầy đủ). |

## 10. Tài liệu liên quan và lưu ý

- [backend/README.md](./backend/README.md): chi tiết API và kỹ thuật backend.
- [Update.md](./Update.md): trạng thái module, phần đã có và phần còn thiếu.
- [Quy_trinh_v13_NhaKhoa.md](./Quy_trinh_v13_NhaKhoa.md): đặc tả nghiệp vụ tham khảo.

Ứng dụng hiện chưa hoàn thiện MFA, hóa đơn điện tử, hoàn tiền/cọc, toàn bộ ma
trận định khoản, payroll, break-glass, lưu trữ lạnh, disaster recovery và kiểm
thử tích hợp end-to-end. Không triển khai với dữ liệu bệnh nhân thật trước khi
được rà soát bảo mật, quyền truy cập, chính sách backup và yêu cầu pháp lý.
