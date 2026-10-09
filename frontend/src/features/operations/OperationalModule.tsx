import { Activity, BadgeCheck, Check, CircleDollarSign, ClipboardList, Clock3, FlaskConical, HeartPulse, Home, Layers3, Package, Plus, Search, ShieldCheck, Sparkles, Stethoscope, Users } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, money, shortDate, type CurrentUser, type Section } from "../../api";
import { VisitStatus, MiniStat, Modal, EmptyRow } from "../../shared/components";

export function OperationalModule({ section, user, onNotice }: { section: OperationalSection; user: CurrentUser; onNotice: (message: string, type?: "success" | "error") => void }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const config = moduleConfigs[section];
  const load = useCallback(async () => {
    try { setRows(await api<Record<string, unknown>[]>(config.endpoint)); }
    catch (error) { setRows([]); if (!(error instanceof Error && error.message.includes("Cannot"))) onNotice(error instanceof Error ? error.message : "Không tải được dữ liệu.", "error"); }
  }, [config.endpoint, onNotice]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const listener = (event: Event) => { if ((event as CustomEvent).detail === section) setIsOpen(true); };
    window.addEventListener("erp:open-create", listener);
    return () => window.removeEventListener("erp:open-create", listener);
  }, [section]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => config.numericFields.includes(key) ? [key, Number(value)] : [key, value]));
    try {
      await api(config.createEndpoint, { method: "POST", body: JSON.stringify(payload) });
      onNotice("Đã lưu dữ liệu nghiệp vụ.");
      setIsOpen(false); setForm({});
      await load();
    } catch (error) { onNotice(error instanceof Error ? error.message : "Không thể lưu dữ liệu.", "error"); }
    finally { setBusy(false); }
  }
  async function approveJournal(row: Record<string, unknown>) {
    try {
      await api(`/accounting/journals/${row.JournalEntryId}/approve`, { method: "POST" });
      onNotice("Đã duyệt bút toán.");
      await load();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không thể duyệt bút toán.", "error");
    }
  }
  const readOnly = !config.roles.includes(user.role);
  return <div className="module-content">
    <div className="stats-strip">{config.stats.map((stat) => <MiniStat key={stat.label} label={stat.label} value={typeof stat.value === "function" ? stat.value(rows) : stat.value} icon={stat.icon} tint={stat.tint} />)}</div>
    <div className="panel table-panel"><div className="table-toolbar"><div className="filter-tabs"><button className="filter-active">{config.title} <span>{rows.length}</span></button><button onClick={() => load()}>Cập nhật</button></div><div className="table-tools"><label className="search-box"><Search size={16} /><input placeholder={`Tìm trong ${config.title.toLocaleLowerCase("vi")}...`} /></label>{!readOnly && <button className="primary-button compact-action" onClick={() => setIsOpen(true)}><Plus size={15} />{config.createLabel}</button>}</div></div>
      {section === "sterilization" && <div className="sterilization-note"><ShieldCheck size={17} /><span><strong>Kiểm soát vô khuẩn:</strong> Khay chỉ được sử dụng khi chu trình hấp đạt và còn trong hạn vô trùng 30 ngày.</span></div>}
      {section === "finance" && <div className="accounting-standards"><span className="accounting-doc-icon"><ClipboardList size={18} /></span><span><strong>Danh mục tài khoản doanh nghiệp · TT 99/2025/TT-BTC</strong><small>Tiền mặt 111 · Tiền gửi 112 · Phải thu 131 · Nguyên vật liệu 152 · Hàng hóa 156 · Doanh thu 511 · Giá vốn 632</small></span><BadgeCheck size={18} /></div>}
      {section === "insurance" && <div className="accounting-standards"><span className="accounting-doc-icon"><ShieldCheck size={18} /></span><span><strong>Hồ sơ BHYT / BHTM theo lượt khám</strong><small>Claim được sinh từ lượt khám và hoàn tất chốt dịch vụ; theo dõi trạng thái DRAFT → SUBMITTED → APPROVED / DISPUTED.</small></span></div>}
      <div className="table-scroll"><table className="data-table"><thead><tr>{config.columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row[config.rowKey] ?? index)}>{config.columns.map((column) => <td key={column.key}>{column.render ? column.render(row[column.key], row) : String(row[column.key] ?? "—")}{section === "finance" && column.key === "Status" && row.Status === "DRAFT" && user.role === "CHIEF_ACCOUNTANT" && <button className="inline-approve" onClick={() => void approveJournal(row)}>Duyệt</button>}</td>)}</tr>)}{rows.length === 0 && <EmptyRow colSpan={config.columns.length} title={config.emptyTitle} body={config.emptyBody} />}</tbody></table></div>
    </div>
    {isOpen && <Modal title={config.modalTitle} subtitle={config.modalSubtitle} onClose={() => setIsOpen(false)}><form className="form-grid" onSubmit={submit}>{config.fields.map((field) => <label key={field.key} className={field.wide ? "span-2" : ""}>{field.label}{field.type === "select" ? <select required={field.required} value={form[field.key] ?? ""} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}><option value="">Chọn</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "textarea" ? <textarea required={field.required} value={form[field.key] ?? ""} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} rows={3} /> : <input required={field.required} type={field.type ?? "text"} min={field.type === "number" ? "0" : undefined} value={form[field.key] ?? ""} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} />}</label>)}<div className="modal-actions span-2"><button className="secondary-button" type="button" onClick={() => setIsOpen(false)}>Hủy</button><button className="primary-button" disabled={busy}>{busy ? "Đang lưu..." : "Lưu hồ sơ"}<Check size={16} /></button></div></form></Modal>}
  </div>;
}

type OperationalSection = Exclude<Section, "dashboard" | "reception" | "patients" | "emr" | "cashier" | "inventory">;

type ModuleConfig = {
  title: string;
  endpoint: string;
  createEndpoint: string;
  createLabel: string;
  rowKey: string;
  roles: string[];
  stats: { label: string; value: ReactNode | ((rows: Record<string, unknown>[]) => ReactNode); icon: typeof Home; tint: string }[];
  columns: { key: string; label: string; render?: (value: unknown, row: Record<string, unknown>) => ReactNode }[];
  fields: { key: string; label: string; type?: string; required?: boolean; wide?: boolean; options?: { value: string; label: string }[] }[];
  numericFields: string[];
  emptyTitle: string;
  emptyBody: string;
  modalTitle: string;
  modalSubtitle: string;
};

const moduleConfigs: Record<OperationalSection, ModuleConfig> = {
  sterilization: {
    title: "Chu trình tiệt trùng", endpoint: "/sterilization/cycles", createEndpoint: "/sterilization/cycles", createLabel: "Ghi chu trình hấp", rowKey: "SterilizationCycleId", roles: ["ADMIN", "INVENTORY_MANAGER", "ASSISTANT"],
    stats: [
      { label: "TỔNG CHU TRÌNH", value: (rows) => rows.length, icon: Sparkles, tint: "blue" },
      { label: "ĐẠT KIỂM ĐỊNH", value: (rows) => rows.filter((row) => row.Status === "PASSED").length, icon: Check, tint: "green" },
      { label: "CHỜ ĐÁNH GIÁ", value: (rows) => rows.filter((row) => row.Status === "IN_PROGRESS").length, icon: Clock3, tint: "amber" },
      { label: "GÓI DỤNG CỤ", value: "Mã truy xuất", icon: Package, tint: "violet" }
    ],
    columns: [{ key: "CycleCode", label: "MÃ CHU TRÌNH" }, { key: "AutoclaveName", label: "THIẾT BỊ" }, { key: "OperatorName", label: "NHÂN VIÊN" }, { key: "TemperatureC", label: "NHIỆT ĐỘ °C" }, { key: "Status", label: "KẾT QUẢ", render: (value) => <VisitStatus status={value === "PASSED" ? 4 : value === "FAILED" ? -1 : 2} /> }, { key: "CreatedAt", label: "THỜI GIAN", render: (value) => value ? shortDate(String(value)) : "—" }],
    fields: [{ key: "autoclaveName", label: "Tên nồi hấp", required: true }, { key: "temperatureC", label: "Nhiệt độ (°C)", type: "number", required: true }, { key: "pressureKpa", label: "Áp suất (kPa)", type: "number", required: true }, { key: "durationMinutes", label: "Thời gian (phút)", type: "number", required: true }, { key: "indicatorResult", label: "Kết quả chỉ thị", type: "select", required: true, options: [{ value: "PENDING", label: "Chờ kết quả" }, { value: "PASSED", label: "Đạt" }, { value: "FAILED", label: "Không đạt" }] }],
    numericFields: ["temperatureC", "pressureKpa", "durationMinutes"], emptyTitle: "Chưa có chu trình hấp", emptyBody: "Ghi nhận chu trình để theo dõi hạn vô khuẩn và khay dụng cụ.", modalTitle: "Ghi nhận chu trình tiệt trùng", modalSubtitle: "Kết quả đã đạt/không đạt sẽ được lưu vết, không thể sửa đè."
  },
  lab: {
    title: "Phiếu Labo", endpoint: "/operations/labo", createEndpoint: "/operations/labo", createLabel: "Tạo phiếu Labo", rowKey: "LaboTicketId", roles: ["ADMIN", "DOCTOR", "ASSISTANT"],
    stats: [
      { label: "TỔNG PHIẾU", value: (rows) => rows.length, icon: FlaskConical, tint: "blue" },
      { label: "ĐANG GIA CÔNG", value: (rows) => rows.filter((row) => row.Status === "IN_PROGRESS").length, icon: Clock3, tint: "amber" },
      { label: "CHỜ GẮN CHO KHÁCH", value: (rows) => rows.filter((row) => row.Status === "RECEIVED").length, icon: Package, tint: "violet" },
      { label: "LÀM LẠI", value: (rows) => rows.filter((row) => row.Status === "REWORK").length, icon: Activity, tint: "red" }
    ],
    columns: [{ key: "TicketCode", label: "MÃ PHIẾU" }, { key: "PatientName", label: "BỆNH NHÂN" }, { key: "LabName", label: "XƯỞNG LABO" }, { key: "WorkDescription", label: "SẢN PHẨM" }, { key: "DueAt", label: "NGÀY HẸN", render: (value) => value ? shortDate(String(value)) : "—" }, { key: "Status", label: "TRẠNG THÁI" }],
    fields: [{ key: "visitId", label: "Mã lượt khám", required: true }, { key: "labName", label: "Xưởng Labo", required: true }, { key: "workDescription", label: "Sản phẩm gia công", required: true, wide: true }, { key: "dueAt", label: "Ngày hẹn", type: "date", required: true }, { key: "estimatedCost", label: "Chi phí ước tính", type: "number", required: true }],
    numericFields: ["estimatedCost"], emptyTitle: "Chưa có phiếu gia công", emptyBody: "Phiếu Labo mới sẽ liên kết trực tiếp đến lượt khám.", modalTitle: "Tạo phiếu gửi Labo", modalSubtitle: "Mã phiếu được sinh tự động và liên kết với hồ sơ điều trị."
  },
  insurance: {
    title: "Hồ sơ bảo hiểm", endpoint: "/insurance/claims", createEndpoint: "/insurance/claims", createLabel: "Tạo hồ sơ BH", rowKey: "InsuranceClaimId", roles: ["ADMIN", "RECEPTIONIST", "ACCOUNTANT", "CHIEF_ACCOUNTANT"],
    stats: [
      { label: "TỔNG HỒ SƠ", value: (rows) => rows.length, icon: ShieldCheck, tint: "blue" },
      { label: "CHỜ GỬI GIÁM ĐỊNH", value: (rows) => rows.filter((row) => row.Status === "DRAFT").length, icon: Clock3, tint: "amber" },
      { label: "ĐÃ ĐƯỢC DUYỆT", value: (rows) => rows.filter((row) => row.Status === "APPROVED").length, icon: Check, tint: "green" },
      { label: "ĐANG TRANH CHẤP", value: (rows) => rows.filter((row) => row.Status === "DISPUTED").length, icon: Activity, tint: "red" }
    ],
    columns: [{ key: "ClaimCode", label: "MÃ HỒ SƠ" }, { key: "VisitCode", label: "LƯỢT KHÁM" }, { key: "PatientName", label: "BỆNH NHÂN" }, { key: "PayerName", label: "ĐƠN VỊ BẢO HIỂM" }, { key: "RequestedAmount", label: "YÊU CẦU", render: (value) => money(String(value ?? 0)) }, { key: "Status", label: "TRẠNG THÁI" }],
    fields: [{ key: "visitId", label: "Mã lượt khám", required: true }, { key: "payerName", label: "Đơn vị bảo hiểm", required: true }, { key: "payerType", label: "Loại bảo hiểm", type: "select", required: true, options: [{ value: "COMMERCIAL", label: "Bảo hiểm thương mại" }, { value: "BHYT", label: "Bảo hiểm y tế" }] }],
    numericFields: [], emptyTitle: "Chưa có hồ sơ bảo hiểm", emptyBody: "Hồ sơ bảo lãnh gắn với giao dịch và lượt khám gốc.", modalTitle: "Tạo hồ sơ yêu cầu bảo hiểm", modalSubtitle: "Hồ sơ giữ tham chiếu giao dịch gốc phục vụ đối soát."
  },
  warranty: {
    title: "Thẻ bảo hành", endpoint: "/warranties", createEndpoint: "/warranties", createLabel: "Cấp bảo hành", rowKey: "WarrantyId", roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"],
    stats: [
      { label: "TỔNG THẺ", value: (rows) => rows.length, icon: BadgeCheck, tint: "blue" },
      { label: "ĐANG HIỆU LỰC", value: (rows) => rows.filter((row) => row.Status === "ACTIVE").length, icon: Check, tint: "green" },
      { label: "SẮP HẾT HẠN", value: "Theo thời hạn", icon: Clock3, tint: "amber" },
      { label: "ĐÃ HẾT HẠN", value: (rows) => rows.filter((row) => row.Status === "EXPIRED").length, icon: Activity, tint: "red" }
    ],
    columns: [{ key: "WarrantyCode", label: "MÃ BẢO HÀNH" }, { key: "PatientName", label: "BỆNH NHÂN" }, { key: "ServiceName", label: "DỊCH VỤ" }, { key: "StartedAt", label: "BẮT ĐẦU", render: (value) => value ? shortDate(String(value)) : "—" }, { key: "ExpiresAt", label: "HẠN BẢO HÀNH", render: (value) => value ? shortDate(String(value)) : "—" }, { key: "Status", label: "TRẠNG THÁI" }],
    fields: [{ key: "visitId", label: "Lượt khám hoàn tất", required: true }, { key: "serviceName", label: "Tên dịch vụ", required: true }, { key: "monthsValid", label: "Thời hạn (tháng)", type: "number", required: true }],
    numericFields: ["monthsValid"], emptyTitle: "Chưa có thẻ bảo hành", emptyBody: "Thẻ bảo hành được tra cứu và liên kết với lượt khám điều trị.", modalTitle: "Cấp thẻ bảo hành dịch vụ", modalSubtitle: "Không ghi nhận doanh thu khi tái khám bảo hành miễn phí."
  },
  finance: {
    title: "Bút toán sổ cái", endpoint: "/accounting/journals", createEndpoint: "/accounting/journals", createLabel: "Tạo bút toán", rowKey: "JournalEntryId", roles: ["ADMIN", "ACCOUNTANT"],
    stats: [
      { label: "BÚT TOÁN", value: (rows) => rows.length, icon: ClipboardList, tint: "blue" },
      { label: "CHỜ DUYỆT", value: (rows) => rows.filter((row) => row.Status === "DRAFT").length, icon: Clock3, tint: "amber" },
      { label: "ĐÃ DUYỆT", value: (rows) => rows.filter((row) => row.Status === "APPROVED").length, icon: Check, tint: "green" },
      { label: "ĐÃ HẠCH TOÁN", value: (rows) => rows.filter((row) => row.Status === "POSTED").length, icon: CircleDollarSign, tint: "violet" }
    ],
    columns: [{ key: "EntryCode", label: "SỐ CHỨNG TỪ" }, { key: "Description", label: "DIỄN GIẢI" }, { key: "CreatedByUsername", label: "NGƯỜI LẬP" }, { key: "CreatedAt", label: "NGÀY LẬP", render: (value) => value ? shortDate(String(value)) : "—" }, { key: "TotalDebit", label: "TỔNG NỢ", render: (value) => money(String(value ?? 0)) }, { key: "Status", label: "TRẠNG THÁI", render: (value) => <VisitStatus status={value} /> }],
    fields: [{ key: "description", label: "Diễn giải nghiệp vụ", required: true, wide: true }, { key: "linesJson", label: "Dòng định khoản (JSON)", type: "textarea", required: true, wide: true }],
    numericFields: [], emptyTitle: "Chưa có bút toán", emptyBody: "Bút toán phát sinh sẽ liên kết chứng từ nghiệp vụ và lưu dấu vết.", modalTitle: "Tạo bút toán kế toán", modalSubtitle: "Nhập tối thiểu hai dòng; tổng phát sinh Nợ phải bằng tổng phát sinh Có."
  },
  hr: {
    title: "Danh sách nhân sự", endpoint: "/hr/employees", createEndpoint: "/hr/employees", createLabel: "Thêm nhân sự", rowKey: "EmployeeId", roles: ["ADMIN", "ACCOUNTANT"],
    stats: [
      { label: "NHÂN SỰ", value: (rows) => rows.length, icon: Users, tint: "blue" },
      { label: "BÁC SĨ", value: (rows) => rows.filter((row) => row.Position === "DOCTOR").length, icon: Stethoscope, tint: "violet" },
      { label: "PHỤ TÁ", value: (rows) => rows.filter((row) => row.Position === "ASSISTANT").length, icon: HeartPulse, tint: "green" },
      { label: "ĐANG HOẠT ĐỘNG", value: (rows) => rows.filter((row) => row.IsActive === true).length, icon: BadgeCheck, tint: "blue" }
    ],
    columns: [{ key: "EmployeeCode", label: "MÃ NHÂN VIÊN" }, { key: "FullName", label: "HỌ VÀ TÊN" }, { key: "Position", label: "CHỨC DANH" }, { key: "ProfessionalLicense", label: "SỐ CCHN" }, { key: "StartedAt", label: "NGÀY VÀO LÀM", render: (value) => value ? shortDate(String(value)) : "—" }],
    fields: [{ key: "fullName", label: "Họ tên", required: true }, { key: "position", label: "Chức danh", type: "select", required: true, options: [{ value: "DOCTOR", label: "Bác sĩ" }, { value: "ASSISTANT", label: "Phụ tá / Điều dưỡng" }, { value: "RECEPTIONIST", label: "Tiếp nhận" }, { value: "ACCOUNTANT", label: "Kế toán" }, { value: "INVENTORY_MANAGER", label: "Quản lý kho" }] }, { key: "professionalLicense", label: "Số chứng chỉ hành nghề" }, { key: "phone", label: "Số điện thoại" }],
    numericFields: [], emptyTitle: "Chưa có hồ sơ nhân sự", emptyBody: "Thêm hồ sơ nhân viên cùng chức danh và thông tin hành nghề.", modalTitle: "Thêm hồ sơ nhân sự", modalSubtitle: "Lưu trữ thông tin nghề nghiệp theo quyền được giao."
  },
  assets: {
    title: "Tài sản cố định", endpoint: "/assets", createEndpoint: "/assets", createLabel: "Thêm tài sản", rowKey: "AssetId", roles: ["ADMIN", "ACCOUNTANT", "INVENTORY_MANAGER"],
    stats: [
      { label: "TÀI SẢN", value: (rows) => rows.length, icon: Layers3, tint: "blue" },
      { label: "ĐANG SỬ DỤNG", value: (rows) => rows.filter((row) => row.Status === "ACTIVE").length, icon: Check, tint: "green" },
      { label: "GIÁ NGUYÊN GIÁ", value: (rows) => money(rows.reduce((sum, row) => sum + Number(row.AcquisitionCost ?? 0), 0)), icon: CircleDollarSign, tint: "violet" },
      { label: "CẦN BẢO TRÌ", value: "Theo lịch thiết bị", icon: Clock3, tint: "amber" }
    ],
    columns: [{ key: "AssetCode", label: "MÃ TÀI SẢN" }, { key: "AssetName", label: "TÊN THIẾT BỊ" }, { key: "Category", label: "NHÓM" }, { key: "AcquisitionDate", label: "NGÀY GHI TĂNG", render: (value) => value ? shortDate(String(value)) : "—" }, { key: "AcquisitionCost", label: "NGUYÊN GIÁ", render: (value) => money(String(value ?? 0)) }, { key: "Status", label: "TRẠNG THÁI" }],
    fields: [{ key: "assetName", label: "Tên tài sản", required: true }, { key: "category", label: "Nhóm tài sản", type: "select", required: true, options: [{ value: "CHAIR", label: "Ghế nha" }, { value: "IMAGING", label: "Máy X-quang / CT" }, { value: "AUTOCLAVE", label: "Nồi hấp" }, { value: "OTHER", label: "Khác" }] }, { key: "serialNumber", label: "Số serial" }, { key: "acquisitionDate", label: "Ngày ghi tăng", type: "date", required: true }, { key: "acquisitionCost", label: "Nguyên giá", type: "number", required: true }, { key: "usefulLifeMonths", label: "Thời gian sử dụng (tháng)", type: "number", required: true }],
    numericFields: ["acquisitionCost", "usefulLifeMonths"], emptyTitle: "Chưa có thiết bị được ghi tăng", emptyBody: "Thêm ghế nha, máy chụp, nồi hấp và thiết bị khác.", modalTitle: "Ghi tăng tài sản cố định", modalSubtitle: "Thông tin thiết bị và lịch khấu hao theo nguyên giá."
  }
};
