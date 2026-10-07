# NhaKhoa OS — Dental Clinic ERP & EMR API

Backend API hệ thống quản lý phòng khám nha khoa (ERP + EMR), viết bằng **NestJS 11 + Prisma 7 + Microsoft SQL Server**, kèm giao diện vận hành web tại `/`.

Báo cáo đánh giá đầy đủ tính năng: [`DANH_GIA_TINH_NANG.md`](DANH_GIA_TINH_NANG.md)

---

## 1. Yêu cầu hệ thống

| Thành phần | Yêu cầu |
|:---|:---|
| Node.js | `>= 20` |
| npm | `>= 10` |
| SQL Server | Đã có database `DoAnTotNghiep` và bật cổng `1433` |

---

## 2. Cách chạy

```powershell
# 1. Cài đặt thư viện
npm install

# 2. Sinh Prisma Client
npm run prisma:generate

# 3. Nạp tài khoản đăng nhập (bắt buộc)
npm run db:seed

# 4. Chạy ứng dụng (chế độ phát triển)
npm run start:dev
```

Mở trình duyệt: **http://localhost:3000**

### Chạy chế độ production

```powershell
npm run build
npm start
```

### Kiểm thử

```powershell
npm test
```

---

## 3. Tài khoản đăng nhập theo vai trò

Dùng một trong các tài khoản sau để đăng nhập tại http://localhost:3000

| Vai trò | Tên đăng nhập | Mật khẩu | Mô tả |
|:---|:---|:---|:---|
| ADMIN | `Admin` | `Admin1234@` | Quản trị viên |
| RECEPTIONIST | `TiepNhan` | `TiepNhan1234@` | Nhân viên tiếp nhận / thu ngân |
| DOCTOR | `BacSi` | `BacSi1234@` | Bác sĩ điều trị (EMR, chốt dịch vụ) |
| ASSISTANT | `PhuTa` | `PhuTa1234@` | Phụ tá điều dưỡng |
| ACCOUNTANT | `Ketoan` | `Ketoan1234@` | Kế toán viên |
| CHIEF_ACCOUNTANT | `KeToanTruong` | `KeToanTruong1234@` | Kế toán trưởng |
| INVENTORY_MANAGER | `Kho` | `Kho12345@` | Quản lý kho vật tư |

> Mật khẩu chỉ dùng cho môi trường phát triển. Chính sách: tối thiểu 9 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.
