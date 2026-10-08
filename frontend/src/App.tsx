import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BriefcaseMedical,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  CreditCard,
  FileHeart,
  FlaskConical,
  HeartPulse,
  Home,
  Layers3,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  WalletCards,
  X
} from "lucide-react";
import {
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from "react";
import {
  api,
  money,
  setAccessToken,
  shortDate,
  type CurrentUser,
  type InventoryLot,
  type Patient,
  type Product,
  type Section,
  type Visit
} from "./api";

type NavItem = {
  id: Section;
  label: string;
  icon: typeof Home;
  roles: string[];
};

const navItems: NavItem[] = [
  { id: "dashboard", label: "Tổng quan", icon: Home, roles: [] },
  { id: "reception", label: "Tiếp nhận", icon: CalendarDays, roles: ["ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT"] },
  { id: "patients", label: "Hồ sơ bệnh nhân", icon: Users, roles: ["ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT"] },
  { id: "emr", label: "Bệnh án điện tử", icon: FileHeart, roles: ["ADMIN", "DOCTOR", "ASSISTANT"] },
  { id: "cashier", label: "Thu ngân & ca quỹ", icon: WalletCards, roles: ["ADMIN", "RECEPTIONIST", "ACCOUNTANT", "CHIEF_ACCOUNTANT"] },
  { id: "inventory", label: "Kho vật tư", icon: Package, roles: ["ADMIN", "RECEPTIONIST", "DOCTOR", "ASSISTANT", "ACCOUNTANT", "CHIEF_ACCOUNTANT", "INVENTORY_MANAGER"] },
  { id: "sterilization", label: "Kiểm soát vô khuẩn", icon: Sparkles, roles: ["ADMIN", "ASSISTANT", "INVENTORY_MANAGER"] },
  { id: "lab", label: "Phiếu Labo", icon: FlaskConical, roles: ["ADMIN", "DOCTOR", "ASSISTANT", "ACCOUNTANT", "CHIEF_ACCOUNTANT"] },
  { id: "insurance", label: "Bảo hiểm", icon: ShieldCheck, roles: ["ADMIN", "RECEPTIONIST", "ACCOUNTANT", "CHIEF_ACCOUNTANT"] },
  { id: "warranty", label: "Bảo hành", icon: BadgeCheck, roles: ["ADMIN", "RECEPTIONIST", "DOCTOR"] },
  { id: "finance", label: "Kế toán", icon: CircleDollarSign, roles: ["ADMIN", "ACCOUNTANT", "CHIEF_ACCOUNTANT"] },
  { id: "hr", label: "Nhân sự", icon: BriefcaseMedical, roles: ["ADMIN", "ACCOUNTANT", "CHIEF_ACCOUNTANT"] },
  { id: "assets", label: "Tài sản", icon: Layers3, roles: ["ADMIN", "ACCOUNTANT", "CHIEF_ACCOUNTANT", "INVENTORY_MANAGER"] }
];

const sectionTitles: Record<Section, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: { eyebrow: "THỨ SÁU, 09 THÁNG 10", title: "Chào buổi sáng!", subtitle: "Cùng xem hôm nay phòng khám của bạn đang vận hành như thế nào." },
  reception: { eyebrow: "ĐÓN TIẾP CHU ĐÁO", title: "Tiếp nhận bệnh nhân", subtitle: "Quản lý lượt khám, hàng chờ và hành trình của bệnh nhân." },
  patients: { eyebrow: "HỒ SƠ & LỊCH SỬ", title: "Bệnh nhân", subtitle: "Tra cứu hồ sơ an toàn, bảo mật theo đúng vai trò." },
  emr: { eyebrow: "CHUYÊN MÔN NHA KHOA", title: "Bệnh án điện tử", subtitle: "Ghi nhận thăm khám, chỉ định và cam kết điều trị." },
  cashier: { eyebrow: "THU CHI & ĐỐI SOÁT", title: "Thu ngân & ca quỹ", subtitle: "Theo dõi giao dịch và bàn giao két tiền minh bạch." },
  inventory: { eyebrow: "LOT · HẠN DÙNG · FIFO", title: "Kho vật tư y tế", subtitle: "Theo dõi tồn khả dụng và xuất đúng lô, đúng hạn." },
  sterilization: { eyebrow: "AN TOÀN NGƯỜI BỆNH", title: "Kiểm soát vô khuẩn", subtitle: "Truy xuất chu trình hấp và trạng thái khay dụng cụ." },
  lab: { eyebrow: "THEO DÕI GIA CÔNG", title: "Labo nha khoa", subtitle: "Quản lý phiếu gửi, lịch hẹn và vòng đời làm lại." },
  insurance: { eyebrow: "HỒ SƠ BẢO LÃNH", title: "Bảo hiểm", subtitle: "Theo dõi hồ sơ yêu cầu và kết quả giám định." },
  warranty: { eyebrow: "ĐỒNG HÀNH SAU ĐIỀU TRỊ", title: "Bảo hành dịch vụ", subtitle: "Tra cứu thời hạn và lịch sử bảo hành của bệnh nhân." },
  finance: { eyebrow: "SỔ SÁCH & ĐỊNH KHOẢN", title: "Kế toán tài chính", subtitle: "Bút toán rõ nguồn, cân đối Nợ/Có và phân quyền duyệt." },
  hr: { eyebrow: "ĐỘI NGŨ PHÒNG KHÁM", title: "Nhân sự", subtitle: "Quản lý nhân viên, chứng chỉ hành nghề và tiền lương." },
  assets: { eyebrow: "THIẾT BỊ & KHẤU HAO", title: "Tài sản cố định", subtitle: "Theo dõi giá trị, phân bổ và lịch bảo trì thiết bị." }
};

const roleNames: Record<string, string> = {
  ADMIN: "Quản trị viên",
  RECEPTIONIST: "Tiếp nhận",
  DOCTOR: "Bác sĩ",
  ASSISTANT: "Phụ tá",
  ACCOUNTANT: "Kế toán viên",
  CHIEF_ACCOUNTANT: "Kế toán trưởng",
  INVENTORY_MANAGER: "Quản lý kho",
  CLINIC_MANAGER: "Quản lý phòng khám"
};

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const notify = useCallback((text: string, type: "success" | "error" = "success") => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  useEffect(() => {
    setAccessToken(token, () => {
      setToken(null);
      setCurrentUser(null);
      setActiveSection("dashboard");
    });
  }, [token]);

  async function signIn(username: string, password: string) {
    try {
      const result = await api<{
        accessToken: string;
        user: CurrentUser;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      setToken(result.accessToken);
      setCurrentUser(result.user);
      setActiveSection("dashboard");
      notify(`Xin chào ${result.user.username}, chúc bạn một ngày làm việc hiệu quả.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể đăng nhập.", "error");
    }
  }

  function signOut() {
    setToken(null);
    setCurrentUser(null);
    setAccessToken(null);
  }

  if (!token || !currentUser) {
    return <LoginScreen onSignIn={signIn} notice={notice} />;
  }

  const visibleNav = navItems.filter(
    (item) => item.roles.length === 0 || item.roles.includes(currentUser.role)
  );

  return (
    <div className="app-frame">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <span className="brand-mark"><HeartPulse size={22} strokeWidth={2.5} /></span>
          <span className="brand-copy"><strong>DentalCare</strong><small>CLINIC MANAGEMENT</small></span>
          <button className="icon-button sidebar-close" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)}><X size={19} /></button>
        </div>
        <div className="clinic-switcher">
          <span className="clinic-avatar">DC</span>
          <span className="clinic-label"><strong>DentalCare Clinic</strong><small>Chi nhánh Sài Gòn</small></span>
          <ChevronDown size={15} />
        </div>
        <div className="nav-caption">KHÔNG GIAN LÀM VIỆC</div>
        <nav className="sidebar-nav">
          {visibleNav.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${activeSection === id ? "nav-item-active" : ""}`} onClick={() => { setActiveSection(id); setSidebarOpen(false); }}>
              <Icon size={18} strokeWidth={activeSection === id ? 2.2 : 1.8} />
              <span>{label}</span>
              {id === "reception" && <span className="nav-count">6</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card">
            <div className="support-icon"><ShieldCheck size={18} /></div>
            <strong>Dữ liệu của bạn luôn được bảo vệ</strong>
            <span>Phiên làm việc được mã hóa và ghi nhận nhật ký truy cập.</span>
            <button onClick={() => notify("Liên hệ quản trị hệ thống để được hỗ trợ.")}>Tìm hiểu thêm <ArrowRight size={14} /></button>
          </div>
          <button className="user-profile" onClick={signOut}>
            <span className="user-avatar">{currentUser.username.slice(0, 2).toUpperCase()}</span>
            <span className="user-details"><strong>{currentUser.username}</strong><small>{roleNames[currentUser.role] ?? currentUser.role}</small></span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-trigger" aria-label="Mở menu" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>DentalCare</span><ChevronRight size={14} /><strong>{sectionTitles[activeSection].title}</strong></div>
          <div className="topbar-actions">
            <span className="system-status"><i /> Hệ thống ổn định</span>
            <button className="icon-button notification-button" aria-label="Thông báo" onClick={() => notify("Bạn đã xem tất cả thông báo mới.")}><Bell size={18} /><i /></button>
            <span className="topbar-date"><CalendarDays size={16} /> 09/10/2026</span>
          </div>
        </header>
        <div className="workspace">
          <SectionHeader
            section={activeSection}
            user={currentUser}
            onNavigate={setActiveSection}
          />
          {activeSection === "dashboard" ? (
            <Dashboard
              user={currentUser}
              onNavigate={setActiveSection}
              onNotice={notify}
            />
          ) : activeSection === "reception" || activeSection === "patients" ? (
            <PatientsAndVisits
              section={activeSection}
              user={currentUser}
              onNotice={notify}
              onOpenEmr={(visitId) => {
                window.sessionStorage.setItem("activeVisitId", visitId);
                setActiveSection("emr");
              }}
            />
          ) : activeSection === "emr" ? (
            <EmrWorkspace user={currentUser} onNotice={notify} />
          ) : activeSection === "cashier" ? (
            <CashierWorkspace user={currentUser} onNotice={notify} />
          ) : activeSection === "inventory" ? (
            <InventoryWorkspace user={currentUser} onNotice={notify} />
          ) : (
            <OperationalModule section={activeSection} user={currentUser} onNotice={notify} />
          )}
        </div>
      </main>
      {notice && <div className={`toast toast-${notice.type}`} role="status">{notice.type === "success" ? <Check size={17} /> : <X size={17} />}{notice.text}</div>}
    </div>
  );
}

function LoginScreen({ onSignIn, notice }: { onSignIn: (username: string, password: string) => void; notice: { type: "success" | "error"; text: string } | null }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    await onSignIn(username.trim(), password);
    setBusy(false);
  }

  return (
    <div className="login-screen">
      <div className="login-left">
        <div className="login-brand brand-lockup">
          <span className="brand-mark"><HeartPulse size={22} strokeWidth={2.5} /></span>
          <span className="brand-copy"><strong>DentalCare</strong><small>CLINIC MANAGEMENT</small></span>
        </div>
        <div className="login-content">
          <span className="eyebrow"><span /> NỀN TẢNG QUẢN TRỊ NHA KHOA</span>
          <h1>Chăm sóc tốt hơn.<br /><em>Vận hành thông minh hơn.</em></h1>
          <p>Mọi hành trình chăm sóc — từ tiếp nhận, điều trị đến theo dõi — trong một không gian liền mạch và an toàn.</p>
          <div className="login-highlights">
            <div><span><HeartPulse size={19} /></span><strong>Chăm sóc lấy bệnh nhân làm trung tâm</strong></div>
            <div><span><ShieldCheck size={19} /></span><strong>Dữ liệu được bảo vệ theo từng vai trò</strong></div>
            <div><span><Activity size={19} /></span><strong>Vận hành minh bạch, theo thời gian thực</strong></div>
          </div>
        </div>
        <div className="login-footnote">© 2026 DentalCare Clinic <span>·</span> Hệ thống quản lý phòng khám</div>
      </div>
      <div className="login-right">
        <div className="login-card">
          <div className="mobile-login-brand brand-lockup">
            <span className="brand-mark"><HeartPulse size={22} strokeWidth={2.5} /></span>
            <span className="brand-copy"><strong>DentalCare</strong><small>CLINIC MANAGEMENT</small></span>
          </div>
          <div className="login-card-icon"><Stethoscope size={22} /></div>
          <div className="eyebrow">CỔNG NHÂN VIÊN</div>
          <h2>Chào mừng trở lại</h2>
          <p className="muted">Đăng nhập để tiếp tục công việc của bạn.</p>
          <form onSubmit={submit} className="login-form">
            <label>Tên đăng nhập<input autoComplete="username" autoFocus value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nhập tên đăng nhập" required /></label>
            <label>Mật khẩu<span className="password-wrap"><input autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" required /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Ẩn" : "Hiện"}</button></span></label>
            <button className="primary-button login-submit" disabled={busy}>{busy ? <span className="spinner" /> : null}Đăng nhập hệ thống <ArrowRight size={17} /></button>
          </form>
          <div className="login-security"><ShieldCheck size={16} /><span>Kết nối bảo mật · Phiên đăng nhập được giám sát</span></div>
          <div className="login-help">Bạn cần hỗ trợ? <a href="mailto:support@dentalcare.local">Liên hệ quản trị viên</a></div>
        </div>
        <span className="login-side-note">Bảo mật thông tin · Bảo vệ người bệnh</span>
      </div>
      {notice && <div className="toast toast-error" role="alert"><X size={17} />{notice.text}</div>}
    </div>
  );
}

function SectionHeader({ section, user, onNavigate }: { section: Section; user: CurrentUser; onNavigate: (section: Section) => void }) {
  const content = sectionTitles[section];
  const hasPrimaryAction = ["reception", "patients", "inventory", "sterilization", "lab", "hr", "assets"].includes(section);
  return (
    <div className="page-heading">
      <div><span className="eyebrow">{content.eyebrow}</span><h1>{content.title}</h1><p>{content.subtitle}</p></div>
      <div className="heading-actions">
        {section === "dashboard" && <span className="today-chip"><span /> Thứ Sáu, 09/10</span>}
        {hasPrimaryAction && user.role !== "DOCTOR" && user.role !== "ASSISTANT" && <button className="primary-button" onClick={() => window.dispatchEvent(new CustomEvent("erp:open-create", { detail: section }))}><Plus size={17} />{section === "patients" || section === "reception" ? "Tiếp nhận mới" : "Thêm mới"}</button>}
        {section === "dashboard" && <button className="primary-button" onClick={() => onNavigate("reception")}><Plus size={17} />Tiếp nhận bệnh nhân</button>}
      </div>
    </div>
  );
}

function Dashboard({ user, onNavigate, onNotice }: { user: CurrentUser; onNavigate: (section: Section) => void; onNotice: (message: string, type?: "success" | "error") => void }) {
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

function PatientsAndVisits({ section, user, onNotice, onOpenEmr }: { section: "reception" | "patients"; user: CurrentUser; onNotice: (message: string, type?: "success" | "error") => void; onOpenEmr: (visitId: string) => void }) {
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

function EmrWorkspace({ user, onNotice }: { user: CurrentUser; onNotice: (message: string, type?: "success" | "error") => void }) {
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
      if (activeVisit.Status === 1) {
        await api(`/visits/${visitId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: 2 })
        });
      }
      const result = await api<{ status: number; requiresConsent: boolean }>(`/clinical/visits/${visitId}/settle`, { method: "POST", body: JSON.stringify({}) });
      await load();
      onNotice(result.status === 4 ? "Đã chốt tái khám miễn phí." : "Đã chốt chuyên môn, chuyển hồ sơ sang chờ thanh toán.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể chốt dịch vụ.";
      onNotice(message, "error");
      if (message.includes("Consent") || message.includes("đồng thuận")) setConsentOpen(true);
    } finally { setBusy(false); }
  }

  const isReadOnly = activeVisit ? [2, 3, 4, -1].includes(activeVisit.Status) : false;
  const canEdit = ["DOCTOR", "ADMIN"].includes(user.role);
  return (
    <div className="module-content emr-layout">
      <div className="emr-patient-select panel">
        <label><span className="form-label-upper">LƯỢT KHÁM ĐANG MỞ</span><select value={visitId} onChange={(event) => setVisitId(event.target.value)}><option value="">Chọn bệnh nhân / lượt khám</option>{visits.filter((visit) => [0, 1, 2, 3].includes(visit.Status)).map((visit) => <option key={visit.VisitId} value={visit.VisitId}>{visit.PatientName} · {visit.VisitCode}</option>)}</select></label>
        {activeVisit && <div className="emr-patient-summary"><span className="patient-avatar patient-avatar-lg">{activeVisit.PatientName.slice(0, 1)}</span><span><strong>{activeVisit.PatientName}</strong><small>{activeVisit.PatientCode} · {activeVisit.VisitCode}</small></span><VisitStatus status={activeVisit.Status} /><button className="secondary-button" onClick={() => setConsentOpen(true)}><ShieldCheck size={15} /> Đồng thuận</button></div>}
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

function CashierWorkspace({ user, onNotice }: { user: CurrentUser; onNotice: (message: string, type?: "success" | "error") => void }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [shift, setShift] = useState<Record<string, unknown> | null>(null);
  const [pendingShifts, setPendingShifts] = useState<Record<string, unknown>[]>([]);
  const [reconcileReasons, setReconcileReasons] = useState<Record<string, string>>({});
  const [payments, setPayments] = useState<Record<string, unknown>[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [openingFloat, setOpeningFloat] = useState("500000");
  const [countedCash, setCountedCash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canManageShift = ["RECEPTIONIST", "ADMIN"].includes(user.role);
  const canPay = ["RECEPTIONIST", "ADMIN"].includes(user.role);

  const load = useCallback(async () => {
    try {
      const [visitRows, currentShift, paymentRows, pendingShiftRows] = await Promise.all([
        api<Visit[]>("/visits"),
        api<Record<string, unknown> | null>("/cashier/shifts/current"),
        api<Record<string, unknown>[]>("/cashier/payments"),
        ["ADMIN", "CHIEF_ACCOUNTANT"].includes(user.role)
          ? api<Record<string, unknown>[]>("/cashier/shifts/pending")
          : Promise.resolve([])
      ]);
      setVisits(visitRows);
      setShift(currentShift);
      setPayments(paymentRows);
      setPendingShifts(pendingShiftRows);
    } catch (cause) {
      onNotice(cause instanceof Error ? cause.message : "Không tải được thông tin thu ngân.", "error");
    }
  }, [onNotice, user.role]);
  useEffect(() => { void load(); }, [load]);
  const awaitingPayment = visits.filter((visit) => visit.Status === 3);
  const selectedVisit = visits.find((visit) => visit.VisitId === selectedVisitId);
  const shiftIsOpen = shift?.Status === "OPEN";

  async function openShift(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/cashier/shifts/open", { method: "POST", body: JSON.stringify({ openingFloat: Number(openingFloat) }) });
      onNotice("Đã mở ca thu ngân.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không mở được ca."); }
    finally { setBusy(false); }
  }
  async function closeShift(event: FormEvent) {
    event.preventDefault();
    if (!shift) return;
    setBusy(true); setError("");
    try {
      const result = await api<{ status: string }>("/cashier/shifts/close", { method: "POST", body: JSON.stringify({ cashShiftId: shift.CashShiftId, countedCash: Number(countedCash), reason: "Bàn giao ca" }) });
      onNotice(result.status === "PENDING_CLOSE" ? "Ca đã gửi chờ người có quyền duyệt và đối soát." : "Đã đóng ca và ghi nhận biên bản.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không đóng được ca."); }
    finally { setBusy(false); }
  }
  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!selectedVisit) return;
    setBusy(true); setError("");
    try {
      await api(`/visits/${selectedVisitId}/payments`, { method: "POST", body: JSON.stringify({ amount: Number(amount), method, cashShiftId: method === "CASH" ? shift?.CashShiftId : undefined, idempotencyKey: crypto.randomUUID() }) });
      onNotice("Đã ghi nhận khoản thanh toán.");
      setAmount("");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không ghi nhận được thanh toán."); }
    finally { setBusy(false); }
  }
  async function reconcileShift(cashShiftId: string) {
    const reason = reconcileReasons[cashShiftId]?.trim() ?? "";
    if (reason.length < 5) {
      setError("Nhập ghi chú đối soát tối thiểu 5 ký tự.");
      return;
    }
    setBusy(true); setError("");
    try {
      await api(`/cashier/shifts/${cashShiftId}/reconcile`, { method: "POST", body: JSON.stringify({ reason }) });
      onNotice("Đã duyệt và đối soát ca thu ngân.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không đối soát được ca."); }
    finally { setBusy(false); }
  }
  return <div className="module-content">
    <div className="cashier-banner panel"><div className="cash-drawer-icon"><WalletCards size={24} /></div><div><span className="form-label-upper">TRẠNG THÁI CA THU NGÂN</span><h3>{shift ? `Ca ${String(shift.ShiftCode ?? "")}` : "Chưa mở ca thu ngân"}</h3><p>{shiftIsOpen ? "Giao dịch tiền mặt sẽ được gắn vào ca đang mở." : shift ? "Ca đang chờ người khác kiểm tra và duyệt đối soát." : "Mở ca và ghi nhận số dư đầu ca trước khi nhận tiền mặt."}</p></div><span className={`shift-status ${shiftIsOpen ? "shift-open" : "shift-closed"}`}><i />{shiftIsOpen ? "Đang mở" : shift ? "Chờ duyệt" : "Đã đóng"}</span></div>
    <div className="cashier-grid">
      <section className="panel cashier-main"><div className="panel-heading"><div><h3>Danh sách chờ thanh toán</h3><p>Các lượt khám đã chốt chuyên môn</p></div><span className="counter-pill">{awaitingPayment.length}</span></div><div className="payment-visit-list">
        {awaitingPayment.map((visit) => <button key={visit.VisitId} className={`payment-visit-row ${selectedVisitId === visit.VisitId ? "payment-visit-selected" : ""}`} onClick={() => { setSelectedVisitId(visit.VisitId); setAmount(String(visit.TotalAmount)); }}><span className="patient-avatar">{visit.PatientName.slice(0, 1)}</span><span className="payment-visit-info"><strong>{visit.PatientName}</strong><small>{visit.VisitCode} · {visit.PatientCode}</small></span><span className="payment-visit-amount">{money(visit.TotalAmount)}</span><ChevronRight size={17} /></button>)}
        {awaitingPayment.length === 0 && <EmptyRow colSpan={1} title="Không có lượt chờ thanh toán" body="Khi bác sĩ chốt dịch vụ, lượt khám sẽ xuất hiện tại đây." />}
      </div></section>
      <section className="panel payment-panel"><div className="panel-heading"><div><h3>Ghi nhận thanh toán</h3><p>Tiền mặt cần gắn với ca đang mở</p></div><CreditCard size={20} className="subtle-icon" /></div>
        <form className="stacked-form" onSubmit={pay}>
          <label>Bệnh nhân<select required value={selectedVisitId} onChange={(event) => { setSelectedVisitId(event.target.value); const visit = visits.find((row) => row.VisitId === event.target.value); setAmount(visit ? String(visit.TotalAmount) : ""); }}><option value="">Chọn lượt chờ thanh toán</option>{awaitingPayment.map((visit) => <option key={visit.VisitId} value={visit.VisitId}>{visit.PatientName} · {visit.VisitCode}</option>)}</select></label>
          <label>Số tiền thanh toán<input required min="1" type="number" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></label>
          {selectedVisit && <div className="amount-summary"><span>Tổng phí cần thu</span><strong>{money(selectedVisit.TotalAmount)}</strong></div>}
          <label>Phương thức<select value={method} onChange={(event) => setMethod(event.target.value)}><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">Chuyển khoản</option><option value="CARD">Thẻ</option></select></label>
          {method === "CASH" && !shiftIsOpen && <div className="notice-box notice-warning"><Clock3 size={16} />Cần có ca đang mở trước khi ghi nhận tiền mặt.</div>}
          <FieldError text={error} />
          <button className="primary-button payment-submit" disabled={!canPay || busy || !selectedVisit || (method === "CASH" && !shiftIsOpen)}><CircleDollarSign size={17} />{busy ? "Đang xử lý..." : "Xác nhận thanh toán"}</button>
        </form>
      </section>
    </div>
    <div className="cashier-bottom-grid">
      <section className="panel"><div className="panel-heading"><div><h3>Ca thu ngân</h3><p>Mở ca · đếm quỹ · bàn giao</p></div></div>{shiftIsOpen ? <form className="shift-close-form" onSubmit={closeShift}><div className="shift-totals"><MiniValue label="Số dư đầu ca" value={money(Number(shift?.OpeningFloat ?? 0))} /><MiniValue label="Dự kiến cuối ca" value={money(Number(shift?.ExpectedCash ?? shift?.OpeningFloat ?? 0))} /></div><label>Tiền mặt thực đếm<input required type="number" min="0" value={countedCash} onChange={(event) => setCountedCash(event.target.value)} placeholder="Nhập số tiền sau kiểm đếm" /></label><FieldError text={error} />{canManageShift && <button className="secondary-button">Lập biên bản đóng ca</button>}</form> : shift ? <div className="notice-box notice-warning"><Clock3 size={16} />Ca này không nhận thêm tiền mặt và chờ người khác duyệt đối soát.</div> : <form className="shift-close-form" onSubmit={openShift}><label>Số dư đầu ca<input required type="number" min="0" value={openingFloat} onChange={(event) => setOpeningFloat(event.target.value)} /></label><FieldError text={error} />{canManageShift && <button className="primary-button"><Plus size={16} />Mở ca thu ngân</button>}</form>}</section>
      <section className="panel"><div className="panel-heading"><div><h3>Giao dịch gần đây</h3><p>Các khoản thu được ghi nhận</p></div><span className="text-button">{payments.length} giao dịch</span></div><div className="recent-transactions">{payments.slice(0, 4).map((payment, index) => <div className="transaction-row" key={String(payment.PaymentTransactionId ?? index)}><span className="transaction-icon"><ArrowDownRight size={16} /></span><span><strong>{String(payment.PatientName ?? "Thanh toán dịch vụ")}</strong><small>{String(payment.Method ?? "—")} · {String(payment.CreatedAt ?? "")}</small></span><strong>{money(String(payment.Amount ?? 0))}</strong></div>)}{payments.length === 0 && <p className="empty-note">Chưa có giao dịch thanh toán.</p>}</div></section>
    </div>
    {["ADMIN", "CHIEF_ACCOUNTANT"].includes(user.role) && <section className="panel"><div className="panel-heading"><div><h3>Ca chờ đối soát độc lập</h3><p>Mọi ca phải được một người khác duyệt, kể cả khi số tiền khớp.</p></div><span className="counter-pill">{pendingShifts.length}</span></div><div className="pending-shift-list">{pendingShifts.map((pending) => {
      const id = String(pending.CashShiftId);
      return <form className="pending-shift-row" key={id} onSubmit={(event) => { event.preventDefault(); void reconcileShift(id); }}><div className="pending-shift-info"><strong>{String(pending.ShiftCode)} · {String(pending.CashierUsername)}</strong><small>Dự kiến {money(Number(pending.ExpectedCash ?? 0))} · Thực đếm {money(Number(pending.CountedCash ?? 0))} · Chênh {money(Number(pending.DifferenceAmount ?? 0))}</small></div><input required minLength={5} maxLength={500} value={reconcileReasons[id] ?? ""} onChange={(event) => setReconcileReasons({ ...reconcileReasons, [id]: event.target.value })} placeholder="Ghi chú đối soát độc lập" /><button className="secondary-button" disabled={busy || (reconcileReasons[id]?.trim().length ?? 0) < 5}><Check size={14} />Duyệt ca</button></form>;
    })}{pendingShifts.length === 0 && <p className="empty-note">Không có ca chờ đối soát.</p>}</div></section>}
  </div>;
}

function InventoryWorkspace({ user, onNotice }: { user: CurrentUser; onNotice: (message: string, type?: "success" | "error") => void }) {
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<{ WarehouseId: string; WarehouseCode: string; WarehouseName: string }[]>([]);
  const [reservations, setReservations] = useState<Record<string, unknown>[]>([]);
  const [reservationVisits, setReservationVisits] = useState<{ VisitId: string; VisitCode: string }[]>([]);
  const [releaseReasons, setReleaseReasons] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<"product" | "warehouse" | "receipt" | "issue" | "reserve" | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const canManage = ["ADMIN", "INVENTORY_MANAGER"].includes(user.role);
  const canReserve = ["ADMIN", "DOCTOR", "ASSISTANT", "INVENTORY_MANAGER"].includes(user.role);
  const load = useCallback(async () => {
    try {
      const [stock, items, stores, activeReservations] = await Promise.all([
        api<InventoryLot[]>("/inventory"),
        api<Product[]>("/inventory/products"),
        api<{ WarehouseId: string; WarehouseCode: string; WarehouseName: string }[]>("/inventory/warehouses"),
        api<Record<string, unknown>[]>("/inventory/reservations")
      ]);
      setLots(stock); setProducts(items); setWarehouses(stores);
      setReservations(activeReservations);
      setReservationVisits(canReserve ? await api<{ VisitId: string; VisitCode: string }[]>("/inventory/reservation-visits") : []);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không tải được kho.", "error");
    }
  }, [canReserve, onNotice]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const listener = (event: Event) => {
      if ((event as CustomEvent).detail === "inventory") setModal("receipt");
    };
    window.addEventListener("erp:open-create", listener);
    return () => window.removeEventListener("erp:open-create", listener);
  }, []);
  const filtered = lots.filter((lot) => `${lot.ProductCode} ${lot.ProductName} ${lot.LotNumber} ${lot.WarehouseName}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));
  const lowStock = new Set(lots.filter((lot) => lot.QuantityAvailable <= (products.find((product) => product.ProductId === lot.ProductId)?.MinimumStock ?? 5)).map((lot) => lot.ProductId)).size;
  const nearExpiry = lots.filter((lot) => new Date(lot.ExpiresAt).getTime() <= Date.now() + 60 * 86400000).length;
  const reservationGroups = Object.values(reservations.reduce<Record<string, { id: string; status: string; visitCode: string; expiresAt: string; lines: Record<string, unknown>[] }>>((groups, row) => {
    const id = String(row.ReservationId);
    groups[id] ??= { id, status: String(row.Status), visitCode: String(row.VisitCode), expiresAt: String(row.ExpiresAt), lines: [] };
    groups[id].lines.push(row);
    return groups;
  }, {}));
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    const body = Object.fromEntries(Object.entries(form).map(([key, value]) => ["quantity", "unitCost", "minimumStock", "expiresInMinutes"].includes(key) ? [key, Number(value)] : [key, value]));
    const endpoint = modal === "product" ? "/inventory/products" : modal === "warehouse" ? "/inventory/warehouses" : modal === "receipt" ? "/inventory/receipts" : modal === "reserve" ? "/inventory/reservations" : "/inventory/issues";
    try {
      await api(endpoint, { method: "POST", body: JSON.stringify(body) });
      onNotice(modal === "reserve" ? "Đã giữ vật tư FIFO cho lượt khám." : "Đã cập nhật dữ liệu kho.");
      setModal(null); setForm({});
      await load();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không thể cập nhật kho.", "error");
    } finally { setBusy(false); }
  }
  async function completeReservation(reservationId: string, action: "consume" | "release") {
    const reason = releaseReasons[reservationId]?.trim() ?? "";
    if (action === "release" && reason.length < 5) {
      onNotice("Nhập lý do giải phóng tối thiểu 5 ký tự.", "error");
      return;
    }
    setBusy(true);
    try {
      await api(`/inventory/reservations/${reservationId}/${action}`, {
        method: "POST",
        ...(action === "release" ? { body: JSON.stringify({ reason }) } : {})
      });
      onNotice(action === "consume" ? "Đã xuất dùng vật tư đã giữ." : "Đã giải phóng vật tư dự trữ.");
      await load();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Không cập nhật được dự trữ.", "error");
    } finally {
      setBusy(false);
    }
  }
  const modalTitle = modal === "product" ? "Thêm mặt hàng" : modal === "warehouse" ? "Thêm kho lưu trữ" : modal === "receipt" ? "Nhập kho theo lô" : modal === "reserve" ? "Dự trữ vật tư cho lượt khám" : "Xuất vật tư FIFO";
  return <div className="module-content">
    <div className="stats-strip"><MiniStat label="MẶT HÀNG" value={products.length} icon={Package} tint="blue" /><MiniStat label="TỔNG LÔ HÀNG" value={lots.length} icon={Layers3} tint="violet" /><MiniStat label="LÔ SẮP HẾT HẠN" value={nearExpiry} icon={Clock3} tint="amber" /><MiniStat label="CẢNH BÁO TỒN THẤP" value={lowStock} icon={ArrowDownRight} tint="red" /></div>
    <section className="panel table-panel"><div className="table-toolbar"><div className="filter-tabs"><button className="filter-active">Tồn kho <span>{lots.length}</span></button><button onClick={() => onNotice("Danh sách hiện được sắp xếp FIFO theo thời điểm nhận lô.")}>Theo lô</button><button onClick={() => setQuery("")}>Cận hạn <span>{nearExpiry}</span></button></div><div className="table-tools"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên hàng, mã lô..." /></label>{canManage && <><button className="secondary-button compact-action" onClick={() => setModal("product")}><Plus size={15} />Mặt hàng</button><button className="primary-button compact-action" onClick={() => setModal("receipt")}><ArrowDownRight size={15} />Nhập kho</button></>}</div></div>
      <div className="inventory-toolbar"><span><Package size={16} />{warehouses.length} kho lưu trữ</span><span>Giá trị hàng khả dụng <strong>{money(lots.reduce((sum, lot) => sum + lot.QuantityAvailable * lot.UnitCost, 0))}</strong></span>{canReserve && <button className="secondary-button compact-action" onClick={() => { setForm({ expiresInMinutes: "240" }); setModal("reserve"); }}>Dự trữ cho ca khám</button>}<button className="text-button" onClick={() => setModal("issue")}>Xuất FIFO <ArrowRight size={15} /></button></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>MẶT HÀNG</th><th>MÃ LÔ / SERIAL</th><th>KHO</th><th>HẠN DÙNG</th><th>KHẢ DỤNG</th><th>ĐƠN GIÁ VỐN</th><th>TRẠNG THÁI</th></tr></thead><tbody>{filtered.map((lot) => {
        const expired = new Date(lot.ExpiresAt).getTime() < Date.now();
        const near = !expired && new Date(lot.ExpiresAt).getTime() < Date.now() + 60 * 86400000;
        return <tr key={lot.LotId}><td><div className="product-cell"><span className="product-icon"><Package size={17} /></span><span><strong>{lot.ProductName}</strong><small>{lot.ProductCode} · {lot.Category === "MEDICINE" ? "Dược phẩm" : lot.Category === "CONSUMABLE" ? "Tiêu hao" : "VTYT"}</small></span></div></td><td><span className="code-text">{lot.LotNumber}</span><small className="cell-subtext">{lot.SerialNumber ?? "Theo dõi theo lô"}</small></td><td>{lot.WarehouseName}</td><td className={near || expired ? "expiry-warning" : ""}>{shortDate(lot.ExpiresAt)}</td><td><strong>{lot.QuantityAvailable}</strong> {lot.Unit}<small className="cell-subtext">Đã giữ {lot.QuantityReserved}</small></td><td>{money(lot.UnitCost)}</td><td><span className={`status-pill ${expired ? "status-danger" : near ? "status-pending" : lot.QuantityAvailable === 0 ? "status-neutral" : "status-complete"}`}>{expired ? "Hết hạn" : near ? "Cận hạn" : lot.QuantityAvailable === 0 ? "Hết tồn" : "Khả dụng"}</span></td></tr>;
      })}{lots.length === 0 && <EmptyRow colSpan={7} title="Kho chưa có lô hàng" body="Tạo mặt hàng, kho và phiếu nhập đầu tiên." />}</tbody></table></div>
    </section>
    <section className="panel table-panel"><div className="panel-heading"><div><h3>Dự trữ vật tư theo lượt khám</h3><p>FIFO theo hạn dùng · tiêu thụ hoặc giải phóng trước khi hết hạn</p></div><span className="counter-pill">{reservationGroups.filter((group) => group.status === "RESERVED").length} đang giữ</span></div><div className="table-scroll"><table className="data-table"><thead><tr><th>LƯỢT KHÁM</th><th>VẬT TƯ / LÔ</th><th>SỐ LƯỢNG</th><th>HẠN GIỮ</th><th>TRẠNG THÁI</th>{canReserve && <th>THAO TÁC</th>}</tr></thead><tbody>{reservationGroups.map((group) => <tr key={group.id}><td>{group.visitCode}</td><td>{group.lines.map((line) => `${String(line.ProductName)} · ${String(line.LotNumber)}`).join(", ")}</td><td>{group.lines.map((line) => `${String(line.Quantity)} ${String(line.Unit)}`).join(", ")}</td><td>{shortDate(group.expiresAt)}</td><td><span className={`status-pill ${group.status === "RESERVED" ? "status-pending" : "status-neutral"}`}>{group.status}</span></td>{canReserve && <td>{group.status === "RESERVED" ? <div className="reservation-actions"><button className="text-button" disabled={busy} onClick={() => void completeReservation(group.id, "consume")}>Tiêu thụ</button><input aria-label="Lý do giải phóng" value={releaseReasons[group.id] ?? ""} onChange={(event) => setReleaseReasons({ ...releaseReasons, [group.id]: event.target.value })} placeholder="Lý do giải phóng" /><button className="text-button" disabled={busy || (releaseReasons[group.id]?.trim().length ?? 0) < 5} onClick={() => void completeReservation(group.id, "release")}>Giải phóng</button></div> : "—"}</td>}</tr>)}{reservationGroups.length === 0 && <EmptyRow colSpan={canReserve ? 6 : 5} title="Chưa có dự trữ vật tư" body="Giữ lô vật tư theo FIFO cho lượt khám đang hoạt động." />}</tbody></table></div></section>
    {modal && <Modal title={modalTitle} subtitle={modal === "issue" ? "Hệ thống tự phân bổ lô còn hạn theo FIFO trong một giao dịch nguyên tử." : modal === "reserve" ? "Lô còn hạn sẽ được giữ theo FIFO cho lượt khám và tự giới hạn thời gian sử dụng." : "Thông tin kho được lưu vết và không cho xuất vượt tồn khả dụng."} onClose={() => setModal(null)}><form className="form-grid" onSubmit={submit}>
      {modal === "product" ? <><label>Mã mặt hàng<input required value={form.productCode ?? ""} onChange={(event) => setForm({ ...form, productCode: event.target.value })} /></label><label>Tên mặt hàng<input required value={form.productName ?? ""} onChange={(event) => setForm({ ...form, productName: event.target.value })} /></label><label>Nhóm hàng<select value={form.category ?? "CONSUMABLE"} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="MEDICINE">Dược phẩm (156)</option><option value="MEDICAL_SUPPLY">Vật tư y tế (152)</option><option value="CONSUMABLE">Vật tư tiêu hao</option></select></label><label>Đơn vị tính<input required value={form.unit ?? ""} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="hộp, cái, viên..." /></label><label>Tồn tối thiểu<input type="number" min="0" value={form.minimumStock ?? "10"} onChange={(event) => setForm({ ...form, minimumStock: event.target.value })} /></label></>
        : modal === "warehouse" ? <><label>Mã kho<input required value={form.warehouseCode ?? ""} onChange={(event) => setForm({ ...form, warehouseCode: event.target.value })} /></label><label>Tên kho<input required value={form.warehouseName ?? ""} onChange={(event) => setForm({ ...form, warehouseName: event.target.value })} /></label></>
          : modal === "receipt" ? <><label>Mặt hàng<select required value={form.productId ?? ""} onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="">Chọn mặt hàng</option>{products.map((product) => <option key={product.ProductId} value={product.ProductId}>{product.ProductCode} · {product.ProductName}</option>)}</select></label><label>Kho lưu trữ<select required value={form.warehouseId ?? ""} onChange={(event) => setForm({ ...form, warehouseId: event.target.value })}><option value="">Chọn kho</option>{warehouses.map((warehouse) => <option key={warehouse.WarehouseId} value={warehouse.WarehouseId}>{warehouse.WarehouseName}</option>)}</select></label><label>Mã lô<input required value={form.lotNumber ?? ""} onChange={(event) => setForm({ ...form, lotNumber: event.target.value })} /></label><label>Serial (nếu có)<input value={form.serialNumber ?? ""} onChange={(event) => setForm({ ...form, serialNumber: event.target.value })} /></label><label>Hạn dùng<input required type="date" value={form.expiresAt ?? ""} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></label><label>Số lượng<input required type="number" min="0.001" step="0.001" value={form.quantity ?? ""} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label><label>Đơn giá vốn<input required type="number" min="0" step="0.01" value={form.unitCost ?? ""} onChange={(event) => setForm({ ...form, unitCost: event.target.value })} /></label></>
            : modal === "reserve" ? <><label className="span-2">Lượt khám<select required value={form.visitId ?? ""} onChange={(event) => setForm({ ...form, visitId: event.target.value })}><option value="">Chọn lượt khám đang hoạt động</option>{reservationVisits.map((visit) => <option key={visit.VisitId} value={visit.VisitId}>{visit.VisitCode}</option>)}</select></label><label>Mặt hàng<select required value={form.productId ?? ""} onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="">Chọn mặt hàng</option>{products.map((product) => <option key={product.ProductId} value={product.ProductId}>{product.ProductCode} · {product.ProductName}</option>)}</select></label><label>Kho xuất<select required value={form.warehouseId ?? ""} onChange={(event) => setForm({ ...form, warehouseId: event.target.value })}><option value="">Chọn kho</option>{warehouses.map((warehouse) => <option key={warehouse.WarehouseId} value={warehouse.WarehouseId}>{warehouse.WarehouseName}</option>)}</select></label><label>Số lượng cần giữ<input required type="number" min="0.001" step="0.001" value={form.quantity ?? ""} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label><label>Thời hạn giữ (phút)<input required type="number" min="1" max="1440" value={form.expiresInMinutes ?? "240"} onChange={(event) => setForm({ ...form, expiresInMinutes: event.target.value })} /></label></>
            : <><label>Mặt hàng<select required value={form.productId ?? ""} onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="">Chọn mặt hàng</option>{products.map((product) => <option key={product.ProductId} value={product.ProductId}>{product.ProductCode} · {product.ProductName}</option>)}</select></label><label>Kho xuất<select required value={form.warehouseId ?? ""} onChange={(event) => setForm({ ...form, warehouseId: event.target.value })}><option value="">Chọn kho</option>{warehouses.map((warehouse) => <option key={warehouse.WarehouseId} value={warehouse.WarehouseId}>{warehouse.WarehouseName}</option>)}</select></label><label className="span-2">Lượt khám liên quan (nếu xuất theo ca khám)<select value={form.visitId ?? ""} onChange={(event) => setForm({ ...form, visitId: event.target.value })}><option value="">Không liên kết lượt khám</option></select></label><label>Số lượng xuất<input required type="number" min="0.001" step="0.001" value={form.quantity ?? ""} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label></>}
      <div className="modal-actions span-2"><button className="secondary-button" type="button" onClick={() => setModal(null)}>Hủy</button><button className="primary-button" disabled={busy}>{busy ? "Đang lưu..." : "Lưu giao dịch"}<Check size={16} /></button></div>
    </form></Modal>}
  </div>;
}

function OperationalModule({ section, user, onNotice }: { section: OperationalSection; user: CurrentUser; onNotice: (message: string, type?: "success" | "error") => void }) {
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

function VisitStatus({ status }: { status: number | unknown }) {
  const map: Record<number, { text: string; type: string }> = {
    [-1]: { text: "Đã hủy", type: "status-danger" },
    0: { text: "Đang chờ", type: "status-pending" },
    1: { text: "Đang khám", type: "status-progress" },
    2: { text: "Chờ xử lý", type: "status-progress" },
    3: { text: "Chờ thanh toán", type: "status-payment" },
    4: { text: "Hoàn tất", type: "status-complete" }
  };
  if (typeof status !== "number") {
    const value = String(status);
    const type = value === "APPROVED" || value === "PASSED" || value === "ACTIVE" ? "status-complete" : value === "DRAFT" || value === "IN_PROGRESS" || value === "SUBMITTED" ? "status-pending" : value === "DISPUTED" || value === "FAILED" || value === "EXPIRED" ? "status-danger" : "status-neutral";
    return <span className={`status-pill ${type}`}>{value}</span>;
  }
  const entry = map[status] ?? { text: "Không xác định", type: "status-neutral" };
  return <span className={`status-pill ${entry.type}`}><i />{entry.text}</span>;
}

function QuickAction({ icon: Icon, tint, title, text, onClick }: { icon: typeof Home; tint: string; title: string; text: string; onClick: () => void }) {
  return <button className="quick-action" onClick={onClick}><span className={`quick-icon quick-${tint}`}><Icon size={18} /></span><span><strong>{title}</strong><small>{text}</small></span><ArrowRight size={15} /></button>;
}

function WorkflowRow({ icon: Icon, tint, title, subtitle, action, onClick }: { icon: typeof Home; tint: string; title: string; subtitle: string; action: string; onClick: () => void }) {
  return <div className="workflow-row"><span className={`quick-icon quick-${tint}`}><Icon size={17} /></span><span className="workflow-copy"><strong>{title}</strong><small>{subtitle}</small></span><button onClick={onClick}>{action}<ArrowRight size={14} /></button></div>;
}

function MiniStat({ label, value, icon: Icon, tint }: { label: string; value: ReactNode; icon: typeof Home; tint: string }) {
  return <div className="mini-stat panel"><span className={`metric-icon tone-${tint}`}><Icon size={18} /></span><span><small>{label}</small><strong>{value}</strong></span></div>;
}

function MiniValue({ label, value }: { label: string; value: string }) {
  return <div className="mini-value"><span>{label}</span><strong>{value}</strong></div>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><span className="eyebrow">DENTALCARE · NGHIỆP VỤ</span><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Đóng"><X size={19} /></button></div><div className="modal-body">{children}</div></div></div>;
}

function EmptyRow({ colSpan, title, body }: { colSpan: number; title: string; body: string }) {
  return <tr><td colSpan={colSpan}><div className="empty-table"><span><ClipboardList size={21} /></span><strong>{title}</strong><small>{body}</small></div></td></tr>;
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  return <tr><td colSpan={colSpan}><div className="loading-row"><span className="spinner" />Đang tải dữ liệu...</div></td></tr>;
}

function FieldError({ text }: { text: string }) {
  return text ? <div className="field-error" role="alert"><X size={14} />{text}</div> : null;
}

export default App;
