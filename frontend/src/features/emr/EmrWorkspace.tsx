import { ArrowRight, Check, FileHeart, Plus, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, forwardRef, useImperativeHandle, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { api, money, type CurrentUser, type Visit } from "../../api";
import { VisitStatus, Modal } from "../../shared/components";

export function EmrWorkspace({ user, onNotice }: { user: CurrentUser; onNotice: (message: string, type?: "success" | "error") => void }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitId, setVisitId] = useState(window.sessionStorage.getItem("activeVisitId") ?? "");
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [services, setServices] = useState<{ ServiceId: string; ServiceCode: string; ServiceName: string; IsInvasive: boolean }[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [vitals, setVitals] = useState({ bloodPressure: "", pulse: "", temperature: "", spo2: "", height: "", weight: "" });
  const [diagnosis, setDiagnosis] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [tab, setTab] = useState("Tổng quan");
  const [busy, setBusy] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [dentition, setDentition] = useState<number[]>([]);
  const activeVisit = visits.find((visit) => visit.VisitId === visitId);

  const load = useCallback(async () => {
    try {
      const rows = await api<Visit[]>("/visits");
      setVisits(rows);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không tải được lượt khám.", "error");
    }
  }, [onNotice]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    api<typeof services>("/clinical/services")
      .then(setServices)
      .catch((error: unknown) => onNotice(error instanceof Error ? error.message : "Không tải được danh mục dịch vụ.", "error"));
  }, [onNotice]);
  useEffect(() => {
    if (!visitId) {
      setRecord(null);
      setVitals({ bloodPressure: "", pulse: "", temperature: "", spo2: "", height: "", weight: "" });
      setDiagnosis("");
      setClinicalNotes("");
      setDentition([]);
      return;
    }
    window.sessionStorage.setItem("activeVisitId", visitId);
    let active = true;
    setRecord(null);
    api<Record<string, unknown> | null>(`/clinical/visits/${visitId}/emr`)
      .then((result) => {
        if (!active) return;
        setRecord(result);
        if (result?.vitals && typeof result.vitals === "object") setVitals(result.vitals as typeof vitals);
        else setVitals({ bloodPressure: "", pulse: "", temperature: "", spo2: "", height: "", weight: "" });
        setDiagnosis(typeof result?.diagnosis === "string" ? result.diagnosis : "");
        setClinicalNotes(typeof result?.clinicalNotes === "string" ? result.clinicalNotes : "");
        setDentition(Array.isArray(result?.odontogram) ? result.odontogram as number[] : []);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRecord(null);
        onNotice(error instanceof Error ? error.message : "Không tải được bệnh án.", "error");
      });
    return () => { active = false; };
  }, [visitId, onNotice]);

  async function saveEmr(event: FormEvent) {
    event.preventDefault();
    if (!visitId) return;
    setBusy(true);
    try {
      await api(`/clinical/visits/${visitId}/emr`, {
        method: "PUT",
        body: JSON.stringify({
          vitals,
          diagnosis,
          clinicalNotes,
          odontogram: dentition
        })
      });
      onNotice("Đã lưu bệnh án điện tử an toàn.");
      await load();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không thể lưu bệnh án.", "error");
    } finally { setBusy(false); }
  }

  async function addService(event: FormEvent) {
    event.preventDefault();
    if (!visitId) return;
    setBusy(true);
    try {
      await api(`/clinical/visits/${visitId}/services`, {
        method: "POST",
        body: JSON.stringify({ serviceId, quantity: 1 })
      });
      onNotice("Đã thêm chỉ định vào kế hoạch điều trị.");
      await load();
      setServiceId("");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không thể thêm dịch vụ.", "error");
    } finally { setBusy(false); }
  }

  async function finalize() {
    if (!visitId || !activeVisit) return;
    setBusy(true);
    try {
      const result = await api<{ status: number; requiresConsent: boolean }>(`/clinical/visits/${visitId}/settle`, { method: "POST", body: JSON.stringify({}) });
      await load();
      onNotice(result.status === 4 ? "Đã chốt tái khám miễn phí." : "Đã chốt chuyên môn, chuyển hồ sơ sang chờ thanh toán.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể chốt dịch vụ.";
      onNotice(message, "error");
      if (message.includes("Consent") || message.includes("đồng thuận")) setConsentOpen(true);
    } finally { setBusy(false); }
  }

  async function cancelApproval() {
    if (!visitId || !activeVisit || ![2, 3].includes(activeVisit.Status)) return;
    setBusy(true);
    try {
      await api(`/visits/${visitId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: activeVisit.Status - 1 })
      });
      await load();
      onNotice(activeVisit.Status === 2
        ? "Đã hủy duyệt; bệnh án được mở lại để chỉnh sửa."
        : "Đã hủy bước chờ thanh toán; lượt khám trở về trạng thái đã chốt chuyên môn.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không thể hủy bước duyệt.", "error");
    } finally { setBusy(false); }
  }

  const isReadOnly = activeVisit ? [2, 3, 4, -1].includes(activeVisit.Status) : false;
  const canEdit = ["DOCTOR", "ADMIN"].includes(user.role);
  return (
    <div className="module-content emr-layout">
      <div className="emr-patient-select panel">
        <label><span className="form-label-upper">LƯỢT KHÁM ĐANG MỞ</span><select value={visitId} onChange={(event) => setVisitId(event.target.value)}><option value="">Chọn bệnh nhân / lượt khám</option>{visits.filter((visit) => [0, 1, 2, 3].includes(visit.Status)).map((visit) => <option key={visit.VisitId} value={visit.VisitId}>{visit.PatientName} · {visit.VisitCode}</option>)}</select></label>
        {activeVisit && <div className="emr-patient-summary"><span className="patient-avatar patient-avatar-lg">{activeVisit.PatientName.slice(0, 1)}</span><span><strong>{activeVisit.PatientName}</strong><small>{activeVisit.PatientCode} · {activeVisit.VisitCode}</small></span><VisitStatus status={activeVisit.Status} />{canEdit && [2, 3].includes(activeVisit.Status) && <button className="secondary-button" disabled={busy} onClick={() => void cancelApproval()}>{activeVisit.Status === 2 ? "Hủy chốt · Mở sửa" : "Hủy chờ thanh toán"}</button>}<button className="secondary-button" onClick={() => setConsentOpen(true)}><ShieldCheck size={15} /> Đồng thuận</button></div>}
      </div>
      {!activeVisit ? <div className="empty-state panel"><span><FileHeart size={24} /></span><h3>Chọn lượt khám để mở bệnh án</h3><p>Thông tin bệnh nhân và các chỉ định sẽ hiển thị tại đây.</p></div> : <>
        <div className="emr-tabs">{["Tổng quan", "Sinh hiệu", "Sơ đồ răng", "Khám lâm sàng", "Điều trị"].map((label) => <button key={label} onClick={() => setTab(label)} className={tab === label ? "emr-tab-active" : ""}>{label}</button>)}</div>
        <form className="emr-form" onSubmit={saveEmr}>
          <div className="panel emr-panel"><div className="panel-heading"><div><h3>{tab === "Tổng quan" ? "Tóm tắt thăm khám" : tab}</h3><p>{isReadOnly ? "Bệnh án đã chốt — chế độ chỉ đọc." : "Ghi nhận diễn biến chuyên môn của lượt khám."}</p></div>{record && <span className="saved-badge"><Check size={13} /> Đã lưu</span>}</div>
            {(tab === "Sinh hiệu" || tab === "Tổng quan") && <div className="vitals-grid">{[
              ["bloodPressure", "Huyết áp", "mmHg", "120/80"], ["pulse", "Mạch", "lần/phút", "72"], ["temperature", "Nhiệt độ", "°C", "36.5"], ["spo2", "SpO₂", "%", "98"], ["height", "Chiều cao", "cm", "165"], ["weight", "Cân nặng", "kg", "60"]
            ].map(([key, label, unit, hint]) => <label className="vital-input" key={key}><span>{label}<small>{unit}</small></span><input disabled={isReadOnly || !canEdit} value={vitals[key as keyof typeof vitals]} onChange={(event) => setVitals({ ...vitals, [key]: event.target.value })} placeholder={hint} /></label>)}</div>}
            {(tab === "Sơ đồ răng" || tab === "Tổng quan") && <div className="odontogram-area"><div className="odontogram-title"><div><strong>Sơ đồ răng FDI</strong><small>Chọn vùng răng cần ghi nhận tình trạng</small></div><span className="odontogram-legend"><i /> Đang điều trị</span></div><div className="teeth-row">{[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map((tooth) => <button type="button" disabled={isReadOnly || !canEdit} key={tooth} onClick={() => setDentition((current) => current.includes(tooth) ? current.filter((value) => value !== tooth) : [...current, tooth])} className={`tooth ${dentition.includes(tooth) ? "tooth-selected" : ""}`}>{tooth}</button>)}</div><div className="teeth-row lower-teeth">{[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38].map((tooth) => <button type="button" disabled={isReadOnly || !canEdit} key={tooth} onClick={() => setDentition((current) => current.includes(tooth) ? current.filter((value) => value !== tooth) : [...current, tooth])} className={`tooth ${dentition.includes(tooth) ? "tooth-selected" : ""}`}>{tooth}</button>)}</div></div>}
            {(tab === "Khám lâm sàng" || tab === "Tổng quan") && <div className="clinical-inputs"><label>Chẩn đoán<input disabled={isReadOnly || !canEdit} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="Ví dụ: K02.1 — Sâu ngà răng" /></label><label>Diễn biến lâm sàng<textarea disabled={isReadOnly || !canEdit} value={clinicalNotes} onChange={(event) => setClinicalNotes(event.target.value)} placeholder="Ghi nhận kết quả khám, tình trạng và hướng xử trí..." rows={4} /></label></div>}
          </div>
          {tab === "Điều trị" || tab === "Tổng quan" ? <div className="panel treatment-panel"><div className="panel-heading"><div><h3>Chỉ định điều trị</h3><p>Giá lấy từ danh mục dịch vụ đang hiệu lực</p></div><span className="service-total">{money(activeVisit.TotalAmount)}</span></div>
            {services.length === 0 && <div className="notice-box"><ShieldCheck size={17} />Chưa có danh mục dịch vụ; quản trị viên cần thiết lập trước khi chỉ định.</div>}
            {canEdit && !isReadOnly && services.length > 0 && <form className="inline-service-form" onSubmit={addService}><select required value={serviceId} onChange={(event) => setServiceId(event.target.value)}><option value="">Chọn dịch vụ chỉ định</option>{services.map((service) => <option key={service.ServiceId} value={service.ServiceId}>{service.ServiceCode} · {service.ServiceName}{service.IsInvasive ? " · Cần đồng thuận" : ""}</option>)}</select><button className="secondary-button" disabled={busy}><Plus size={15} />Thêm chỉ định</button></form>}
            <button className="primary-button finalize-button" disabled={!canEdit || isReadOnly || busy} onClick={(event) => { event.preventDefault(); void finalize(); }}>Chốt chuyên môn <ArrowRight size={16} /></button>
          </div> : null}
          {canEdit && !isReadOnly && <div className="emr-savebar"><span><ShieldCheck size={16} /> Bệnh án chỉ chia sẻ với nhân sự được phân quyền</span><button className="primary-button" disabled={busy} type="submit">{busy ? "Đang lưu..." : "Lưu bệnh án"}<Check size={16} /></button></div>}
        </form>
      </>}
      {consentOpen && visitId && <ConsentModal visitId={visitId} services={services} onClose={() => setConsentOpen(false)} onNotice={onNotice} />}
    </div>
  );
}

function ConsentModal({ visitId, services, onClose, onNotice }: { visitId: string; services: { ServiceId: string; ServiceCode: string; ServiceName: string; IsInvasive: boolean }[]; onClose: () => void; onNotice: (message: string, type?: "success" | "error") => void }) {
  const [serviceId, setServiceId] = useState(services.find((service) => service.IsInvasive)?.ServiceId ?? "");
  const [witness, setWitness] = useState("");
  const [busy, setBusy] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);
  async function sign(event: FormEvent) {
    event.preventDefault();
    const signature = padRef.current?.exportSignature();
    if (!signature) { onNotice("Bệnh nhân cần ký trên vùng chữ ký trước khi lưu.", "error"); return; }
    setBusy(true);
    try {
      await api("/clinical/consents", { method: "POST", body: JSON.stringify({ visitId, serviceId, signature, witnessName: witness }) });
      onNotice("Đã lưu giấy đồng thuận điện tử.");
      onClose();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không thể lưu giấy đồng thuận.", "error");
    } finally { setBusy(false); }
  }
  const invasive = services.filter((service) => service.IsInvasive);
  return <Modal title="Đồng thuận điều trị điện tử" subtitle="Vui lòng giải thích thủ thuật và rủi ro cho bệnh nhân trước khi ký." onClose={onClose}><form onSubmit={sign} className="consent-form">
    <div className="consent-legal"><ShieldCheck size={19} /><span><strong>Xác nhận đã được tư vấn</strong><small>Bệnh nhân xác nhận đã hiểu mục đích, lợi ích và rủi ro có thể có của thủ thuật.</small></span></div>
    <label>Dịch vụ xâm lấn<select required value={serviceId} onChange={(event) => setServiceId(event.target.value)}><option value="">Chọn thủ thuật</option>{invasive.map((service) => <option key={service.ServiceId} value={service.ServiceId}>{service.ServiceName}</option>)}</select></label>
    <label>Người bệnh / người đại diện<input required minLength={2} value={witness} onChange={(event) => setWitness(event.target.value)} placeholder="Họ tên người xác nhận" /></label>
    <label>Ký tên điện tử<SignaturePad ref={padRef} /></label>
    <div className="consent-footnote"><ShieldCheck size={15} /> Chữ ký được mã hóa và lưu dấu thời gian cùng hồ sơ khám.</div>
    <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Hủy</button><button className="primary-button" disabled={busy}>{busy ? "Đang lưu..." : "Xác nhận & lưu"}<Check size={16} /></button></div>
  </form></Modal>;
}

type SignaturePadHandle = { exportSignature: () => string | null };

const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const position = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / bounds.width;
    const scaleY = canvas.height / bounds.height;
    return { x: (event.clientX - bounds.left) * scaleX, y: (event.clientY - bounds.top) * scaleY };
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    const context = canvas.getContext("2d");
    if (context) {
      context.scale(ratio, ratio);
      context.strokeStyle = "#174f66";
      context.lineWidth = 2.5;
      context.lineCap = "round";
      context.lineJoin = "round";
    }
  }, []);
  useImperativeHandle(ref, () => ({
    exportSignature() {
      const canvas = canvasRef.current;
      return hasInk.current && canvas ? canvas.toDataURL("image/png") : null;
    }
  }));
  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      const ratio = window.devicePixelRatio || 1;
      context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
      hasInk.current = false;
    }
  }
  return <div className="signature-pad"><canvas ref={canvasRef} onPointerDown={(event) => { drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); const point = position(event); const context = event.currentTarget.getContext("2d"); context?.beginPath(); context?.moveTo(point.x / (window.devicePixelRatio || 1), point.y / (window.devicePixelRatio || 1)); }} onPointerMove={(event) => { if (!drawing.current) return; const point = position(event); const context = event.currentTarget.getContext("2d"); context?.lineTo(point.x / (window.devicePixelRatio || 1), point.y / (window.devicePixelRatio || 1)); context?.stroke(); hasInk.current = true; }} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} /><span>Ký tên vào vùng này</span><button type="button" onClick={clear}>Xóa chữ ký</button></div>;
});
