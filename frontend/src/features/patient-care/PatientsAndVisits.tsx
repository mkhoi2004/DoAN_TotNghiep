import { ArrowRight, ChevronLeft, ChevronRight, Clock3, CreditCard, Plus, Search, Settings2, Stethoscope, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api, shortDate, type CurrentUser, type Patient, type Visit } from "../../api";
import { VisitStatus, MiniStat, Modal, EmptyRow, FieldError } from "../../shared/components";

export function PatientsAndVisits({ section, user, onNotice, onOpenEmr }: { section: "reception" | "patients"; user: CurrentUser; onNotice: (message: string, type?: "success" | "error") => void; onOpenEmr: (visitId: string) => void }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [query, setQuery] = useState("");
  const [doctors, setDoctors] = useState<{ UserId: string; Username: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", dateOfBirth: "", gender: "Nữ", phone: "", nationalId: "", address: "", allergyNotes: "", medicalHistory: "", doctorId: "", visitType: "NEW", chiefComplaint: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [patientRows, visitRows] = await Promise.all([
        api<Patient[]>(`/patients${query ? `?search=${encodeURIComponent(query)}` : ""}`),
        api<Visit[]>("/visits")
      ]);
      setPatients(patientRows);
      setVisits(visitRows);
    } catch (cause) {
      onNotice(cause instanceof Error ? cause.message : "Không thể tải danh sách.", "error");
    }
  }, [query, onNotice]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (section !== "reception") return;
    api<{ UserId: string; Username: string }[]>("/staff/doctors")
      .then(setDoctors)
      .catch((error: unknown) => onNotice(error instanceof Error ? error.message : "Không tải được danh sách bác sĩ.", "error"));
  }, [section, onNotice]);
  useEffect(() => {
    const listener = (event: Event) => {
      if ((event as CustomEvent).detail === section) setIsOpen(true);
    };
    window.addEventListener("erp:open-create", listener);
    return () => window.removeEventListener("erp:open-create", listener);
  }, [section]);

  const filteredVisits = useMemo(() => visits.filter((visit) => {
    if (!query) return true;
    const normalized = query.toLocaleLowerCase("vi");
    return `${visit.PatientName} ${visit.PatientCode} ${visit.VisitCode}`.toLocaleLowerCase("vi").includes(normalized);
  }), [query, visits]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      let patientId = patients.find((patient) => patient.Phone === form.phone || patient.PatientCode === form.nationalId)?.PatientId;
      if (!patientId) {
        const patient = await api<{ PatientId: string }>("/patients", {
          method: "POST",
          body: JSON.stringify({
            fullName: form.fullName, dateOfBirth: form.dateOfBirth, gender: form.gender, phone: form.phone,
            nationalId: form.nationalId, address: form.address,
            allergyNotes: form.allergyNotes || undefined, medicalHistory: form.medicalHistory || undefined
          })
        });
        patientId = patient.PatientId;
      }
      if (!form.doctorId) {
        throw new Error("Vui lòng chọn bác sĩ phụ trách.");
      }
      const visit = await api<{ VisitId: string }>("/visits", {
        method: "POST",
        body: JSON.stringify({
          patientId, doctorId: form.doctorId, visitType: form.visitType,
          chiefComplaint: form.chiefComplaint || undefined
        })
      });
      setIsOpen(false);
      setForm({ fullName: "", dateOfBirth: "", gender: "Nữ", phone: "", nationalId: "", address: "", allergyNotes: "", medicalHistory: "", doctorId: "", visitType: "NEW", chiefComplaint: "" });
      await load();
      onNotice("Đã tạo lượt tiếp nhận thành công.");
      if (section === "reception") onOpenEmr(visit.VisitId);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Không thể tạo lượt tiếp nhận.";
      setError(message);
      if (message.includes("already exists") || message.includes("đã tồn tại")) {
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancelVisit(visitId: string) {
    try {
      await api(`/visits/${visitId}/status`, { method: "PATCH", body: JSON.stringify({ status: -1 }) });
      onNotice("Đã hủy lượt tiếp nhận.");
      await load();
    } catch (cause) {
      onNotice(cause instanceof Error ? cause.message : "Không thể hủy lượt.", "error");
    }
  }

  const canCreate = user.role === "ADMIN" || user.role === "RECEPTIONIST";
  return (
    <div className="module-content">
      <div className="stats-strip">
        <MiniStat label={section === "patients" ? "TỔNG HỒ SƠ" : "TỔNG LƯỢT HÔM NAY"} value={section === "patients" ? patients.length : visits.length} icon={Users} tint="blue" />
        <MiniStat label="ĐANG CHỜ" value={visits.filter((visit) => visit.Status === 0).length} icon={Clock3} tint="amber" />
        <MiniStat label="ĐANG KHÁM" value={visits.filter((visit) => visit.Status === 1 || visit.Status === 2).length} icon={Stethoscope} tint="violet" />
        <MiniStat label="CHỜ THANH TOÁN" value={visits.filter((visit) => visit.Status === 3).length} icon={CreditCard} tint="green" />
      </div>
      <div className="panel table-panel">
        <div className="table-toolbar"><div className="filter-tabs"><button className="filter-active" onClick={() => setQuery("")}>Tất cả <span>{section === "patients" ? patients.length : visits.length}</span></button><button onClick={() => setQuery("")}>Hôm nay</button>{section === "reception" && <button onClick={() => setQuery("")}>Đang chờ</button>}</div><div className="table-tools"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, mã bệnh nhân..." /><kbd>⌘ K</kbd></label><button className="icon-button filter-button" onClick={() => onNotice("Danh sách đang được lọc theo dữ liệu hiện có.")} aria-label="Lọc"><Settings2 size={17} /></button>{canCreate && <button className="primary-button compact-action" onClick={() => setIsOpen(true)}><Plus size={16} />Tiếp nhận mới</button>}</div></div>
        <div className="table-scroll"><table className="data-table"><thead><tr>{section === "patients" ? <><th>BỆNH NHÂN</th><th>NGÀY SINH</th><th>LIÊN HỆ</th><th>HỒ SƠ</th><th></th></> : <><th>BỆNH NHÂN</th><th>SỐ TIẾP NHẬN</th><th>LOẠI KHÁM</th><th>BÁC SĨ</th><th>GIỜ TIẾP NHẬN</th><th>TRẠNG THÁI</th><th></th></>}</tr></thead><tbody>
          {section === "patients" ? patients.map((patient) => <tr key={patient.PatientId}><td><div className="patient-cell"><span className="patient-avatar">{patient.FullName.slice(0, 1)}</span><span><strong>{patient.FullName}</strong><small>{patient.PatientCode} · {patient.Gender}</small></span></div></td><td>{shortDate(patient.DateOfBirth)}</td><td><strong>{patient.Phone}</strong><small className="cell-subtext">{patient.Address}</small></td><td><span className={`allergy-pill ${patient.AllergyNotes ? "allergy-warning" : ""}`}>{patient.AllergyNotes ? "Dị ứng cần lưu ý" : "Đã xác minh"}</span></td><td><button className="row-action" onClick={() => { window.sessionStorage.setItem("activePatientId", patient.PatientId); onNotice("Đã mở hồ sơ bệnh nhân."); }}><ArrowRight size={15} /></button></td></tr>)
            : filteredVisits.filter((visit) => visit.Status !== -1).map((visit) => <tr key={visit.VisitId}><td><div className="patient-cell"><span className="patient-avatar">{visit.PatientName.slice(0, 1)}</span><span><strong>{visit.PatientName}</strong><small>{visit.PatientCode}</small></span></div></td><td><span className="code-text">{visit.VisitCode}</span></td><td>{visit.VisitType === "NEW" ? "Khám mới" : visit.VisitType === "FOLLOW_UP_FREE" ? "Tái khám theo phác đồ" : "Tái khám có phí"}</td><td>{visit.DoctorUsername}</td><td>{new Date(visit.CreatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</td><td><VisitStatus status={visit.Status} /></td><td><div className="row-actions"><button className="row-action" title="Mở bệnh án" onClick={() => onOpenEmr(visit.VisitId)}><ArrowRight size={15} /></button>{canCreate && [0,1].includes(visit.Status) && <button className="row-action row-danger" title="Hủy lượt khám" onClick={() => void cancelVisit(visit.VisitId)}><X size={15} /></button>}</div></td></tr>)}
          {section === "patients" && patients.length === 0 && <EmptyRow colSpan={5} title="Chưa có hồ sơ bệnh nhân" body="Tạo hồ sơ mới tại quầy tiếp nhận." />}
          {section === "reception" && filteredVisits.length === 0 && <EmptyRow colSpan={7} title="Chưa có lượt khám" body="Tạo lượt khám mới để bắt đầu tiếp nhận." />}
        </tbody></table></div>
        <div className="table-footer"><span>Hiển thị {section === "patients" ? patients.length : filteredVisits.length} kết quả</span><div><button className="icon-button" aria-label="Trang trước"><ChevronLeft size={17} /></button><button className="page-number">1</button><button className="icon-button" aria-label="Trang sau"><ChevronRight size={17} /></button></div></div>
      </div>
      {isOpen && <Modal title="Tiếp nhận bệnh nhân mới" subtitle="Tạo hồ sơ và khởi tạo lượt khám trong một quy trình." onClose={() => { setIsOpen(false); setError(""); }}>
        <form className="form-grid" onSubmit={create}>
          <div className="form-section-label">THÔNG TIN BỆNH NHÂN</div>
          <label className="span-2">Họ và tên<input required minLength={2} maxLength={200} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Nguyễn Văn An" /></label>
          <label>Ngày sinh<input required type="date" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} /></label>
          <label>Giới tính<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option>Nam</option><option>Nữ</option><option>Khác</option></select></label>
          <label>Số điện thoại<input required inputMode="numeric" pattern="0[0-9]{9}" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="0901234567" /></label>
          <label>CCCD / Định danh<input required minLength={8} maxLength={20} value={form.nationalId} onChange={(event) => setForm({ ...form, nationalId: event.target.value })} placeholder="Nhập mã định danh" /></label>
          <label className="span-2">Địa chỉ<input required minLength={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Số nhà, đường, phường/xã, tỉnh/thành" /></label>
          <label className="span-2 warning-field">Dị ứng thuốc / lưu ý y tế<input value={form.allergyNotes} onChange={(event) => setForm({ ...form, allergyNotes: event.target.value })} placeholder="Ghi chú để bác sĩ lưu ý khi điều trị" /></label>
          <div className="form-section-label">THÔNG TIN LƯỢT KHÁM</div>
          <label>Phân loại tiếp nhận<select value={form.visitType} onChange={(event) => setForm({ ...form, visitType: event.target.value })}><option value="NEW">Khám mới</option><option value="FOLLOW_UP_PAID">Tái khám có thu phí</option><option value="FOLLOW_UP_FREE">Tái khám theo phác đồ (0đ)</option></select></label>
          <label>Bác sĩ phụ trách<select required value={form.doctorId} onChange={(event) => setForm({ ...form, doctorId: event.target.value })}><option value="">Chọn bác sĩ</option>{doctors.map((doctor) => <option key={doctor.UserId} value={doctor.UserId}>{doctor.Username}</option>)}</select></label>
          <label className="span-2">Lý do đến khám<input value={form.chiefComplaint} onChange={(event) => setForm({ ...form, chiefComplaint: event.target.value })} placeholder="Mô tả ngắn gọn nhu cầu của bệnh nhân" /></label>
          <div className="span-2"><FieldError text={error} /></div>
          <div className="modal-actions span-2"><button type="button" className="secondary-button" onClick={() => setIsOpen(false)}>Hủy</button><button className="primary-button" disabled={busy}>{busy ? "Đang lưu..." : "Lưu & tạo lượt khám"}<ArrowRight size={16} /></button></div>
        </form>
      </Modal>}
    </div>
  );
}
