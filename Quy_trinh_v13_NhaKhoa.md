# NGHIÊN CỨU VÀ XÂY DỰNG HỆ THỐNG QUẢN LÝ PHÒNG KHÁM NHA KHOA TÍCH HỢP ERP VÀ BẢO MẬT EMR
### Phiên bản: v13 – Production-Ready Blueprint & Enterprise Governance (Vá lỗ hổng Chặt chẽ: Ngưỡng Kiểm soát Két/Làm tròn, Đồng bộ Trạng thái Đóng băng, Mở rộng Khóa chính, Xử lý Thu hồi Đồng thuận)

> [!IMPORTANT]
> **Phạm vi Lean MVP Mở rộng:** Loại bỏ triệt để Đặt lịch hẹn phức tạp, CSKH đa kênh, Mua hàng PO nhiều cấp (giữ Quản lý Tồn kho + Nhập/Xuất trực tiếp). v12/v13 tập trung hoàn thiện 100% các lỗ hổng thực tế lâm sàng nha khoa, tính liên tục của dữ liệu kế toán và an toàn pháp lý y tế.
>
> **TỔNG HỢP CÁC BẢN VÁ CHẶT CHẼ TẠI PHIÊN BẢN V13 (RÀ SOÁT ĐỘC LẬP TỪ V12):**
> 1. **[KHOẢNG TRỐNG LOGIC]** Ngưỡng `CASH_OVER_SHORT_THRESHOLD` trước đây được khai báo ở Mục 14 nhưng không hề được dùng trong quy trình đóng ca — Mục 4.7 nay tham chiếu trực tiếp ngưỡng này để phân luồng xử lý.
> 2. **[LỖ HỔNG KIỂM SOÁT]** Làm tròn tiền lẻ (Mục 4.8.3) trước đây không có trần số tiền, có thể bị lạm dụng để né Ma trận duyệt Chiết khấu (4.8.1) — nay bổ sung `MAX_ROUNDING_AMOUNT` và cơ chế bắt buộc chuyển thành Chiết khấu khi vượt trần.
> 3. **[LỖ HỔNG NGHIỆP VỤ]** Bổ sung xử lý trạng thái `REVOKED` của Giấy đồng thuận điều trị sau khi đã `SIGNED` (Mục 3.5.3, Mục 2.3) — trước đây chỉ định nghĩa enum mà không có quy trình phản ứng.
> 4. **[MẤT ĐỒNG BỘ]** Danh sách "Dòng dữ liệu đã Frozen" (Mục 15.3.2) trước đây thiếu các trạng thái mới của v12 (`RECONCILED`, `SIGNED`, `PASSED`) — nay bổ sung đầy đủ để bảo đảm tính bất biến thực sự bao trùm mọi thực thể mới.
> 5. **[THIẾU PK]** Bổ sung 3 Khóa chính còn thiếu vào danh mục (Mục 15.1): `Discount_Approval_ID`, `Addendum_ID`, `Commission_Adjustment_ID` — nâng danh mục từ 27 lên **30 thực thể bất biến**.
> 6. **[THIẾU QUY TRÌNH]** Bổ sung mô tả vòng đời `Insurance_Claim_ID` (Mục 6.3) — trước đây tồn tại trong danh mục PK nhưng không có nghiệp vụ sinh/khép hồ sơ.
> 7. **[MÂU THUẪN THUẬT NGỮ]** Hợp nhất công thức Bất biến số tiền giữa Mục 4.2 và Mục 16.1 về một công thức chuẩn duy nhất.
> 8. **[LỖ HỔNG DOANH THU]** Làm rõ Mục 8 (Bảo hành) áp dụng cùng cơ chế tự động `2 → 4` như Mục 2.5, tránh sinh phiếu thu rác 0đ cho ca bảo hành.
>
> **TỔNG HỢP CÁC NÂNG CẤP CỐT LÕI TẠI PHIÊN BẢN V12 (HOÀN THIỆN ĐỈNH CAO TỪ V10/V11):**
> 1. **[LÂM SÀNG & PHÁP LÝ] Quy trình Giấy Đồng thuận Điều trị Điện tử (Digital Informed Consent - Mục 3.5 MỚI):** Tuân thủ Luật Khám bệnh, chữa bệnh 2023 và Thông tư 46/2018/TT-BYT. Bắt buộc thu thập Chữ ký số/Chữ ký điện tử của người bệnh trên Tablet/Ký số tại ghế răng đối với thủ thuật xâm lấn (Cấy Implant, Nhổ răng khôn, Chỉnh nha, Phẫu thuật nướu). Hệ thống tự động cảnh báo/chặn Bác sĩ chốt ca nếu thiếu cam kết đồng thuận.
> 2. **[KIỂM SOÁT NHIỄM KHUẨN] Quản lý Chu trình Tiệt trùng Dụng cụ (Sterilization & Instrument Pack Tracking - Mục 5.4 MỚI):** Quản lý chu trình nồi hấp tiệt trùng (`Sterilization_Cycle_ID`), in tem mã vạch/QR dán gói dụng cụ kèm hạn vô trùng (FEFO). Phụ tá quét mã khay dụng cụ tại ghế răng trước khi điều trị; hệ thống cảnh báo nếu dụng cụ quá hạn tiệt trùng.
> 3. **[TÀI CHÍNH & VẬN HÀNH] Quản lý Ca Thu ngân & Két tiền (Cash Drawer & Shift Handover - Mục 4.7 MỚI):** Phân định rạch ròi trách nhiệm ca làm việc (`Cash_Shift_ID`), số dư đầu ca (Opening Float), tiền thực thu trong ca, biên bản bàn giao ca (Shift Close / X-Report), tự động xử lý chênh lệch tiền mặt thừa/thiếu qua TK 1388 / 3388.
> 4. **[QUẢN TRỊ DOANH THU] Phê duyệt Chiết khấu & Xử lý Làm tròn Tiền lẻ (Discount & Rounding Governance - Mục 4.8 MỚI):** Quy định ma trận thẩm quyền duyệt giảm giá theo cấp bậc; phân định hạch toán Chiết khấu thương mại (TK 5211), Chiết khấu thanh toán (TK 635) và Chênh lệch làm tròn tiền lẻ (TK 811 / 711) chuẩn hóa theo Nghị định 123/2020/NĐ-CP.
> 5. **[TỐI ƯU WORKFLOW] Xử lý Buổi Tái khám Không phát sinh Chi phí (Zero-Cost Follow-up Visits - Mục 2.5 MỚI):** Tách biệt ca tái khám theo phác đồ (thay băng tủy, cắt chỉ, kiểm tra khớp cắn định kỳ). Bác sĩ ghi nhận diễn biến lâm sàng EMR bình thường; khi chốt ca, hệ thống tự động chuyển thẳng từ `2 -> 4 Hoàn tất`, bỏ qua bước Chờ thanh toán, không phát sinh chứng từ rác 0đ.
> 6. **[THUẬT TOÁN KHO] Cơ chế Tự động Phân tách Lô Xuất kho FIFO (Auto Split-Lot FIFO Algorithm - Mục 5.3):** Đặc tả thuật toán bóc tách nhiều dòng xuất kho tự động khi một đơn thuốc/vật tư vượt quá số lượng tồn của một lô hàng cụ thể, bảo đảm nguyên tắc FIFO và giá vốn chính xác tuyệt đối.
> 7. **[BẢO HIỂM NÂNG CAO] Cấu trúc Tích hợp Cổng Giám định BHYT theo Quyết định 4210/130 của Bộ Y tế (Mục 6.3):** Quy chuẩn đầu ra dữ liệu XML Bảng 1-2-3 khi phòng khám kích hoạt module BHYT.
> 8. **[LƯU TRỮ PHÁP LÝ] Chính sách Lưu trữ & Xóa mềm Bệnh án 10-15 năm (Data Retention & Archiving - Mục 11):** Cấm hoàn toàn Hard-Delete trên toàn bộ cơ sở dữ liệu production; quy định cơ chế Cold Storage nén dữ liệu cũ mà không làm đứt gãy liên kết Khóa ngoại.
> 9. **[MỞ RỘNG KHÓA CHÍNH] Mở rộng Danh mục Khóa chính Bất biến lên 27 Thực thể (Mục 15.1):** Bổ sung `Cash_Shift_ID`, `Patient_Consent_ID`, `Sterilization_Cycle_ID` vào danh mục được bảo vệ vĩnh viễn theo nguyên tắc Default-Deny.
> 10. **Kế thừa 100% tính năng đã chuẩn hóa từ các phiên bản trước:** Nguyên tắc Khóa chính bất biến mọi thực thể (Default-Deny Mục 15.0), Quản trị danh mục dùng chung SCD Type 2 (Mục 15.5), Mẫu Trigger chuẩn CSDL (Mục 15.6), Atomic Commit Chốt dịch vụ, MySign Bypass SLA 24h, Quản lý vật tư Lot/Serial qua `Reserve -> Consume -> Release`, Khép kín Labo Rework Cycle, Ma trận định khoản TT 99/2025/TT-BTC 3 nhánh, Hoa hồng Bác sĩ Cash-basis kèm Clawback.

### 0.1 Đối chiếu đặc tả với baseline triển khai

Tài liệu này là đặc tả nghiệp vụ mục tiêu v13. Bảng dưới đây được cập nhật cùng mã nguồn để phân biệt rõ phần đã có kiểm thử tự động với phần còn nằm trong lộ trình triển khai; việc mô tả nghiệp vụ không được xem là bằng chứng module đã sẵn sàng production.

| Phạm vi | Trạng thái baseline | Ràng buộc kiểm chứng |
|:---|:---:|:---|
| Xác thực JWT và RBAC | `IMPLEMENTED` | Guard quyền phải áp dụng tại controller; người tạo không tự duyệt chứng từ của mình |
| Hồ sơ bệnh nhân và Lượt khám | `IMPLEMENTED` | Chống trùng SĐT/CCCD; mã định danh không sửa; state transition có test |
| EMR, Consent Gatekeeper và Chốt dịch vụ | `IMPLEMENTED` | Thiếu Consent `SIGNED` phải chặn; `REVOKED` phải mở lại lượt khám đang xử lý; Settlement dùng idempotency |
| Billing và Ca thu ngân | `IMPLEMENTED` | Không thu vượt phải thu; tiền mặt gắn ca `OPEN`; lệch két vượt ngưỡng chuyển `PENDING_CLOSE` |
| Kho Lot/Serial, FIFO và Reserve/Consume/Release | `IN_PROGRESS` | Phải khóa đồng thời tồn khả dụng, tách lô theo FIFO và không xuất quá tồn |
| Kế toán, định khoản và đối soát | `IN_PROGRESS` | Mọi bút toán phải tham chiếu giao dịch gốc, bảo toàn số tiền và tuân thủ SoD |
| Tiệt trùng, Labo, Bảo hiểm, Bảo hành và Audit Log | `PLANNED` | Chỉ đánh dấu hoàn tất sau khi có API, giao diện và integration test tương ứng |

**Nguyên tắc cập nhật:** mỗi module chỉ được chuyển từ `IN_PROGRESS` sang `IMPLEMENTED` khi có schema, API, màn hình nghiệp vụ và test cho các nhánh lỗi chính; không dùng dữ liệu mẫu trên giao diện để thay thế dữ liệu production.

---

## 1. PHÂN QUYỀN HỆ THỐNG (ROLE-BASED ACCESS CONTROL)

### 1.1 Mô tả chi tiết vai trò người dùng

| Vai trò (Role) | Quyền hạn và Phạm vi trách nhiệm nghiệp vụ |
|:---|:---|
| **Admin (Quản trị viên)** | Toàn quyền **cấu hình kỹ thuật**: Quản lý tài khoản, phân quyền, cấu hình danh mục, tham số hệ thống, tích hợp API (MySign, HĐĐT), giám sát Audit Log và xem báo cáo quản trị cấp cao. **Không mặc định xem nội dung bệnh án lâm sàng/CCCD**; nếu cần hỗ trợ kỹ thuật khẩn cấp phải kích hoạt `Break-glass Access` có giới hạn thời gian (tối đa 60 phút), bắt buộc nhập lý do và được ghi vết Audit Log độc lập. Không được tự phê duyệt chứng từ tài chính do chính mình tạo. |
| **NV Tiếp nhận (Lễ tân / Thu ngân)** | Quản lý thông tin Hồ sơ bệnh nhân; Tạo mới và tiếp đón Lượt tiếp nhận; Mở ca/Đóng ca thu ngân (`Cash_Shift_ID`); Tiếp nhận thanh toán thu tiền, thu cọc, xác nhận ghi nợ tại Màn hình Tổng hợp thanh toán; Tra cứu bảo hành dịch vụ; Chỉ Xem Lịch sử khám và Tồn kho; **Tuyệt đối không** truy cập Kế toán chuyên sâu, Nhân sự, chỉnh sửa Kho hoặc xem chẩn đoán bệnh án chi tiết. |
| **Bác sĩ (Chuyên môn)** | Xem/Thêm/Sửa toàn bộ Hồ sơ khám bệnh do mình phụ trách: Tab A (Sinh hiệu), Tab B (Sơ đồ răng - tình trạng & chỉ định thủ thuật), Tab C (Lâm sàng), Tab D (Kế hoạch điều trị), Tab E (Đơn thuốc), Tab F (CLS), Tab G (Vật tư đặc thù & tiêu hao), Tab H (Phiếu gửi Labo), Tab I (Tổng kết); Tạo và yêu cầu bệnh nhân ký Giấy đồng thuận điều trị (Mục 3.5); Thực hiện Chốt dịch vụ (Mục 3.4); Ký số MySign; Chỉ Xem Lịch sử khám và Tồn kho; **Không truy cập** Kế toán, Nhân sự. |
| **Phụ tá / Điều dưỡng** | Hỗ trợ lâm sàng cùng Bác sĩ tại buồng khám: Nhập Tab A (Sinh hiệu), Tab B (chỉ đánh dấu hiện trạng răng khảo sát ban đầu, **không** gán chỉ định điều trị), Tab G (chỉ nhập Vật tư tiêu hao dùng chung), Tab I (chỉ nhập Lời dặn chăm sóc sau khám); Quét mã khay dụng cụ tiệt trùng (Mục 5.4). **Chỉ Xem:** Tab C, Tab D, Tab F, Tab H. **Cấm tuyệt đối:** Không được kê Đơn thuốc (Tab E), không nhập Vật tư đặc thù cấy ghép (Tab G), không được Chốt dịch vụ (Mục 3.4). |
| **Kế toán** | Quản lý phân hệ Kế toán tài chính; kiểm tra chứng từ thu/chi, đối soát ca thu ngân, công nợ, báo cáo tài chính và bảng lương theo phạm vi phân công. <br>• **Kế toán viên:** Kiểm tra tính hợp lệ chứng từ, đối soát ca thu ngân, chuyển trạng thái Phiếu thu/chi thành `DA_DUYET`. <br>• **Kế toán trưởng:** Ký số MySign để chuyển chứng từ sang `DA_HACH_TOAN`; **không được tự phê duyệt chứng từ do chính tài khoản mình lập** (Tuân thủ nguyên tắc SoD). Quyền Admin kỹ thuật là role tách biệt, không gộp mặc định với Kế toán trưởng. |
| **Quản lý kho** | Quản lý Danh mục hàng tồn kho (Dược phẩm, VTYT nha khoa); Lập Phiếu nhập kho trực tiếp từ nhà cung cấp; Lập Phiếu xuất kho vật tư tiêu hao định kỳ cho ghế răng; Lập phiếu xuất hủy hàng hết hạn/hư hỏng; Quản lý lô hấp tiệt trùng dụng cụ (Mục 5.4); Kiểm kê đối soát kho thực tế; Chỉ Xem thông tin Tiếp nhận liên quan đến xuất kho. Không truy cập Kế toán, Nhân sự, EMR. |

### 1.2 Ma trận phân quyền chức năng (Permission Matrix)

| Màn hình / Phân hệ | Admin | NV Tiếp nhận | Bác sĩ | Phụ tá | Kế toán viên | Kế toán trưởng | Quản lý kho |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Hồ sơ bệnh nhân & Tiếp nhận | Cấu hình/khóa theo quyền | Xem/Thêm/Sửa | Chỉ Xem | Chỉ Xem | Chỉ Xem (TT) | Chỉ Xem (TT) | Không |
| Hồ sơ khám bệnh EMR | Không mặc định; Break-glass | Không | Xem/Thêm/Sửa trước khóa; Addendum sau khóa | Hạn chế (1.1) | Không | Không | Không |
| Đồng thuận điều trị (Consent) | Cấu hình biểu mẫu | Hỗ trợ ký | Tạo/Ký xác nhận | Chỉ Xem | Không | Không | Không |
| Quản lý Ca thu ngân (Shift) | Cấu hình ngưỡng lệch | Mở/Đóng ca/Bàn giao | Không | Không | Đối soát/Duyệt | Duyệt hạch toán | Không |
| Tổng hợp thanh toán (Billing) | Cấu hình/tra cứu | Xem/Thêm/Sửa theo quyền | Chỉ Xem | Không | Xem/Duyệt | Duyệt/Hạch toán | Không |
| Lịch sử điều trị EMR | Toàn quyền | Chỉ Xem | Chỉ Xem | Chỉ Xem | Không | Không | Không |
| Tra cứu bảo hành dịch vụ | Toàn quyền | Chỉ Xem | Chỉ Xem | Chỉ Xem | Không | Không | Không |
| Quản lý Labo (Gia công răng) | Toàn quyền | Không | Xem/Thêm/Sửa | Chỉ Xem | Xem nợ Labo | Xem/Duyệt nợ | Không |
| Kho (Tồn kho / Nhập / Xuất) | Toàn quyền | Chỉ Xem | Chỉ Xem | Chỉ Xem | Chỉ Xem | Chỉ Xem | Xem/Thêm/Sửa |
| Quản lý Tiệt trùng dụng cụ | Toàn quyền | Không | Chỉ Xem | Quét mã khay | Không | Không | Xem/Thêm/Sửa |
| Kế toán (Sổ sách / Báo cáo) | Cấu hình kỹ thuật* | Không | Không | Không | Xem/Thêm/Duyệt | Toàn quyền (Ký, không tự duyệt chứng từ của mình) | Không |
| Nhân sự (Chấm công / Lương) | Toàn quyền | Bản thân | Bản thân | Bản thân | Xem/Thêm/Sửa | Toàn quyền | Bản thân |
| Tài sản cố định (Ghế máy, X-quang) | Toàn quyền | Không | Không | Không | Xem/Sửa | Toàn quyền | Chỉ Xem |
| Cấu hình hệ thống | Toàn quyền | Không | Không | Không | Không | Không | Không |

### 1.3 Tài khoản đăng nhập theo phân hệ

Mỗi nhóm nghiệp vụ sử dụng một tài khoản riêng để bảo đảm phân quyền và nguyên tắc SoD. Tài khoản khởi tạo phục vụ môi trường phát triển được tạo bằng seed; mật khẩu không lưu dạng rõ trong cơ sở dữ liệu mà được băm bằng `bcrypt`.

| Phân hệ | Username seed | Role hệ thống | Mật khẩu môi trường phát triển |
|:---|:---|:---|:---|
| Quản trị | `Admin` | `ADMIN` | `Admin1234@` |
| Tiếp nhận / Khách hàng | `TiepNhan` | `RECEPTIONIST` | `TiepNhan1234@` |
| Bác sĩ / EMR | `BacSi` | `DOCTOR` | `BacSi1234@` |
| Phụ tá | `PhuTa` | `ASSISTANT` | `PhuTa1234@` |
| Kế toán viên | `Ketoan` | `ACCOUNTANT` | `Ketoan1234@` |
| Kế toán trưởng | `KeToanTruong` | `CHIEF_ACCOUNTANT` | `KeToanTruong1234@` |
| Quản lý kho | `Kho` | `INVENTORY_MANAGER` | `Kho12345@` |

**Chính sách mật khẩu:** tối thiểu 9 ký tự, có ít nhất một chữ hoa, một chữ thường, một chữ số và một ký tự đặc biệt. Mật khẩu mẫu trên chỉ dùng cho development seed; production bắt buộc thay đổi, không ghi vào source control và không dùng chung giữa các vai trò.

---

## 2. MODULE TIẾP NHẬN BỆNH NHÂN

### 2.1 Quản lý Hồ sơ bệnh nhân (Master Patient Index)

**Mã bệnh nhân** *(Tự sinh: `BN#000001` tăng dần tuần tự, **vĩnh viễn không reset theo ngày** — là Khóa chính định danh duy nhất suốt đời của người bệnh để liên kết toàn bộ bệnh sử, dị ứng thuốc, thẻ bảo hành, công nợ và hình ảnh X-quang. **Tuân thủ quy tắc bất biến Mục 15: Tuyệt đối cấm sửa Mã bệnh nhân**).*

> [!WARNING]
> **Thuật toán ngăn chặn tạo trùng bệnh nhân:** Khi NV Tiếp nhận nhập Số điện thoại hoặc CCCD/Hộ chiếu, hệ thống tức thời quét kiểm tra. Nếu phát hiện trùng, hệ thống bật popup cảnh báo: *"Bệnh nhân đã tồn tại (Mã: BN#XXXXXX - Họ tên: ... - Ngày sinh: ...)"* kèm nút bấm `Mở hồ sơ cũ để tiếp nhận tái khám`, ngăn chặn triệt để tình trạng nhân bản hồ sơ làm mất tiền sử bệnh án.

| Thuộc tính dữ liệu | Bắt buộc | Quy cách & Ràng buộc kỹ thuật |
|:---|:---:|:---|
| Họ và tên | ✔ | Chuẩn hóa tự động dạng Title Case (Ví dụ: Nguyễn Văn An) |
| Ngày tháng năm sinh | ✔ | Định dạng chuẩn `YYYY-MM-DD`, hệ thống tự động tính Tuổi hiện tại |
| Giới tính | ✔ | Chọn: Nam / Nữ / Khác |
| Số điện thoại liên hệ | ✔ | Chuẩn 10 chữ số di động VN; quét trùng cảnh báo |
| Số CCCD / Định danh cá nhân | ✔ | Quét trùng cảnh báo; Mã hóa lưu trữ mức cơ sở dữ liệu chuẩn **AES-256** |
| Địa chỉ thường trú / Tạm trú | ✔ | Tỉnh/Thành phố, Quận/Huyện, Phường/Xã, Số nhà - Tên đường |
| Nhóm đối tượng bệnh nhân | ✔ | Người lớn / Trẻ em (dưới 12 tuổi) / Người cao tuổi (trên 60 tuổi) |
| Quốc tịch / Dân tộc | ✔ | Mặc định Việt Nam / Kinh |
| **Tiền sử Dị ứng thuốc & Bệnh nền** | Khuyến nghị | Chọn nhanh các dị ứng nguy cơ cao (Kháng sinh Beta-lactam, Thuốc tê Lidocaine/Articaine, NSAIDs...) & Ghi chú bệnh tim mạch, tiểu đường, máu khó đông. Hiển thị nhãn đỏ nhấp nháy trên thanh tiêu đề hồ sơ |
| Thẻ Bảo hiểm thương mại (BHTM) | Tùy chọn | Đơn vị bảo lãnh (PVI, Bảo Việt, Insmart...), Số thẻ bảo hiểm, Ngày hết hạn, Hạn mức còn lại |
| Thẻ Bảo hiểm y tế (BHYT) | Tùy chọn | Số thẻ BHYT, Nơi ĐKKCB ban đầu, Tỷ lệ mức hưởng (%) *(Chỉ hiển thị khi cấu hình hệ thống bật BHYT)* |
| Thông tin xuất Hóa đơn GTGT | Tùy chọn | Tên đơn vị mua hàng, Mã số thuế doanh nghiệp (kết nối API Tổng cục Thuế để tự điền tên/địa chỉ), Email nhận HĐĐT |
| Email / Nghề nghiệp | Tùy chọn | Phục vụ gửi hóa đơn điện tử hoặc nhắc lịch tái khám |

> **Quy trình Hợp nhất hồ sơ trùng (Patient Merge) tuân thủ bảo toàn Khóa chính:**
> * Khi phát hiện 2 hồ sơ thuộc về cùng một người thực tế, hệ thống **tuyệt đối không xóa vật lý và không sửa Mã BN của bất kỳ hồ sơ nào**.
> * Chỉ Supervisor / Admin được thực hiện `Merge Patient`: Chọn `Master BN`, thiết lập liên kết `Old BN -> Master BN`.
> * Hồ sơ nguồn (`Old BN`) được chuyển trạng thái sang `MERGED`, bị khóa không cho phát sinh giao dịch mới, nhưng dòng khóa chính `Old BN` và toàn bộ lịch sử bệnh án, chứng từ cũ vẫn được lưu giữ nguyên vẹn để bảo toàn giá trị pháp lý của các hồ sơ/chứng từ đã ký số trước đó.

### 2.2 Quản lý Lượt tiếp nhận khám (Visit Session)

**Số tiếp nhận** *(Tự sinh: `STN#YYYYMMDD#/0001–9999`, reset về 0001 vào đúng 00:00:00 mỗi ngày. **Là Khóa chính của phiên khám, cấm sửa đổi**).*

| Trường dữ liệu | Tính chất | Mô tả nghiệp vụ |
|:---|:---|:---|
| Mã bệnh nhân / Tên bệnh nhân | Tự động | Kéo từ Hồ sơ bệnh nhân đã chọn (Khóa ngoại trỏ về `BN#`) |
| Phân loại tiếp nhận | Bắt buộc chọn | Khám mới / Tái khám có thu phí / Tái khám theo phác đồ không thu phí (Mục 2.5) |
| Đối tượng thanh toán chính | Bắt buộc chọn | Tự thanh toán 100% / Bảo hiểm thương mại (BHTM) / BHYT (nếu bật cấu hình) |
| Bác sĩ phụ trách chính | Bắt buộc chọn | Chọn từ danh sách Bác sĩ có ca trực hôm nay |
| Ghế nha khoa / Phòng khám | Bắt buộc chọn | Ghế răng số 1..N (phục vụ phân bổ tài sản và vật tư tiêu hao) |
| Chi nhánh phòng khám | Mặc định | Chi nhánh của tài khoản Tiếp nhận đang đăng nhập |
| Nhân viên lập tiếp nhận | Tự động | Ghi nhận User ID đang thao tác |
| Thời gian tạo lượt | Tự động | Giờ:phút:giây ngày tiếp nhận |
| Trạng thái lượt khám | Theo dõi | `0` Mới → `1` Đang khám → `2` Đã khám – Chờ xử lý → `3` Chờ thanh toán → `4` Hoàn tất / `-1` Hủy |

### 2.3 Sơ đồ trạng thái & Điều kiện chuyển đổi Lượt tiếp nhận

```mermaid
stateDiagram-v2
    [*] --> 0_Moi: Tiếp nhận tạo STN
    0_Moi --> 1_DangKham: Bác sĩ mở hồ sơ / Phụ tá đo sinh hiệu
    1_DangKham --> 2_ChoXuLy: Bác sĩ bấm Chốt dịch vụ (Mục 3.4)
    
    state 2_ChoXuLy {
        [*] --> KiemTraConsent: Kiểm tra Cam kết xâm lấn
        KiemTraConsent --> KiemTraKySo: Đã có Consent hợp lệ
        KiemTraKySo --> ChoKy: Dịch vụ thuộc diện bắt buộc ký số
        KiemTraKySo --> HopLe: Dịch vụ thông thường không cần ký
        ChoKy --> HopLe: Bác sĩ ký MySign thành công
        ChoKy --> BypassKy: Kích hoạt Bypass có Audit Log
    }
    
    2_ChoXuLy --> 1_DangKham: Consent bị REVOKED trước khi hoàn tất thủ thuật (Mục 3.5.4)
    2_ChoXuLy --> 3_ChoThanhToan: Ca có phát sinh chi phí thu tiền
    2_ChoXuLy --> 4_HoanTat: Ca tái khám không thu tiền (Mục 2.5)
    3_ChoThanhToan --> 4_HoanTat: Thu đủ tiền / Xác nhận ghi nợ
    0_Moi --> -1_Huy: Bệnh nhân bỏ về trước khám
    1_DangKham --> -1_Huy: Bệnh nhân từ chối điều trị
```

* **Trạng thái `0` (Mới):** Tiếp nhận tạo lượt thành công. Bệnh nhân đang ngồi chờ. Phụ tá được phép vào Tab A đo/nhập Sinh hiệu ban đầu mà không làm đổi trạng thái lượt khám.
* **Trạng thái `1` (Đang khám):** Kích hoạt khi Bác sĩ mở hồ sơ bệnh án hoặc bắt đầu thao tác tại Tab B trên ghế răng.
* **Trạng thái `2` (Đã khám – Chờ xử lý):** Kích hoạt khi Bác sĩ bấm nút `Chốt dịch vụ thực hiện`. Khóa toàn bộ các Tab lâm sàng. Nếu có dịch vụ bắt buộc ký số, hệ thống gửi lệnh ký qua API Viettel MySign và giữ session tại `2`.
* **Trạng thái `3` (Chờ thanh toán):** Kích hoạt khi hồ sơ đã ký số hợp lệ (hoặc ca khám không yêu cầu ký số, hoặc đã kích hoạt Bypass dự phòng) VÀ ca khám có nghĩa vụ thanh toán > 0.
* **Trạng thái `4` (Hoàn tất):** Lễ tân thực hiện thu tiền hoặc xác nhận ghi nợ hợp lệ; HOẶC ca tái khám không phát sinh chi phí được chuyển thẳng từ `2 -> 4`. Session đóng hoàn tất.
* **Trạng thái `-1` (Hủy):** Chỉ cho phép hủy khi lượt khám ở trạng thái `0` hoặc `1`. Cấm tuyệt đối hủy khi đã chuyển sang trạng thái `2`, `3` hoặc `4`.

### 2.4 Dịch vụ đăng ký ban đầu (Tham khảo tại quầy Tiếp nhận)
Ghi nhận: Dịch vụ dự kiến ban đầu, Bác sĩ yêu cầu, Ghế nha. Không phát sinh hạch toán kế toán. Bảng tính tiền chính thức duy nhất do Bác sĩ chốt tại Mục 3.4.

### 2.5 Xử lý Buổi Tái khám Không phát sinh Chi phí (Zero-Cost Follow-up Visits) ⭐ MỚI TẠI V12
Trong thực tế nha khoa, bệnh nhân thường xuyên đến tái khám theo phác đồ mà **không thu thêm tiền** (Ví dụ: Thay băng thuốc điều trị tủy buổi 2/3, Cắt chỉ sau nhổ răng khôn, Tháo mắc cài tạm thời để vệ sinh, Kiểm tra khớp cắn sau bọc sứ):
1. **Quy trình tiếp nhận:** Lễ tân chọn Loại tiếp nhận = `Tái khám theo phác đồ không thu phí`, liên kết tới `Treatment_Phase_ID` hoặc `Original STN`.
2. **Quy trình lâm sàng:** Bác sĩ mở EMR, ghi nhận tiến trình lâm sàng tại Tab C, Tab I. Tab D giữ nguyên tiến độ hoặc ghi nhận tiến trình.
3. **Quy trình Chốt ca:**
   * Bảng Chốt dịch vụ (Mục 3.4) có `Gross Charge = 0`.
   * Vật tư tiêu hao dùng chung trong buổi (bông băng, thuốc sát khuẩn) đã được tính trong định mức buồng/ghế của Quản lý kho (Mục 5.3), không tính riêng vào bệnh nhân.
   * Khi Bác sĩ bấm `Chốt dịch vụ`, hệ thống tự động kiểm tra: nếu Tổng tiền phải thu = 0 và không có bảo hiểm bảo lãnh $\rightarrow$ **Chuyển thẳng lượt khám từ `2 -> 4 Hoàn tất`**, bỏ qua trạng thái `3 Chờ thanh toán`.
   * **Nguyên tắc kế toán:** Không sinh Phiếu thu rác 0đ, không sinh bản ghi công nợ rác, giữ cho sổ sách kế toán hoàn toàn tinh gọn và sạch sẽ.

---

## 3. MODULE HỒ SƠ KHÁM BỆNH NHA KHOA ĐIỆN TỬ (EMR)

### 3.1 Cấu trúc giao diện lâm sàng
* **Thanh thông tin đỉnh (Top Banner):** Họ tên, Tuổi, Giới tính, Mã BN, STN, Cảnh báo dị ứng thuốc/bệnh nền (nhấp nháy đỏ), Cờ trạng thái Giấy đồng thuận điều trị (`CONSENT_SIGNED` / `CONSENT_MISSING`), Tên Bác sĩ điều trị, Ghế nha số.
* **Cụm Tab chuyên môn chi tiết (Tabs A $\rightarrow$ I):** Trình bày trực quan, khoa học theo đúng tiến trình thăm khám răng miệng.

---

### 3.2 Chi tiết các Tab chuyên môn lâm sàng

#### Tab A – Chỉ số sinh hiệu (Vital Signs)
* Huyết áp, Mạch, SpO2, Chiều cao, Cân nặng, Thân nhiệt. Bắt buộc đo chỉ số Huyết áp và Mạch đối với các thủ thuật xâm lấn. Phụ tá hoặc Bác sĩ nhập.

#### Tab B – Sơ đồ răng tương tác (Interactive Odontogram) ⭐
* Chuẩn FDI 32 răng vĩnh viễn và 20 răng sữa, 5 mặt răng chi tiết (M, D, O, B/V, L/P).
* **Phân quyền 2 tầng:** Phụ tá chỉ được đánh dấu Hiện trạng răng ban đầu (Survey Layer); Bác sĩ độc quyền gán Chỉ định thủ thuật điều trị (Treatment Layer).

#### Tab C – Bệnh sử & Khám chi tiết
* Lý do khám, bệnh sử, tiền sử, khám mô mềm, nha chu, khớp thái dương hàm TMJ. Chẩn đoán mã hóa ICD-10 (`K02`, `K04`, `K05`, `K07`...).

#### Tab D – Kế hoạch điều trị & Báo giá nhiều giai đoạn (Treatment Plan)
* Phác đồ tổng thể và báo giá trọn gói. Mỗi dòng có Khóa chính `Treatment_Phase_ID` bất biến. Đơn giá lấy từ Bảng giá hiệu lực SCD Type 2.
* Tự động chuyển `HOAN_TAT` khi Bác sĩ Chốt ca có chứa giai đoạn đó, kích hoạt mốc bảo hành tại Mục 8.

#### Tab E – Kê đơn thuốc điện tử
* Quét cảnh báo dị ứng thuốc (Safety Drug Alert). Nếu trùng hoạt chất, popup cảnh báo đỏ bắt buộc Bác sĩ Hủy hoặc Override có lý do lưu Audit Log. Dữ liệu kê đơn snapshot sang Mục 3.4.

#### Tab F – Chỉ định & Kết quả Cận lâm sàng (CLS)
* X-quang quanh chóp, Panorama, Cephalo, CT ConeBeam 3D. Lưu file ảnh PNG/JPG hoặc chuẩn y tế **DICOM**.

#### Tab G – Sử dụng Vật tư y tế (Medical Consumables & Implants)
* Vật tư đặc thù cấy ghép (Implant, Abutment, Minivis): Quản lý qua cơ chế **`Reserve -> Consume -> Release`**. Bắt buộc Serial/Lot/HSD. Chặn hoàn toàn việc chốt ca nếu tồn kho khả dụng = 0 hoặc đã hết hạn.

#### Tab H – Quản lý Phiếu gửi Labo gia công phục hình răng ⭐
* Mã phiếu `LB#YYYYMMDD#/0001–9999` bất biến. Vòng đời nghiệm thu đầu vào, quản lý chu trình làm lại (`Rework Cycle`) phân định lỗi Labo (miễn phí) vs lỗi Bác sĩ (tính phí). Hạch toán Nợ 632 / Có 331 duy nhất khi nhận mẫu đạt chuẩn.

#### Tab I – Tổng kết ca điều trị
* Kết quả thủ thuật, lời dặn dò chăm sóc sau thủ thuật, hẹn lịch tái khám.

---

### 3.3 Quy trình Ký số điện tử EMR (Viettel MySign) & Cơ chế Bypass Khẩn cấp
* Danh mục dịch vụ bắt buộc ký số do Admin cấu hình.
* Khi mất mạng hoặc API Viettel timeout (> 60s), kích hoạt **Bypass khẩn cấp** bằng mật khẩu Bác sĩ + lý do giải trình. Hồ sơ gắn cờ `KY_OFFLINE_CHO_BU` với thời hạn tối đa 24 giờ (`MAX_BYPASS_HOURS = 24h`). Quá 24h chưa ký bù, hệ thống tự động khóa quyền mở ca khám mới của Bác sĩ.

---

### 3.4 Bảng Chốt dịch vụ thực hiện (Bảng chốt doanh thu & Trừ kho chính thức) ⭐
* Bác sĩ độc quyền thực hiện chốt ca.
* **Chốt nguyên tử (Atomic Commit):** Sinh `Settlement ID` kèm `Idempotency Key`. Thực thi trong 1 transaction duy nhất: Snapshot lâm sàng, gom dòng tính tiền, chuyển vật tư từ `Reserve` sang `Consume`, sinh dự thảo bút toán giá vốn.

---

### 3.5 Quy trình Giấy Đồng thuận Điều trị Điện tử (Digital Informed Consent) ⭐ MỚI TẠI V12

> [!IMPORTANT]
> **Yêu cầu Pháp lý Bắt buộc (Luật Khám bệnh, chữa bệnh 2023):**
> Đối với tất cả các thủ thuật nha khoa xâm lấn có nguy cơ tai biến y khoa (Phẫu thuật cấy ghép Implant, Nhổ răng khôn mọc lệch/ngầm, Phẫu thuật cắt chóp/nha chu, Chỉnh nha niềng răng mắc cài/khay trong suốt), hệ thống **bắt buộc phải có Giấy đồng thuận điều trị có chữ ký của người bệnh** trước khi tiến hành thủ thuật.

1. **Biểu mẫu cam kết điện tử (Template Management):**
   * Hệ thống quản lý biểu mẫu cam kết theo từng nhóm thủ thuật: Cam kết rủi ro phẫu thuật cấy Implant, Cam kết nhổ răng khôn (chảy máu, tổn thương thần kinh V3), Hợp đồng cam kết chỉnh nha.
   * Biểu mẫu tự động điền thông tin: Mã BN, Họ tên, Răng số thực hiện, Bác sĩ điều trị, Các rủi ro y khoa có thể xảy ra và trách nhiệm của người bệnh.
2. **Ký điện tử tại ghế răng (Chairside Digital Signature):**
   * Bác sĩ mở biểu mẫu trên màn hình Tablet/Pad ký tại ghế răng.
   * Bệnh nhân hoặc người đại diện hợp pháp đọc kỹ nội dung và ký trực tiếp bằng bút cảm ứng/ngón tay trên màn hình ký.
   * Hệ thống chụp tọa độ nét ký, gắn Dấu thời gian (Timestamp), định danh thiết bị ký và chuyển đổi thành file **PDF/A bất biến** mang mã `Consent_ID` (`CST#YYYYMMDD#/0001–9999`).
3. **Ràng buộc kiểm soát chốt dịch vụ (Consent Gatekeeper):**
   * Khi Bác sĩ bấm `Chốt dịch vụ` (Mục 3.4), hệ thống kiểm tra: Nếu trong lượt khám có dịch vụ thuộc danh mục xâm lấn bắt buộc ký cam kết mà chưa có `Consent_ID` ở trạng thái `SIGNED`:
     * Hệ thống **chặn nút chốt ca** và cảnh báo đỏ: *"CẢNH BÁO PHÁP LÝ: Ca khám có thủ thuật xâm lấn [Tên dịch vụ] nhưng chưa có Giấy đồng thuận điều trị của bệnh nhân. Vui lòng hoàn tất ký cam kết trước khi chốt dịch vụ."*
4. **Xử lý Thu hồi Cam kết (`REVOKED`) sau khi đã `SIGNED`) ⭐ MỚI TẠI V13:**
   * Bệnh nhân có quyền rút lại đồng thuận bất kỳ lúc nào trước khi thủ thuật được thực hiện thực tế trên ghế răng. Chỉ Bác sĩ điều trị (kèm xác nhận bằng lời của bệnh nhân, ghi chú lý do bắt buộc) được phép chuyển `Consent_ID` từ `SIGNED` sang `REVOKED`.
   * File PDF/A gốc đã ký **không bị xóa hay sửa** (bảo toàn Khóa chính theo Mục 15), chỉ đổi cờ trạng thái và sinh Audit Log.
   * Ngay khi `Consent_ID` chuyển sang `REVOKED`, nếu lượt khám đang ở trạng thái `2_ChoXuLy` (đã bấm Chốt dịch vụ nhưng transaction lâm sàng liên quan chưa `HOAN_TAT`), hệ thống **tự động đảo trạng thái lượt khám về `1_DangKham`**, mở khóa lại các Tab lâm sàng, và **Consent Gatekeeper kích hoạt lại**: Bác sĩ bắt buộc phải thu thập `Consent_ID` mới ở trạng thái `SIGNED` trước khi được bấm Chốt dịch vụ lần nữa.
   * Nếu thủ thuật xâm lấn đã hoàn tất thực tế (lượt khám đã `4_HoanTat`) tại thời điểm rút cam kết, hệ thống chỉ cho phép ghi nhận `REVOKED` mang tính lưu trữ pháp lý (ví dụ bệnh nhân từ chối các buổi điều trị tiếp theo trong cùng phác đồ), **không** hồi tố chứng từ tài chính/lâm sàng đã chốt.

---

## 4. MODULE TỔNG HỢP THANH TOÁN (BILLING & CASHIER)

### 4.1 Cấu trúc màn hình thu ngân Tiếp nhận
* Danh sách chờ thu (trạng thái `3 Chờ thanh toán`), Chi tiết tính tiền (Snapshot từ Mục 3.4), Số dư tiền cọc khả dụng `TK 131-BN`.

### 4.2 Xử lý Ca điều trị hỗn hợp thanh toán (Mixed Payment Settlement)
* Tuân thủ đúng **Bất biến số tiền chuẩn hóa tại Mục 16.1**: `Grand Total = Sum(Line Total) = Sum(Payer Allocation) = Sum(Collected) + Sum(Receivable)` (thuật ngữ `Grand Total` tương đương `Gross Charge`, `Collected` tương đương `Actual Collection` — thống nhất một công thức duy nhất trong toàn bộ tài liệu, không dùng song song 2 cách gọi).
* Bóc tách rõ: Bảo lãnh BHTM/BHYT $\rightarrow$ Cấn trừ cọc khả dụng $\rightarrow$ Thực thu tiền mặt/chuyển khoản $\rightarrow$ Ghi nợ bệnh nhân.

### 4.3 Nghiệp vụ Thu tiền cọc / Tạm ứng dịch vụ
* Sinh mã `Deposit ID` bất biến. Quản lý trạng thái: `AVAILABLE`, `RESERVED`, `APPLIED`, `REFUNDED`. Hạch toán `Nợ 111/112 - Có 131 (Dư Có)`.

### 4.4 Nghiệp vụ Cấn trừ cọc và Thu tiền hoàn tất buổi khám
* Tự động sinh bút toán kết chuyển cọc: `Nợ 131 (xóa dư Có) - Có 511`. Thu thêm tiền mặt: `Nợ 111/112 - Có 511; Có 3331`. Bảo hiểm bảo lãnh: `Nợ 131 (Dư Nợ) - Có 511`.

### 4.5 Nghiệp vụ Cho phép Ghi nợ Bệnh nhân (Bệnh nhân trả thiếu)
* Hạch toán nợ: `Nợ 131-BN (Dư Nợ) - Có 511`. Thu nợ cũ: `Nợ 111/112 - Có 131-BN`.

### 4.6 Quy trình Đổi / Trả / Hủy dịch vụ & Hoàn cọc (Refund Policy)
* Sinh chứng từ hoàn tiền/điều chỉnh riêng biệt, tham chiếu `Original Transaction ID`. Xử lý phạt cọc vi phạm hợp đồng ghi nhận `Có 711`.

---

### 4.7 Quản lý Ca Thu ngân & Két tiền (Cash Drawer & Shift Handover) ⭐ MỚI TẠI V12

> [!IMPORTANT]
> Để ngăn chặn triệt để thất thoát tiền mặt và phân định rõ trách nhiệm tài chính giữa các nhân viên lễ tân/thu ngân làm việc theo ca (Ca sáng / Ca chiều / Ca tối):

1. **Vòng đời Ca thu ngân (`Cash_Shift_ID` - `SHIFT#YYYYMMDD#/001–999`):**
   * `OPEN` (Đang mở ca) $\rightarrow$ `PENDING_CLOSE` (Chờ kết ca/bàn giao) $\rightarrow$ `CLOSED` (Đã đóng ca) $\rightarrow$ `RECONCILED` (Kế toán đã đối soát khớp quỹ).
2. **Quy trình Mở ca (Shift Opening):**
   * Thu ngân đăng nhập, chọn ca làm việc và nhập **Số tiền đầu ca (Opening Float / Tiền thối ban đầu)** nhận từ két trung tâm hoặc ca trước bàn giao lại.
   * Hệ thống ghi nhận thời điểm mở ca và User ID phụ trách.
3. **Giao dịch trong ca:**
   * Mọi phiếu thu tiền mặt (`111`), phiếu chi tiền mặt (`111`), phiếu thu cọc, hoàn cọc đều bắt buộc gắn chặt với `Cash_Shift_ID` đang mở của nhân viên đó.
4. **Quy trình Đóng ca & Bàn giao két (Shift Handover / X-Report):**
   * Cuối ca, thu ngân thực hiện chức năng `Đóng ca thu ngân`:
     * Hệ thống tự động tính toán: $\text{Tiền mặt lý thuyết trên sổ} = \text{Tiền đầu ca} + \text{Tổng thu tiền mặt trong ca} - \text{Tổng chi tiền mặt trong ca}$.
     * Thu ngân đếm tiền mặt thực tế trong két và nhập số liệu kiểm đếm (bảng kê chi tiết theo mệnh giá: 500k, 200k, 100k, 50k...).
     * $\text{Chênh lệch két} = \text{Tiền mặt thực đếm} - \text{Tiền mặt lý thuyết trên sổ}$.
   * **Xử lý chênh lệch tiền két (áp dụng tham số `CASH_OVER_SHORT_THRESHOLD` – Mục 14) ⭐ CHUẨN HÓA TẠI V13:**
     * Nếu Chênh lệch = 0: Ca hợp lệ, in Biên bản bàn giao ca (Shift Report).
     * Nếu `0 < |Chênh lệch| ≤ CASH_OVER_SHORT_THRESHOLD` (mặc định 50.000đ): Thu ngân tự nhập lý do giải trình ngắn gọn, hệ thống tự động sinh bút toán hạch toán tạm như bên dưới **mà không cần phê duyệt cấp quản lý**, cho phép đóng ca ngay.
     * Nếu `|Chênh lệch| > CASH_OVER_SHORT_THRESHOLD`: Hệ thống **chặn thao tác Đóng ca** cho tới khi có xác nhận của Quản lý phòng khám/Trưởng chi nhánh (nhập mã phê duyệt hoặc ký số) kèm biên bản giải trình chi tiết đính kèm; ca chuyển tạm sang trạng thái `PENDING_CLOSE` chờ phê duyệt trước khi cho phép ghi nhận `CLOSED`.
     * Trong mọi trường hợp có chênh lệch, hệ thống tự động sinh bút toán hạch toán tạm:
       * **Thiếu tiền két (Cash Short):** `Nợ 1388` (Phải thu nhân viên thu ngân) / `Có 111` (Số tiền thiếu).
       * **Thừa tiền két (Cash Over):** `Nợ 111` (Số tiền thừa) / `Có 3388` (Phải trả, chờ đối soát).
   * Kế toán quỹ kiểm tra, ký nhận bàn giao và chuyển trạng thái ca sang `RECONCILED`. Từ thời điểm này, toàn bộ dòng dữ liệu của `Cash_Shift_ID` bị khóa cứng theo Mục 15.3.2.

---

### 4.8 Quản trị Chiết khấu & Xử lý Làm tròn Tiền lẻ (Discount & Rounding Governance) ⭐ MỚI TẠI V12

1. **Ma trận Thẩm quyền Duyệt Giảm giá / Chiết khấu (Discount Authority Matrix):**
   * Nhằm ngăn ngừa việc tùy tiện giảm giá làm thất thoát doanh thu:
     * **Mức 1 (Bác sĩ điều trị / Tiếp nhận):** Tự động áp dụng tối đa $\le 5\%$ tổng giá trị dịch vụ (hoặc các chương trình khuyến mãi chuẩn đang active).
     * **Mức 2 (Quản lý phòng khám / Trưởng chi nhánh):** Phê duyệt chiết khấu từ $> 5\%$ đến $\le 15\%$.
     * **Mức 3 (Ban Giám đốc / Chủ phòng khám):** Phê duyệt chiết khấu đặc biệt $> 15\%$ hoặc các ca điều trị miễn phí 100% (ngoài bảo hành).
   * Mọi yêu cầu giảm giá vượt mức 1 đều phải sinh một bản ghi `Discount_Approval_ID` (Khóa chính bất biến, Mục 15.1) trên hệ thống và được duyệt trước khi Lễ tân có thể thu tiền.
2. **Chuẩn hóa Hạch toán Kế toán Chiết khấu & Giảm giá:**
   * **Chiết khấu thương mại (Trade Discount - Giảm giá theo chương trình / khách VIP):** Hạch toán giảm trừ doanh thu: `Nợ 5211` / `Có 511` (hoặc ghi nhận trực tiếp theo doanh thu thuần sau chiết khấu theo quy định TT 99/2025).
   * **Chiết khấu thanh toán (Payment Discount - Khách thanh toán 100% trước hạn):** Hạch toán vào chi phí tài chính: `Nợ 635` / `Có 131`.
3. **Xử lý Chênh lệch Làm tròn Tiền lẻ (Cash Rounding):**
   * Trong thực tế, hóa đơn có số lẻ hàng đơn vị nghìn (Ví dụ: Tổng tiền 23.367.500đ, phòng khám làm tròn thu 23.360.000đ hoặc 23.370.000đ khi thu tiền mặt):
     * Nếu làm tròn giảm cho khách (Bớt 7.500đ): Hạch toán vào Chi phí khác: `Nợ 811: 7.500đ` / `Có 131: 7.500đ`.
     * Nếu làm tròn tăng (Thu thêm 2.500đ): Hạch toán vào Thu nhập khác: `Nợ 111: 2.500đ` / `Có 711: 2.500đ`.
   * Trên Hóa đơn điện tử xuất cho khách: Thể hiện đúng số tiền thực tế theo hợp đồng và dòng chiết khấu/điều chỉnh theo quy định của Nghị định 123/2020/NĐ-CP.
   * **Trần Làm tròn (`MAX_ROUNDING_AMOUNT`) ⭐ CHỐT LỖ HỔNG KIỂM SOÁT TẠI V13:** Để ngăn nhân viên lợi dụng cơ chế làm tròn (vốn không qua phê duyệt) nhằm né Ma trận Thẩm quyền Duyệt Chiết khấu tại Mục 4.8.1, hệ thống giới hạn số tiền làm tròn giảm tối đa mỗi hóa đơn tại `MAX_ROUNDING_AMOUNT` (mặc định **9.999đ**, tức chỉ được làm tròn trong phạm vi dưới đơn vị nghìn gần nhất). Nếu số tiền cần "làm tròn giảm" vượt ngưỡng này, hệ thống **từ chối ghi nhận là Làm tròn** và bắt buộc chuyển hướng nhập liệu sang luồng sinh `Discount_Approval_ID` (Mục 4.8.1), chịu sự kiểm soát của Ma trận Thẩm quyền Duyệt tương ứng.

---

## 5. MODULE KHO NHA KHOA TINH GỌN (INVENTORY)

### 5.1 Danh mục quản lý kho
* Quản lý độc lập Kho Dược phẩm (TK 156) và Kho Vật tư y tế (TK 152). Phân loại: Vật tư tiêu hao buồng khám vs Vật tư đặc thù cấy ghép (Lot/Serial). Tồn kho khả dụng = Thực tế - Đang Reserve - Đang Block. Quản lý FEFO cảnh báo cận hạn 30-60-90 ngày.

### 5.2 Nghiệp vụ Nhập kho trực tiếp
* Sinh mã `Receipt ID / NK#` bất biến. Nhập số Lô, Hạn dùng, Số Serial. Bút toán tự động: `Nợ 152/156, Nợ 1331 - Có 331/111/112`.

---

### 5.3 Nghiệp vụ Xuất kho & Thuật toán Phân tách Lô FIFO (Auto Split-Lot FIFO) ⭐ MỚI TẠI V12

Trong nghiệp vụ xuất kho thuốc và vật tư y tế, trường hợp số lượng yêu cầu xuất vượt quá số lượng tồn của một Lô hàng cụ thể, hệ thống tự động áp dụng **Thuật toán Phân tách Lô FIFO (Auto Split-Lot FIFO Algorithm)**:

```
[Yêu cầu xuất: 10 viên Kháng sinh Augmentin 1g]
  │
  ├── Kiểm tra Tồn kho Lô 1 (Hạn dùng 15/10/2026 - Giá vốn nhập 20.000 đ): Còn 4 viên
  │   └── Xuất Dòng 1: 4 viên x 20.000 đ = 80.000 đ (Lô 1 hết tồn)
  │
  └── Kiểm tra Tồn kho Lô 2 (Hạn dùng 20/12/2026 - Giá vốn nhập 22.000 đ): Còn 50 viên
      └── Xuất Dòng 2: 6 viên x 22.000 đ = 132.000 đ (Lô 2 còn 44 viên)

==> Tổng Giá vốn ghi nhận Nợ 632: 212.000 đ (Bảo đảm giá vốn FIFO chính xác tuyệt đối)
```

* Bút toán kế toán tự động:
  * `Nợ 632` (Giá vốn hàng bán): `212.000 đ`
  * `Có 156` (Chi tiết Lô 1: 4 viên, Lô 2: 6 viên): `212.000 đ`

---

### 5.4 Quản lý Chu trình Tiệt trùng Dụng cụ (Sterilization & Pack Tracking) ⭐ MỚI TẠI V12

> [!IMPORTANT]
> **Chuẩn Kiểm soát Nhiễm khuẩn Nha khoa (Infection Control Standard):**
> Nha khoa là môi trường có nguy cơ lây nhiễm chéo cực cao qua đường máu và khí dung (Aerosol). Hệ thống ERP quản lý chặt chẽ chu trình tiệt trùng dụng cụ để bảo đảm an toàn tuyệt đối cho người bệnh và phục vụ thẩm định cấp phép của Sở Y tế.

1. **Chu trình Hấp tiệt trùng (`Sterilization_Cycle_ID` - `STER#YYYYMMDD#/001–999`):**
   * Quản lý thông tin: Thiết bị hấp (Nồi hấp Autoclave nào), Nhiệt độ hấp ($121^\circ\text{C}$ hoặc $134^\circ\text{C}$), Áp suất, Thời gian hấp, User ID kỹ thuật viên phụ trách, Kết quả test chỉ thị sinh học/hóa học (Đạt / Không đạt).
2. **Đóng gói & In Tem Mã vạch Khay Dụng cụ:**
   * Sau khi tiệt trùng đạt chuẩn, các khay/túi dụng cụ (Bộ khám răng, Bộ kìm nhổ răng, Bộ phẫu thuật Implant, Tay khoan nha khoa) được dán **Tem kiểm soát tiệt trùng**:
     * Mã khay dụng cụ (`Instrument_Pack_ID`), Tên loại khay.
     * Mã chu trình hấp (`Sterilization_Cycle_ID`).
     * Ngày tiệt trùng $\rightarrow$ **Hạn sử dụng tiệt trùng** (Mặc định: Túi ép vô trùng chuyên dụng có hạn vô trùng **30 ngày**).
3. **Quét mã khay dụng cụ tại Ghế răng trước khi điều trị:**
   * Khi chuẩn bị ca khám (Tab G), Phụ tá dùng máy quét mã vạch quét mã khay dụng cụ chuẩn bị dùng cho bệnh nhân:
     * Nếu khay còn hạn vô trùng: Hệ thống ghi nhận mã khay vào bệnh án EMR (phục vụ truy vết y khoa khi cần).
     * Nếu khay **ĐÃ QUÁ HẠN VÔ TRÙNG**: Hệ thống phát chuông cảnh báo và bật popup đỏ: *"CẢNH BÁO NHIỄM KHUẨN: Khay dụng cụ [Tên khay] đã hết hạn tiệt trùng từ ngày [...]. Yêu cầu chuyển lại phòng hấp tiệt trùng, không được sử dụng cho người bệnh!"*

---

## 6. MODULE KẾ TOÁN TÀI CHÍNH NHA KHOA (FINANCE & ERP)

> [!NOTE]
> Hệ thống tài khoản tuân thủ hoàn toàn theo **Hệ thống tài khoản kế toán doanh nghiệp** quy định tại **Phụ lục II ban hành kèm Thông tư số 99/2025/TT-BTC** ngày 27/10/2025 của Bộ Tài chính.

### 6.1 Quy trình Quản lý Phiếu thu / Phiếu chi & Duyệt chứng từ
* Phiếu thu `PT#` và Phiếu chi `PC#` bất biến. Vòng đời 4 bước: `CHUA_DUYET` $\rightarrow$ `DA_DUYET` $\rightarrow$ `DA_HACH_TOAN` (Kế toán trưởng ký MySign) $\rightarrow$ `DIEU_CHINH`.

---

### 6.2 Bảng Ma trận Định khoản Tự động (Automated Journal Matrix)

| Nghiệp vụ kinh tế phát sinh | Điều kiện / Tiêu chí phân loại | Tài khoản Nợ | Tài khoản Có |
|:---|:---|:---|:---|
| **Thu tiền dịch vụ tại quầy** | Bệnh nhân tự thanh toán đủ 100% | `111` (Tiền mặt) / `112` (Ngân hàng) | `511` (Doanh thu DV); `3331` (nếu có VAT) |
| **Dịch vụ được BHTM bảo lãnh** | Khi Lễ tân chốt hóa đơn có phần BHTM | `131` – Chi tiết Công ty BHTM | `511`; `3331` (nếu có VAT) |
| **Dịch vụ có BHYT chi trả** | Nếu phòng khám có hợp đồng BHYT | `131` – Chi tiết Cơ quan BHYT | `511` (Doanh thu KCB BHYT) |
| **Bệnh nhân ghi nợ chưa trả** | Khi Lễ tân xác nhận ghi nợ tại Mục 4.5 | `131` – Chi tiết Bệnh nhân (Dư Nợ) | `511`; `3331` (nếu có VAT) |
| **Thu tiền nợ bệnh nhân cũ** | Bệnh nhân đến thanh toán nợ cũ | `111` / `112` | `131` – Chi tiết Bệnh nhân (Tất toán) |
| **Thu tiền cọc / Tạm ứng** | Bệnh nhân cọc trước khi điều trị | `111` / `112` | `131` – Chi tiết Bệnh nhân (Dư Có) |
| **Cấn trừ cọc sang Doanh thu** | Khi hoàn thành dịch vụ trong buổi khám | `131` – Chi tiết Bệnh nhân (Xóa dư Có) | `511` (Ghi nhận Doanh thu thực) |
| **Thu tiền bảo hiểm bồi thường** | Cơ quan BHYT / Cty BHTM chuyển khoản | `112` (Tiền gửi ngân hàng) | `131` – Chi tiết BHYT / BHTM |
| **Bảo hiểm từ chối – Phòng khám chịu** | Xuất toán hồ sơ, theo hợp đồng phòng khám chịu | `811` (Chi phí khác) | `131` – Chi tiết BHYT / BHTM |
| **Bảo hiểm từ chối – Bệnh nhân chịu** | Xuất toán hồ sơ, hợp đồng cho phép thu lại BN | `131` – Chi tiết Bệnh nhân | `131` – Chi tiết BHYT / BHTM |
| **Bảo hiểm từ chối – Đang khiếu nại** | Chưa có phán quyết cuối cùng | Giữ trạng thái `DISPUTED` | Chưa đảo công nợ |
| **Giá vốn thuốc kê đơn** | Xuất kho theo ca khám bệnh (FIFO Split-Lot) | `632` (Giá vốn hàng bán) | `156` (Hàng hóa kho thuốc) |
| **Giá vốn vật tư cấy ghép** | Xuất kho theo ca khám bệnh | `632` (Giá vốn hàng bán) | `152` (Vật tư y tế kho) |
| **Chi phí gia công Labo răng** | Khi nhận bàn giao mẫu răng từ Labo | `632` (hoặc `154`) | `331` – Chi tiết Xưởng Labo |
| **Thanh toán tiền gia công Labo** | Kế toán chuyển khoản trả xưởng Labo | `331` – Chi tiết Xưởng Labo | `112` (Tiền gửi ngân hàng) |
| **Nhập kho Thuốc / Vật tư** | Mua hàng từ nhà cung cấp | `152`, `156`; `1331` (VAT vào) | `111`, `112`, hoặc `331` (Công nợ NCC) |
| **Xuất vật tư tiêu hao buồng** | Định kỳ xuất cho ghế nha khoa | `641` (Chi phí bán hàng/dịch vụ) | `152` (Nguyên liệu, vật liệu) |
| **Xuất hủy hàng hỏng / Hết hạn** | Định kỳ xuất hủy sau kiểm kê | `642` hoặc `811` | `152` / `156` |
| **Hoàn trả tiền cọc bệnh nhân** | Hủy hợp đồng hoàn cọc 100% | `131` – Chi tiết Bệnh nhân | `111` / `112` |
| **Phạt cọc khi hủy hợp đồng** | Trích phạt tiền cọc vi phạm hợp đồng | `131` – Chi tiết Bệnh nhân | `711` (Thu nhập khác) |
| **Chênh lệch thiếu tiền két ca thu ngân** | Khi đóng ca kiểm đếm thiếu tiền mặt | `1388` (Phải thu nhân viên) | `111` (Tiền mặt) |
| **Chênh lệch thừa tiền két ca thu ngân** | Khi đóng ca kiểm đếm thừa tiền mặt | `111` (Tiền mặt) | `3388` (Phải trả chờ đối soát) |
| **Làm tròn tiền lẻ giảm cho khách** | Làm tròn giảm đơn vị nghìn khi thu tiền | `811` (Chi phí khác) | `131` – Chi tiết Bệnh nhân |
| **Làm tròn tiền lẻ tăng thu của khách** | Làm tròn tăng đơn vị nghìn khi thu tiền | `111` (Tiền mặt) | `711` (Thu nhập khác) |
| **Chiết khấu thương mại cho khách hàng** | Giảm giá theo chương trình / VIP | `5211` (Chiết khấu thương mại) | `131` (hoặc giảm trừ trực tiếp 511) |
| **Trích lương nhân sự nha khoa** | Tính bảng lương định kỳ hàng tháng | `641` (BS, Phụ tá) / `642` (Lễ tân, KT) | `334` (Phải trả người lao động) |
| **Chi trả hoa hồng Bác sĩ** | Cùng kỳ thanh toán lương (Cash-basis) | `641` (Chi phí dịch vụ) | `334` (Phải trả Bác sĩ) |
| **Khấu hao ghế máy, máy X-quang** | Tính khấu hao định kỳ hàng tháng | `641` / `642` | `214` (Hao mòn TSCĐ) |
| **Kết chuyển doanh thu, chi phí** | Cuối kỳ kế toán xác định kết quả KD | `511` kết chuyển sang `911` | `911` nhận từ `632`, `641`, `642`, `811`... |

---

### 6.3 Chính sách Thuế, Hóa đơn điện tử & Chuẩn Dữ liệu BHYT

1. **Phân loại Thuế suất HĐĐT (Nghị định 123/2020/NĐ-CP):**
   * Dịch vụ Khám chữa bệnh RHM: **Không chịu thuế GTGT** (bỏ qua dòng TK 3331).
   * Thuốc kê đơn điều trị: Thuế suất **5%**.
   * Mỹ phẩm nha khoa & Sản phẩm thẩm mỹ ngoài danh mục: Thuế suất **10%**.
2. **Cấu trúc Dữ liệu Cổng Giám định BHYT (Quyết định 4210/QĐ-BYT & Quyết định 130/QĐ-BYT):**
   * Khi phòng khám bật cấu hình `ENABLE_BHYT_MODULE = True`, hệ thống chuẩn bị sẵn cấu trúc kết xuất XML:
     * **Bảng 1 (XML1):** Tổng hợp hồ sơ KCB (Mã BN, Số thẻ BHYT, Mã cơ sở KCB, Ngày vào/ra, Mã bệnh ICD-10, Tổng chi phí, Tiền BHYT trả, Tiền người bệnh trả).
     * **Bảng 2 (XML2):** Chi tiết thuốc thanh toán BHYT (Mã hoạt chất, Tên thuốc, Đơn vị tính, Số lượng, Đơn giá BHYT, Tỷ lệ thanh toán).
     * **Bảng 3 (XML3):** Chi tiết dịch vụ kỹ thuật & vật tư y tế (Mã dịch vụ BHYT, Tên kỹ thuật, Răng số, Giá phê duyệt BHYT).
3. **Vòng đời `Insurance_Claim_ID` (`CLM#YYYYMMDD#/0001–9999`) ⭐ BỔ SUNG QUY TRÌNH TẠI V13:**
   * Hệ thống tự động sinh `Insurance_Claim_ID` **ngay khi** lượt khám (Mục 2) được xác nhận `Đối tượng thanh toán chính = BHYT` (hoặc BHTM) và Bác sĩ hoàn tất `Chốt dịch vụ` (Mục 3.4) — mỗi lượt khám có bảo hiểm chi trả tương ứng đúng 1 `Insurance_Claim_ID`.
   * Vòng đời trạng thái: `DRAFT` (đang chờ đóng gói XML Bảng 1-2-3) → `SUBMITTED` (đã đẩy lên Cổng giám định) → `APPROVED` / `PARTIALLY_APPROVED` / `DISPUTED` / `REJECTED`.
   * Khi kết quả giám định trả về `APPROVED`/`PARTIALLY_APPROVED`: hệ thống tự động tất toán công nợ `131 – Chi tiết BHYT/BHTM` theo đúng số tiền được duyệt, phần chênh lệch (nếu có) xử lý theo 2 nhánh Mục 6.2 ("Bảo hiểm từ chối – Phòng khám chịu" / "Bệnh nhân chịu"). Khi `REJECTED`/`DISPUTED`, `Insurance_Claim_ID` giữ nguyên trạng thái tham chiếu, tuân thủ Mục 15 (không xóa, chỉ tạo bản ghi điều chỉnh mới nếu khiếu nại lại).

---

### 6.4 Công thức tính Hoa hồng Bác sĩ (Doctor Commission Model)

> [!IMPORTANT]
> **Nguyên tắc Kế toán Thận trọng theo Dòng tiền (Cash-basis Commission):**
> 1. Hoa hồng Bác sĩ chỉ được tính trên **SỐ TIỀN THỰC THU BẰNG TIỀN (111/112)** hoặc **TIỀN CỌC ĐÃ CẤN TRỪ VÀO DOANH THU (131 Dư Có $\rightarrow$ 511)**.
> 2. Các khoản bệnh nhân **Ghi nợ chưa trả** hoặc bảo hiểm **Chưa chuyển khoản bồi thường**: **TUYỆT ĐỐI CHƯA TÍNH HOA HỒNG**. Khi nào tiền thực sự vào tài khoản/quỹ, hệ thống mới tự động đưa vào bảng tính hoa hồng của kỳ lương phát sinh dòng tiền đó.
> 3. **Cơ chế Thu hồi / Điều chỉnh hoa hồng (Clawback Policy):** Khi phát sinh hủy dịch vụ hoặc hoàn tiền cho bệnh nhân, hệ thống tự động sinh một bản ghi điều chỉnh âm mang Khóa chính bất biến `Commission_Adjustment_ID` (Mục 15.1) trừ trực tiếp vào kỳ lương gần nhất của Bác sĩ phụ trách.

**Công thức tính toán tự động:**
$$\text{Hoa hồng Bác sĩ trong kỳ} = \sum_{i=1}^{n} \left( \text{Doanh thu Dịch vụ } i \text{ đã thực thu bằng tiền} \times \% \text{ Hoa hồng nhóm dịch vụ } i \right) - \text{Clawback hoàn tiền}$$

* Bảng tỷ lệ hoa hồng mẫu cấu hình theo nhóm dịch vụ:
  * Cạo vôi răng, Đánh bóng: $5\%$
  * Hàn trám răng thẩm mỹ, Chữa tủy răng: $10\%$
  * Tiểu phẫu nhổ răng khôn khó: $15\%$
  * Phẫu thuật Cấy ghép Implant (tiền công phẫu thuật): $8\%$
  * Phục hình răng sứ thẩm mỹ: $7\%$
* Dịch vụ Bảo hành / Khuyến mãi miễn phí (Thành tiền = 0): **Không tính hoa hồng**.

---

### 6.5 Quản lý Công nợ chi tiết & Hệ thống Báo cáo tài chính
* Quản lý chi tiết công nợ: BN (131), BHTM/BHYT (131), Xưởng Labo (331-Labo), Nhà cung cấp (331-NCC).
* Báo cáo P&L, Sổ cái, Cân đối phát sinh, Báo cáo Lãi gộp từng ca điều trị (Doanh thu - Giá vốn thuốc/VTYT - Chi phí Labo - Hoa hồng BS).

---

## 7. MODULE LỊCH SỬ KHÁM BỆNH EMR (TIMELINE AUDIT)
* Tìm kiếm theo Mã BN, CCCD, SĐT. Hiển thị Timeline toàn bộ các ca khám quá khứ ở chế độ **Read-only**.
* Hiển thị chuỗi đính chính (Addendum Chain) liên kết với bệnh án gốc nếu có đính chính.

---

## 8. MODULE TRA CỨU BẢO HÀNH DỊCH VỤ NHA KHOA ⭐
* Tra cứu theo Mã BN, SĐT hoặc quét QR thẻ bảo hành. Quản lý trạng thái: `ACTIVE`, `EXPIRED`, `VOID`.
* Tự động áp dụng đơn giá 0đ khi tái khám bảo hành; chọn lý do miễn phí = "Bảo hành", không phát sinh doanh thu và không tính hoa hồng Bác sĩ.
* **Đồng bộ cơ chế Chốt ca 0đ với Mục 2.5 ⭐ LÀM RÕ TẠI V13:** Ca tái khám bảo hành có `Gross Charge = 0` áp dụng **chính xác cùng một cơ chế tự động** với Buổi Tái khám Không phát sinh Chi phí (Mục 2.5): khi Bác sĩ bấm `Chốt dịch vụ` và Tổng tiền phải thu = 0, hệ thống tự động chuyển thẳng lượt khám từ `2 -> 4 Hoàn tất`, bỏ qua trạng thái `3 Chờ thanh toán`, tuyệt đối không sinh Phiếu thu 0đ hay bản ghi công nợ rác.

---

## 9. MODULE NHÂN SỰ & QUẢN LÝ TIỀN LƯƠNG
* Quản lý thông tin nhân sự, Số CCHN của Bác sĩ, ca chấm công.
* Tự động kéo bảng tính hoa hồng Bác sĩ (Mục 6.4) vào kỳ lương tháng:
  $$\text{Thực lĩnh} = \text{Lương cơ bản} + \text{Phụ cấp} + \text{Hoa hồng dịch vụ (Cash-basis)} - \text{Trích BHXH/BHYT} - \text{Thuế TNCN} - \text{Phạt tiền két thiếu (Mục 4.7)}$$

---

## 10. MODULE TÀI SẢN CỐ ĐỊNH NHA KHOA
* Quản lý Ghế nha thông minh, Máy chụp CT Conebeam, Máy X-quang, Nồi hấp Autoclave. Khấu hao đường thẳng theo tháng (`Nợ 641/Có 214`). Tự động nhắc lịch bảo trì, bảo dưỡng định kỳ.

---

## 11. BẢO MẬT, AN TOÀN DỮ LIỆU & TIÊU CHUẨN PHÁP LÝ EMR

Tuân thủ nghiêm ngặt **Thông tư 46/2018/TT-BYT** quy định về Hồ sơ bệnh án điện tử, **Luật Khám bệnh, chữa bệnh 2023** và **Nghị định 13/2023/NĐ-CP** về Bảo vệ dữ liệu cá nhân:

```
+------------------------------------------------------------------------+
|                          LỚP TRUY CẬP (ACCESS LAYER)                   |
|   Xác thực đa yếu tố (2FA - OTP SMS/App) + Phân quyền RBAC chặt chẽ   |
+------------------------------------------------------------------------+
                                    │
                                    ▼
+------------------------------------------------------------------------+
|                      LỚP ĐƯỜNG TRUYỀN (TRANSPORT LAYER)                |
|           Mã hóa toàn bộ gói tin chuẩn TLS 1.3 / HTTPS 256-bit         |
+------------------------------------------------------------------------+
                                    │
                                    ▼
+------------------------------------------------------------------------+
|                     LỚP DỮ LIỆU LƯU TRỮ (STORAGE LAYER)                |
|       Mã hóa trường nhạy cảm (CCCD, Bệnh án, Dị ứng) chuẩn AES-256     |
|       Nhật ký truy vết (Audit Log) bất biến ghi lại mọi thao tác       |
+------------------------------------------------------------------------+
                                    │
                                    ▼
+------------------------------------------------------------------------+
|                      PHÁP LÝ & LIÊN THÔNG (LEGAL & EXPORT)             |
|       Ký số MySign Viettel-CA + Export XML/PDF Bệnh án theo TT 46      |
+------------------------------------------------------------------------+
```

1. **Mã hóa AES-256 & Bất biến Audit Log:** Ghi log cả hành động Đọc (Xem) và Ghi (Thêm, Sửa, Xóa, Override dị ứng, Bypass ký số).
2. **Quyền Break-glass Khẩn cấp:** Giới hạn tối đa 60 phút (`BREAK_GLASS_MAX_MINUTES = 60`), ghi rõ lý do và tự động thu hồi.
3. **Chính sách Lưu trữ & Xóa mềm Bệnh án 10-15 năm (Data Retention & Archiving Policy) ⭐ MỚI TẠI V12:**
   * **Cấm hoàn toàn Hard-Delete trên toàn bộ cơ sở dữ liệu production.** Mọi bảng dữ liệu đều áp dụng cờ xóa mềm (`Is_Deleted = FALSE`).
   * Tuân thủ quy định pháp luật: Hồ sơ bệnh án điện tử và các chứng từ liên quan được lưu trữ tối thiểu **10 năm** đối với trường hợp thông thường, và **15 năm** đối với trường hợp có tai biến hoặc tranh chấp khiếu nại y tế.
   * Định kỳ sau 5 năm, dữ liệu lịch sử được chuyển sang phân vùng lưu trữ lạnh (Cold Storage Archive) để tối ưu hiệu năng cơ sở dữ liệu chính nhưng vẫn bảo đảm khả năng truy xuất phục vụ cơ quan điều tra/thanh tra y tế khi có yêu cầu.

---

## 12. KÝ DUYỆT ĐIỆN TỬ (MySign – Viettel-CA)
* Ký hồ sơ khám bệnh/đơn thuốc qua App MySign Viettel-CA gắn Timestamp.
* Ký duyệt chứng từ kế toán: Phiếu thu/chi chỉ sang `DA_HACH_TOAN` sau khi Kế toán trưởng ký duyệt qua MySign.
* Lưu vết SHA-256 Hash văn bản, phát hiện và cảnh báo mọi hành vi can thiệp trái phép sau khi ký.

---

## 13. BẢNG MÃ HÓA TRẠNG THÁI TOÀN HỆ THỐNG (STATE ENUMS)

### 13.1 Trạng thái Lượt tiếp nhận (Visit Session Status)
* `-1`: `HUY` | `0`: `MOI` | `1`: `DANG_KHAM` | `2`: `DA_KHAM_CHO_XU_LY` | `3`: `CHO_THANH_TOAN` | `4`: `HOAN_TAT`.

### 13.2 Trạng thái Ký số Hồ sơ khám (Signature Status)
* `KHONG_AP_DUNG` | `CHO_KY` | `DA_KY` | `KY_OFFLINE_CHO_BU`.

### 13.3 Trạng thái Giấy Đồng thuận Điều trị (Informed Consent Status) ⭐ MỚI
* `NOT_REQUIRED`: Thủ thuật thông thường không xâm lấn.
* `PENDING_SIGNATURE`: Đã tạo mẫu cam kết, chờ người bệnh ký trên Tablet.
* `SIGNED`: Bệnh nhân đã ký xác nhận hợp lệ, đính kèm file PDF/A.
* `REVOKED`: Bệnh nhân rút lại cam kết trước khi thực hiện thủ thuật.

### 13.4 Trạng thái Ca Thu ngân (Cash Shift Status) ⭐ MỚI
* `OPEN`: Ca đang mở nhận thanh toán.
* `PENDING_CLOSE`: Đã nộp bảng kê kiểm đếm, chờ kế toán đối soát.
* `CLOSED`: Ca đã đóng kiểm đếm xong.
* `RECONCILED`: Kế toán quỹ đã duyệt khớp số liệu két tiền.

### 13.5 Trạng thái Chu trình Tiệt trùng (Sterilization Cycle Status) ⭐ MỚI
* `IN_PROGRESS`: Đang trong chu trình hấp tiệt trùng.
* `PASSED`: Hấp đạt chuẩn, chỉ thị màu sinh học/hóa học đạt.
* `FAILED`: Chu trình lỗi, bắt buộc hủy bỏ và hấp lại.

### 13.6 Trạng thái Giai đoạn Kế hoạch điều trị (Treatment Phase Status)
* `CHO_THUC_HIEN` $\rightarrow$ `DANG_THUC_HIEN` $\rightarrow$ `HOAN_TAT` / `HUY`.

### 13.7 Trạng thái Phiếu gửi Labo (Dental Lab Status)
* `CHO_GUI_MAU` $\rightarrow$ `DANG_LAM` $\rightarrow$ `DA_NHAN_MAU` $\rightarrow$ `DA_GAN_CHO_KHACH` $\rightarrow$ `BAO_HANH_LAM_LAI`.

### 13.8 Trạng thái Chứng từ Kế toán (Journal Voucher Status)
* `CHUA_DUYET` $\rightarrow$ `DA_DUYET` $\rightarrow$ `DA_HACH_TOAN` $\rightarrow$ `DIEU_CHINH`.

### 13.9 Trạng thái Thanh toán (Billing Status)
* `CHO_PHAN_BO` $\rightarrow$ `SAN_SANG_THU` $\rightarrow$ `THU_MOT_PHAN` $\rightarrow$ `DA_THANH_TOAN` / `DA_GHI_NO` $\rightarrow$ `DANG_HOAN` $\rightarrow$ `DA_HOAN`.

### 13.10 Trạng thái Tồn kho Lot/Serial
* `AVAILABLE` $\rightarrow$ `RESERVED` $\rightarrow$ `CONSUMED` / `RELEASED` $\rightarrow$ `RETURNED` / `QUARANTINED` / `EXPIRED`.

---

## 14. CẤU HÌNH THAM SỐ TOÀN HỆ THỐNG (SYSTEM CONFIGURATION)

| Tên tham số cấu hình | Giá trị mặc định | Diễn giải chức năng hệ thống |
|:---|:---:|:---|
| `ENABLE_BHYT_MODULE` | `False` (Tắt) | Bật/Tắt phân hệ BHYT nhà nước theo chuẩn QĐ 4210/130 Bộ Y tế |
| `MYSIGN_MANDATORY_SERVICES` | Danh mục mã DV | Thiết lập danh sách các thủ thuật bắt buộc ký số (Implant, Nhổ răng khôn, Chữa tủy...) |
| `INFORMED_CONSENT_MANDATORY_SERVICES` | Danh mục mã DV | Thiết lập danh sách các thủ thuật xâm lấn bắt buộc ký Giấy đồng thuận điều trị |
| `DOCTOR_COMMISSION_MODEL` | `CASH_BASIS` | Mặc định tính hoa hồng theo tiền thực thu; Tùy chọn chuyển `ACCRUAL_BASIS` |
| `DOCTOR_COMMISSION_RATES` | Cấu hình theo % | Bảng tỷ lệ phần trăm hoa hồng chi trả cho Bác sĩ theo từng nhóm dịch vụ kỹ thuật |
| `DEFAULT_MIN_STOCK_ALERT` | `10` đơn vị | Ngưỡng số lượng tồn kho tối thiểu cảnh báo đặt hàng |
| `EXPIRY_WARNING_DAYS` | `60` ngày | Số ngày hệ thống tự động quét cảnh báo hàng cận hạn sử dụng |
| `STERILIZATION_EXPIRY_DAYS` | `30` ngày | Thời hạn tối đa vô trùng của gói dụng cụ hấp túi ép chuyên dụng |
| `CASH_OVER_SHORT_THRESHOLD` | `50.000` đ | Ngưỡng chênh lệch tiền két ca thu ngân bắt buộc biên bản giải trình cấp quản lý |
| `DISCOUNT_APPROVAL_MAX_L1` | `5` % | Hạn mức chiết khấu tối đa Bác sĩ/Tiếp nhận được tự duyệt |
| `DISCOUNT_APPROVAL_MAX_L2` | `15` % | Hạn mức chiết khấu tối đa Quản lý chi nhánh được duyệt |
| `MAX_ROUNDING_AMOUNT` ⭐ MỚI V13 | `9.999` đ | Trần số tiền được phép làm tròn giảm/tăng trên mỗi hóa đơn; vượt ngưỡng bắt buộc chuyển sang luồng Chiết khấu có duyệt (Mục 4.8.3) |
| `EINVOICE_INTEGRATION` | `MISA / Viettel` | Cấu hình tài khoản, mật khẩu, Token API kết nối hệ thống Hóa đơn điện tử |
| `DEFAULT_WARRANTY_MONTHS` | `36` tháng | Thời gian cam kết bảo hành mặc định cho dịch vụ phục hình răng sứ |
| `MAX_BYPASS_HOURS` | `24` giờ | Thời hạn tối đa Bác sĩ phải hoàn tất ký bù sau khi kích hoạt Bypass khẩn cấp |
| `STOCK_RESERVATION_TTL_MINUTES` | `30` phút | Thời gian tối đa giữ chỗ vật tư Lot/Serial trước khi tự động giải phóng |

---

## 15. NGUYÊN TẮC BẤT BIẾN CỦA KHÓA CHÍNH VÀ BẢO TOÀN DÒNG DỮ LIỆU (PRIMARY KEY & ROW DATA INTEGRITY INVARIANTS) ⭐⭐⭐

> [!CAUTION]
> **ĐIỀU KIỆN TIÊN QUYẾT TRONG THIẾT KẾ CƠ SỞ DỮ LIỆU VÀ LẬP TRÌNH HỆ THỐNG:**
> Khóa chính (Primary Key - PK) là trục xương sống duy nhất bảo đảm tính toàn vẹn tham chiếu, tính bất biến của lịch sử giao dịch và giá trị pháp lý của hồ sơ y tế điện tử. **BẤT KỲ HÀNH VI NÀO CAN THIỆP SỬA ĐỔI KHÓA CHÍNH ĐỀU BỊ COI LÀ LỖI HỆ THỐNG NGHIÊM TRỌNG (FATAL DATA VIOLATION).**

### 15.0 Quy tắc Mặc định Toàn hệ thống (Default-Deny Rule)
1. **Cấm sửa Khóa chính ở "bất kỳ mục nào"** trong toàn bộ hệ thống. Áp dụng cho **mọi bảng dữ liệu (table)** hiện tại và phát sinh trong tương lai.
2. Mặc định mọi bảng mới tạo đều có cờ `PK_PROTECTED = TRUE`.
3. **Bảo toàn Dữ liệu dòng Khóa chính:** Một khi dòng dữ liệu đã xác lập với PK, các trường dữ liệu định danh cấu thành hoặc gắn liền với dòng đó không được sửa đổi tùy tiện, tuân thủ Whitelist trường được phép sửa tại Mục 15.3.

---

### 15.1 Danh mục 30 Khóa chính và Mã định danh bất biến trong hệ thống (Mở rộng v13)

| Thực thể nghiệp vụ | Tên trường Khóa chính (PK) | Quy cách sinh mã (Format) | Tính chất |
|:---|:---|:---|:---:|
| **Hồ sơ bệnh nhân** | `Patient_ID` (Mã BN) | `BN#000001` tăng dần vĩnh viễn | Bất biến suốt đời |
| **Lượt tiếp nhận khám** | `Visit_ID` (Số tiếp nhận) | `STN#YYYYMMDD#/0001–9999` theo ngày | Bất biến phiên khám |
| **Hồ sơ bệnh án điện tử** | `EMR_Record_ID` | `EMR#YYYYMMDD#/STN_ID` | Bất biến lâm sàng |
| **Giấy Đồng thuận điều trị** ⭐ MỚI | `Consent_ID` | `CST#YYYYMMDD#/0001–9999` | Bất biến cam kết |
| **Giai đoạn phác đồ** | `Treatment_Phase_ID` | UUIDv7 hoặc `TP#STN#/Seq` | Bất biến phác đồ |
| **Đơn thuốc điện tử** | `Prescription_Line_ID` | UUIDv7 hoặc `RX#STN#/Seq` | Bất biến kê đơn |
| **Chỉ định Cận lâm sàng** | `Lab_Order_ID` | UUIDv7 hoặc `CLS#STN#/Seq` | Bất biến chỉ định |
| **Phiếu gửi Labo gia công** | `Labo_Ticket_ID` | `LB#YYYYMMDD#/0001–9999` | Bất biến phiếu Labo |
| **Vật tư đặc thù cấy ghép** | `Serial_No` + `Lot_No` + `Item_Code` | Chuẩn NSX (Mã vạch / QR) | Bất biến hiện vật |
| **Chu trình hấp tiệt trùng** ⭐ MỚI | `Sterilization_Cycle_ID` | `STER#YYYYMMDD#/001–999` | Bất biến tiệt trùng |
| **Gói khay dụng cụ vô trùng** ⭐ MỚI | `Instrument_Pack_ID` | `PACK#YYYYMMDD#/0001–9999` | Bất biến khay dụng cụ |
| **Phiếu nhập kho** | `Receipt_ID` (Số phiếu nhập) | `NK#YYYYMMDD#/0001–9999` | Bất biến nhập kho |
| **Phiếu xuất kho** | `Issue_ID` (Số phiếu xuất) | `XK#YYYYMMDD#/0001–9999` | Bất biến xuất kho |
| **Khoản tiền cọc tạm ứng** | `Deposit_ID` | `DEP#YYYYMMDD#/0001–9999` | Bất biến khoản cọc |
| **Phiên Ca thu ngân** ⭐ MỚI | `Cash_Shift_ID` | `SHIFT#YYYYMMDD#/001–999` | Bất biến ca làm việc |
| **Chứng từ thanh toán** | `Payment_Transaction_ID` | `PAY#YYYYMMDD#/0001–9999` | Bất biến giao dịch thu |
| **Phiếu thu tiền mặt/ngân hàng** | `Voucher_ID` (Số phiếu thu) | `PT#YYYYMMDD#/0001–9999` | Bất biến chứng từ thu |
| **Phiếu chi tiền** | `Voucher_ID` (Số phiếu chi) | `PC#YYYYMMDD#/0001–9999` | Bất biến chứng từ chi |
| **Bút toán sổ cái kế toán** | `Journal_Entry_ID` | `JV#YYYYMMDD#/0001–9999` | Bất biến sổ kế toán |
| **Hồ sơ bảo hành dịch vụ** | `Warranty_ID` | `WAR#YYYYMMDD#/0001–9999` | Bất biến bảo hành |
| **Hồ sơ nhân sự** | `Employee_ID` (Mã NV) | `NV#0001–9999` | Bất biến nhân viên |
| **Tài sản cố định** | `Asset_ID` (Mã tài sản) | `TS#0001–9999` | Bất biến tài sản |
| **Nhật ký truy vết** | `Audit_Log_ID` | UUIDv7 tuần tự theo thời gian | Bất biến Audit Log |
| **Danh mục dịch vụ nha khoa** | `Service_Code` (Mã dịch vụ) | `DV#0001–9999` | Bất biến danh mục |
| **Dòng Bảng giá hiệu lực** | `Price_List_Line_ID` | `PL#Service_Code#/Effective_Date` | Bất biến phiên bản |
| **Hồ sơ bảo lãnh Bảo hiểm** | `Insurance_Claim_ID` | `CLM#YYYYMMDD#/0001–9999` | Bất biến hồ sơ claim |
| **Chứng từ hoàn tiền** | `Refund_Voucher_ID` | `RF#YYYYMMDD#/0001–9999` | Bất biến chứng từ hoàn |
| **Yêu cầu duyệt chiết khấu** ⭐ MỚI V13 | `Discount_Approval_ID` | `DAR#YYYYMMDD#/0001–9999` | Bất biến yêu cầu duyệt |
| **Phụ lục đính chính bệnh án** ⭐ MỚI V13 | `Addendum_ID` | `ADD#EMR_ID#/Seq` | Bất biến đính chính |
| **Điều chỉnh hoa hồng (Clawback)** ⭐ MỚI V13 | `Commission_Adjustment_ID` | `CADJ#YYYYMMDD#/0001–9999` | Bất biến điều chỉnh lương |

> [!NOTE]
> **Bổ sung v13:** Ba khóa chính trên trước đây được mô tả nghiệp vụ (Mục 4.8.1, Mục 15.4, Mục 6.4) nhưng chưa được liệt kê tường minh trong danh mục PK — đã vá để bảo đảm mọi thực thể phát sinh giao dịch đều nằm trong phạm vi bảo vệ Default-Deny (Mục 15.0), tránh vùng xám không rõ chuẩn định danh khi lập trình triển khai.

---

### 15.2 Quy tắc Cấm tuyệt đối sửa Khóa chính (No Primary Key Mutation Rule)
1. **Khóa cứng ở CSDL:** `ON DELETE RESTRICT`, `ON UPDATE RESTRICT`. Cấm hoàn toàn `ON UPDATE CASCADE`.
2. **Khóa cứng ở API Backend:** PK chỉ nằm trên URL Path, cấm nằm trong Request Body cập nhật. Gửi payload sửa PK trả lỗi `422 Unprocessable Entity` / `400 Bad Request`.
3. **Khóa cứng ở Giao diện UI:** Trường PK luôn ở chế độ `Disabled` hoặc `Read-Only`.

---

### 15.3 Quy tắc Bảo toàn Dữ liệu dòng Khóa chính & Cơ chế Whitelist
1. **Cột nguồn gốc bất biến:** `Created_At`, `Created_By`, `Original_Reference_ID`, `Branch_ID` vĩnh viễn không được Update sau khi Insert.
2. **Dòng dữ liệu đã Frozen ⭐ ĐỒNG BỘ ĐẦY ĐỦ TẠI V13:** Khi dòng mang PK đạt một trong các trạng thái sau $\rightarrow$ Khóa cứng 100% các cột số lượng, đơn giá, số tiền, định khoản (chỉ còn được sửa qua cơ chế Đính chính/Đảo bút toán tại Mục 15.4):
   * `DA_KY`, `HOAN_TAT`, `DA_HACH_TOAN`, `CONSUMED` (kế thừa từ v11/v12);
   * `SIGNED` — Giấy đồng thuận điều trị (`Consent_ID`, Mục 3.5) — chỉ đổi được cờ trạng thái sang `REVOKED` theo đúng quy trình 3.5.4, cấm sửa nội dung file PDF/A;
   * `CLOSED` / `RECONCILED` — Ca thu ngân (`Cash_Shift_ID`, Mục 4.7) — không được sửa số liệu kiểm đếm hay bút toán chênh lệch sau khi đóng ca;
   * `PASSED` / `FAILED` — Chu trình tiệt trùng (`Sterilization_Cycle_ID`, Mục 5.4) — kết quả test chỉ thị sinh học/hóa học không được chỉnh sửa sau khi ghi nhận, chỉ có thể tạo chu trình hấp lại mới.
3. **Whitelist trường được phép sửa ngay từ Draft:** Chỉ các trường thuộc Whitelist tường minh mới được phép sửa (có Audit Log lưu giá trị cũ/mới); mọi trường ngoài Whitelist đều bị khóa ngay từ khi tạo dòng.

---

### 15.4 Quy trình Xử lý Chuẩn mực khi Người dùng Nhập sai Dữ liệu
* **Trước khi Chốt/Duyệt:** Bấm nút **Hủy bỏ dòng (Cancel Row)** và tạo dòng mới với PK mới. Cấm sửa đè PK.
* **Sau khi Chốt EMR:** Lập **Phụ lục bệnh án (`Addendum_ID`)** có liên kết tới `EMR_ID` gốc. Bản gốc giữ nguyên 100%.
* **Sau khi Hạch toán Kế toán:** Lập **Chứng từ đảo / Điều chỉnh (`Reversal / Adjustment Voucher`)** có PK mới tham chiếu chứng từ gốc.
* **Sai khi Nhập kho:** Lập Phiếu xuất trả NCC tham chiếu `Receipt ID` gốc và tạo Phiếu nhập kho mới (`NK#` mới).
* **Hợp nhất Bệnh nhân:** `Old BN` chuyển trạng thái `MERGED` trỏ sang `Master BN`. Không xóa, không sửa mã cũ.

---

### 15.5 Quản trị Dữ liệu Danh mục dùng chung (SCD Type 2)
* Thay đổi đơn giá, thuế suất, tài khoản định khoản của một danh mục đã có giao dịch tham chiếu: Bắt buộc `INSERT` dòng phiên bản mới (`Price_List_Line_ID` mới) với `Effective_Date` mới. Dòng cũ giữ nguyên với `Expiry_Date`. Không bao giờ ghi đè dòng cũ.

---

### 15.6 Mẫu Trigger CSDL Tổng quát Khóa cứng Khóa chính
```sql
-- Áp dụng cho MỌI bảng nghiệp vụ (PK_PROTECTED = TRUE theo mặc định Mục 15.0)
CREATE TRIGGER trg_block_pk_update_<table_name>
BEFORE UPDATE ON <table_name>
FOR EACH ROW
BEGIN
    IF NEW.<pk_column> <> OLD.<pk_column> THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL DATA VIOLATION: Primary Key is immutable and cannot be modified (Muc 15.0).';
    END IF;

    -- Bảo toàn các cột nguồn gốc bất biến (Muc 15.3.1)
    IF NEW.Created_At <> OLD.Created_At
       OR NEW.Created_By <> OLD.Created_By
       OR (OLD.Original_Reference_ID IS NOT NULL AND NEW.Original_Reference_ID <> OLD.Original_Reference_ID) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FATAL DATA VIOLATION: Audit/identity columns are immutable (Muc 15.3.1).';
    END IF;
END;
```

---

## 16. BỘ QUY TẮC BẤT BIẾN HỆ THỐNG (SYSTEM INVARIANTS)
1. **Bất biến số tiền:** `Grand Total = Sum(Line Total) = Sum(Payer Allocation) = Sum(Collected) + Sum(Receivable)`. Số dư cọc khả dụng không bao giờ âm. Hoàn tiền không vượt quá số tiền thực thu.
2. **Bất biến kho:** `Available = On Hand - Reserved - Blocked`. Một Serial chỉ được Reserve cho 1 ca khám tại một thời điểm.
3. **Bất biến phân quyền (SoD):** Người tạo chứng từ không được là người ký duyệt chứng từ của chính mình.

---

## 17. NGOẠI LỆ, ĐÍNH CHÍNH VÀ BÙ TRỪ (CORRECTION / REVERSAL / ADDENDUM)
* Mọi đính chính, đảo bút toán, hoàn tiền đều sinh bản ghi mới có PK mới và lưu tham chiếu `Original ID`, `Reason Code`, `Requested By`, `Approved By`, `Timestamp`. Bản ghi gốc luôn giữ nguyên trạng thái lịch sử.

---

## 18. ĐỐI SOÁT ĐÓNG NGÀY / ĐÓNG THÁNG (RECONCILIATION & CLOSE)
* **Checklist đóng ngày (EOD):** Đối soát quỹ tiền mặt két (khớp toàn bộ các Ca thu ngân `Cash_Shift_ID`), Sổ tiền gửi NH 112, Doanh thu thanh toán ca khám, Sổ phụ cọc 131, Công nợ BN 131, Công nợ bảo hiểm, Thẻ kho 152/156, Hồ sơ EMR chưa chốt, Danh sách ký bù MySign quá hạn 24h.
* **Đóng kỳ tháng:** Khóa sổ đóng băng toàn bộ chứng từ trong kỳ. Mọi điều chỉnh sau khóa sổ ghi nhận vào kỳ mở tiếp theo.

---

## 19. BACKUP, KHÔI PHỤC VÀ TÍNH LIÊN TỤC (BACKUP & DISASTER RECOVERY)
* Sao lưu gia tăng (Incremental Backup) mỗi 15 phút (`RPO = 15 phút`). Sao lưu toàn phần (Full Backup) hàng ngày lúc 01:00 AM mã hóa AES-256 lưu Cloud độc lập.
* Định kỳ 30 ngày diễn tập khôi phục thử nghiệm (Restore Drill). Runbook phục hồi: Database $\rightarrow$ Object Storage $\rightarrow$ Queue/APIs $\rightarrow$ Core App $\rightarrow$ Monitoring.

---

## 20. TIÊU CHÍ NGHIỆM THU HỆ THỐNG V13 (DEFINITION OF DONE)

Hệ thống chỉ được cấp phép đưa vào vận hành thực tế khi vượt qua 100% các kịch bản kiểm thử tích hợp (Integration Tests) sau:

| Phân hệ kiểm thử | Kịch bản kiểm thử bắt buộc (Pass Criteria) |
|:---|:---|
| **Toàn vẹn Khóa chính** | Chạy vòng lặp thử sửa PK cho **toàn bộ 30 thực thể tại Mục 15.1** $\rightarrow$ **100% bị chặn ở tầng API (422/400) và Trigger CSDL ném lỗi**. Kiểm thử chặn merge CI/CD nếu bảng mới thiếu trigger khóa PK. |
| **Ngưỡng chênh lệch két (Mới v13)** | Đóng ca với chênh lệch $\le$ `CASH_OVER_SHORT_THRESHOLD` $\rightarrow$ tự đóng ca không cần duyệt. Đóng ca với chênh lệch $>$ ngưỡng $\rightarrow$ **hệ thống chặn Đóng ca**, chỉ mở lại khi Quản lý/Trưởng chi nhánh xác nhận. |
| **Trần làm tròn tiền lẻ (Mới v13)** | Nhập làm tròn giảm vượt `MAX_ROUNDING_AMOUNT` $\rightarrow$ **hệ thống từ chối** và bắt buộc chuyển sang luồng `Discount_Approval_ID` theo đúng Ma trận Thẩm quyền Duyệt Mục 4.8.1. |
| **Thu hồi Đồng thuận điều trị (Mới v13)** | `Consent_ID` chuyển `SIGNED` $\rightarrow$ `REVOKED` trong khi lượt khám còn ở `2_ChoXuLy` $\rightarrow$ hệ thống tự động đảo lượt khám về `1_DangKham`, khóa nút Chốt dịch vụ cho tới khi có `Consent_ID` mới ở trạng thái `SIGNED`. |
| **Bảo hành 0đ (Mới v13)** | Ca tái khám bảo hành `Gross Charge = 0` $\rightarrow$ Chốt dịch vụ tự động chuyển thẳng `2 -> 4 Hoàn tất`, không sinh phiếu thu rác 0đ (đồng nhất với Mục 2.5). |
| **Đóng băng dữ liệu mở rộng (Mới v13)** | Thử sửa số liệu kiểm đếm của `Cash_Shift_ID` ở trạng thái `RECONCILED`, thử sửa kết quả test tiệt trùng của `Sterilization_Cycle_ID` ở trạng thái `PASSED` $\rightarrow$ **100% bị chặn theo Mục 15.3.2**. |
| **Đồng thuận điều trị (Mới v12)** | Ca khám có thủ thuật xâm lấn (Implant, nhổ răng khôn) nhưng chưa có `Consent_ID` trạng thái `SIGNED` $\rightarrow$ **Hệ thống bắt buộc chặn Bác sĩ bấm Chốt dịch vụ**. Ký trên Tablet thành công gắn Timestamp vào bệnh án PDF/A. |
| **Ca thu ngân & Két tiền (Mới v12)** | Kiểm thử quy trình Mở ca $\rightarrow$ Giao dịch gắn đúng `Cash_Shift_ID` $\rightarrow$ Đóng ca kiểm kê. Khi tiền mặt thực tế lệch so với sổ sách $\rightarrow$ Tự động sinh đúng bút toán tạm Nợ 1388 (thiếu) hoặc Có 3388 (thừa). |
| **Tiệt trùng dụng cụ (Mới v12)** | Quét mã khay dụng cụ quá hạn 30 ngày tại ghế răng $\rightarrow$ **Hệ thống cảnh báo đỏ và chặn không cho sử dụng**. |
| **Thuật toán FIFO Kho (Mới v12)** | Xuất thuốc vượt số lượng Lô 1 $\rightarrow$ Hệ thống tự động phân tách thành 2 dòng xuất kho Lô 1 và Lô 2 với giá vốn tương ứng. |
| **Tái khám không thu tiền (Mới v12)** | Ca tái khám thay băng tủy/cắt chỉ có Gross Charge = 0 $\rightarrow$ Chốt dịch vụ tự động chuyển thẳng từ `2 -> 4 Hoàn tất`, không sinh phiếu thu rác 0đ. |
| **Ký số & Bypass** | Ký số MySign thành công gắn Timestamp; Mất mạng kích hoạt Bypass lưu `KY_OFFLINE_CHO_BU`; Tự động khóa mở ca mới khi quá hạn ký bù 24 giờ. |
| **Tổng hợp thanh toán** | Tính toán phân bổ cân bằng 4 đại lượng trong ca Mixed Payment; Chặn cấn trừ vượt số dư cọc khả dụng; Bấm đúp nút thanh toán không sinh 2 phiếu thu (Idempotency Test). |
| **Kế toán tài chính** | Tự động sinh đúng bút toán theo Ma trận TT 99/2025/TT-BTC; Bút toán xuất toán bảo hiểm theo đúng 3 nhánh; Hoa hồng Bác sĩ chỉ phát sinh trên tiền thực thu (Cash-basis); Tự động tạo Clawback khi hoàn tiền. |
| **Bảo mật & Audit Log** | Mã hóa AES-256 số CCCD và bệnh án; Ghi nhận Audit Log bất biến cả thao tác Xem bệnh án; Kích hoạt Break-glass ghi rõ lý do và tự hết hạn sau 60 phút. Cấm tuyệt đối Hard-Delete trên production. |
| **Phục hồi thảm họa** | Khôi phục backup thành công trong SLA; Toàn bộ liên kết Khóa chính - Khóa ngoại nguyên vẹn 100% không có bản ghi mồ côi (Zero Orphan Records). |

---

*© Phiên bản v13 – Production-Ready Blueprint & Enterprise Governance. Kế thừa toàn bộ nền tảng v12 (Đồng thuận điều trị điện tử, Kiểm soát vô trùng dụng cụ, Tái khám không thu phí, quản trị tài chính két tiền ca thu ngân, phân tách lô FIFO giá vốn) và vá 8 lỗ hổng chặt chẽ được rà soát độc lập: ngưỡng kiểm soát chênh lệch két, trần làm tròn tiền lẻ chống lách duyệt chiết khấu, xử lý thu hồi đồng thuận điều trị, đồng bộ danh sách trạng thái đóng băng dữ liệu, mở rộng Khóa chính bất biến lên 30 thực thể theo nguyên tắc Default-Deny, vòng đời hồ sơ bảo hiểm, hợp nhất công thức bất biến số tiền và đồng nhất cơ chế chốt ca 0đ. Bản đặc tả hoàn thiện, sẵn sàng để bàn giao cho đội ngũ kỹ thuật lập trình triển khai vào mã nguồn.*
