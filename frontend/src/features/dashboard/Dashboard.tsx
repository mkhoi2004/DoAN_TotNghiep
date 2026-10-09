import { ArrowRight, ArrowUpRight, CalendarDays, CircleDollarSign, Clock3, CreditCard, FileHeart, HeartPulse, Package, Settings2, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { api, money, shortDate, type CurrentUser, type InventoryLot, type Patient, type Section, type Visit } from "../../api";
import { VisitStatus, QuickAction, WorkflowRow, EmptyRow, LoadingRow } from "../../shared/components";
import { roleNames } from "../../shared/constants";

export function Dashboard({ user, onNavigate, onNotice }: { user: CurrentUser; onNavigate: (section: Section) => void; onNotice: (message: string, type?: "success" | "error") => void }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([
      api<Visit[]>("/visits"),
      ["ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT"].includes(user.role) ? api<Patient[]>("/patients") : Promise.resolve([]),
      api<InventoryLot[]>("/inventory")
    ]).then(([visitRows, patientRows, stockRows]) => {
      if (!active) return;
      setVisits(visitRows);
      setPatients(patientRows);
      setLots(stockRows);
      setLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      setLoading(false);
      onNotice(error instanceof Error ? error.message : "Không tải được dữ liệu tổng quan.", "error");
    });
    return () => { active = false; };
  }, [user.role, onNotice]);

  const todayVisits = visits.filter((visit) => new Date(visit.CreatedAt).toDateString() === new Date().toDateString());
  const waiting = visits.filter((visit) => visit.Status === 0 || visit.Status === 3);
  const stockValue = lots.reduce((total, lot) => total + lot.QuantityAvailable * lot.UnitCost, 0);
  const metrics = [
    { label: "Bệnh nhân hôm nay", value: loading ? "—" : String(todayVisits.length), delta: "+12%", up: true, icon: Users, tone: "blue", note: "so với hôm qua" },
    { label: "Đang chờ tiếp nhận", value: loading ? "—" : String(visits.filter((visit) => visit.Status === 0).length), delta: "Hàng chờ", up: null, icon: Clock3, tone: "amber", note: "cần được hỗ trợ" },
    { label: "Chờ thanh toán", value: loading ? "—" : String(visits.filter((visit) => visit.Status === 3).length), delta: "Thu ngân", up: null, icon: CreditCard, tone: "green", note: "lượt khám hoàn tất" },
    { label: "Giá trị tồn kho", value: loading ? "—" : money(stockValue), delta: "FIFO", up: null, icon: Package, tone: "violet", note: "giá trị khả dụng" }
  ];

  return (
    <div className="dashboard-content">
      <div className="welcome-banner">
        <div className="welcome-copy"><span className="welcome-pill"><Sparkles size={13} /> MỘT NGÀY THẬT TỐT</span><h2>Mỗi nụ cười đều bắt đầu<br />từ một trải nghiệm tốt.</h2><p>Phòng khám của bạn đang sẵn sàng cho ngày làm việc mới.</p><button onClick={() => onNavigate("reception")}>Mở danh sách tiếp nhận <ArrowRight size={15} /></button></div>
        <div className="welcome-art" aria-hidden="true"><div className="art-sun" /><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-tooth"><HeartPulse size={62} strokeWidth={1.2} /></div><div className="art-dot dot-one" /><div className="art-dot dot-two" /><div className="art-dot dot-three" /></div>
        <div className="welcome-side"><span>HÔM NAY</span><strong>09<span>:</span>00</strong><small>{todayVisits.length} lượt tiếp nhận đã lên hệ thống</small><div className="progress-track"><i style={{ width: `${Math.min(100, todayVisits.length * 12)}%` }} /></div><small>{loading ? "Đang cập nhật..." : `${todayVisits.length} bệnh nhân trong ngày`}</small></div>
      </div>

      <div className="metrics-grid">
        {metrics.map(({ label, value, delta, up, icon: Icon, tone, note }) => <article className="metric-card" key={label}><div className={`metric-icon tone-${tone}`}><Icon size={19} /></div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className={`metric-foot ${up ? "metric-positive" : ""}`}>{up && <ArrowUpRight size={14} />}{delta}<span>{note}</span></span></article>)}
      </div>

      <div className="dashboard-grid">
        <section className="panel visits-panel">
          <div className="panel-heading"><div><h3>Lượt khám gần đây</h3><p>Theo dõi hành trình chăm sóc hôm nay</p></div><button className="text-button" onClick={() => onNavigate("reception")}>Xem tất cả <ArrowRight size={15} /></button></div>
          <div className="table-scroll"><table className="data-table"><thead><tr><th>BỆNH NHÂN</th><th>SỐ TIẾP NHẬN</th><th>BÁC SĨ</th><th>TRẠNG THÁI</th><th></th></tr></thead><tbody>
            {visits.slice(0, 5).map((visit) => <tr key={visit.VisitId}><td><div className="patient-cell"><span className="patient-avatar">{visit.PatientName.slice(0, 1)}</span><span><strong>{visit.PatientName}</strong><small>{visit.PatientCode}</small></span></div></td><td><span className="code-text">{visit.VisitCode}</span></td><td>{visit.DoctorUsername}</td><td><VisitStatus status={visit.Status} /></td><td><button className="row-action" title="Mở bệnh án" onClick={() => { window.sessionStorage.setItem("activeVisitId", visit.VisitId); onNavigate("emr"); }}><ArrowRight size={15} /></button></td></tr>)}
            {!loading && visits.length === 0 && <EmptyRow colSpan={5} title="Chưa có lượt tiếp nhận" body="Khi có bệnh nhân mới, danh sách sẽ xuất hiện tại đây." />}
            {loading && <LoadingRow colSpan={5} />}
          </tbody></table></div>
        </section>
        <section className="panel quick-actions-panel">
          <div className="panel-heading"><div><h3>Truy cập nhanh</h3><p>Những tác vụ bạn thường dùng</p></div><Settings2 size={18} className="subtle-icon" /></div>
          <div className="quick-actions-list">
            <QuickAction icon={CalendarDays} tint="blue" title="Tiếp nhận bệnh nhân" text="Tạo lượt khám mới" onClick={() => onNavigate("reception")} />
            {user.role !== "RECEPTIONIST" && <QuickAction icon={FileHeart} tint="pink" title="Mở bệnh án điện tử" text="Ghi nhận thăm khám" onClick={() => onNavigate("emr")} />}
            <QuickAction icon={Package} tint="orange" title="Quản lý tồn kho" text="Theo dõi lô & hạn dùng" onClick={() => onNavigate("inventory")} />
            {["ADMIN", "ACCOUNTANT", "CHIEF_ACCOUNTANT"].includes(user.role) && <QuickAction icon={CircleDollarSign} tint="green" title="Sổ sách kế toán" text="Bút toán & đối soát" onClick={() => onNavigate("finance")} />}
          </div>
          <div className="staff-today"><div className="staff-copy"><span>ĐỘI NGŨ TRỰC HÔM NAY</span><strong>Phòng khám sẵn sàng</strong><small>Nhân viên đăng nhập: {roleNames[user.role] ?? user.role}</small></div><span className="staff-online"><i /> Đang hoạt động</span></div>
        </section>
      </div>
      <div className="bottom-grid">
        <section className="panel queue-panel"><div className="panel-heading"><div><h3>Danh sách cần xử lý</h3><p>Các bước tiếp theo trong quy trình</p></div><span className="counter-pill">{waiting.length}</span></div><div className="workflow-list">
          <WorkflowRow icon={Clock3} tint="amber" title="Bệnh nhân đang chờ" subtitle={`${visits.filter((visit) => visit.Status === 0).length} lượt tiếp nhận`} action="Tiếp nhận" onClick={() => onNavigate("reception")} />
          <WorkflowRow icon={CreditCard} tint="blue" title="Chờ thanh toán" subtitle={`${visits.filter((visit) => visit.Status === 3).length} lượt khám`} action="Thu ngân" onClick={() => onNavigate("cashier")} />
          <WorkflowRow icon={Package} tint="red" title="Vật tư cần kiểm tra" subtitle={`${lots.filter((lot) => lot.QuantityAvailable <= 0 || new Date(lot.ExpiresAt) < new Date(Date.now() + 30 * 86400000)).length} lô hết hoặc gần hạn`} action="Xem kho" onClick={() => onNavigate("inventory")} />
        </div></section>
        <section className="panel patients-panel"><div className="panel-heading"><div><h3>Bệnh nhân mới</h3><p>Hồ sơ vừa được khởi tạo</p></div><button className="text-button" onClick={() => onNavigate("patients")}>Danh sách <ArrowRight size={15} /></button></div><div className="new-patients-list">
          {patients.slice(0, 4).map((patient) => <div className="new-patient-row" key={patient.PatientId}><span className="patient-avatar">{patient.FullName.slice(0, 1)}</span><span><strong>{patient.FullName}</strong><small>{patient.PatientCode} · {patient.Gender}</small></span><time>{shortDate(patient.CreatedAt)}</time></div>)}
          {patients.length === 0 && <p className="empty-note">Danh sách bệnh nhân sẽ hiển thị tại đây.</p>}
        </div></section>
      </div>
    </div>
  );
}
