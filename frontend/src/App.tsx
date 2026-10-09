import { Activity, ArrowRight, BadgeCheck, Bell, BriefcaseMedical, CalendarDays, Check, ChevronDown, ChevronRight, CircleDollarSign, FileHeart, FlaskConical, HeartPulse, Home, Layers3, LogOut, Menu, Package, Plus, ShieldCheck, Sparkles, Stethoscope, Users, WalletCards, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, setAccessToken, type CurrentUser, type Section } from "./api";
import { Dashboard } from "./features/dashboard/Dashboard";
import { PatientsAndVisits } from "./features/patient-care/PatientsAndVisits";
import { EmrWorkspace } from "./features/emr/EmrWorkspace";
import { CashierWorkspace } from "./features/cashier/CashierWorkspace";
import { InventoryWorkspace } from "./features/inventory/InventoryWorkspace";
import { OperationalModule } from "./features/operations/OperationalModule";
import { canAccessSection, canCreateInSection, roleNames, sectionRoles } from "./shared/constants";

type NavItem = {
  id: Section;
  label: string;
  icon: typeof Home;
  roles: readonly string[];
};

const navItems: NavItem[] = [
  { id: "dashboard", label: "Tổng quan", icon: Home, roles: sectionRoles.dashboard },
  { id: "reception", label: "Tiếp nhận", icon: CalendarDays, roles: sectionRoles.reception },
  { id: "patients", label: "Hồ sơ bệnh nhân", icon: Users, roles: sectionRoles.patients },
  { id: "emr", label: "Bệnh án điện tử", icon: FileHeart, roles: sectionRoles.emr },
  { id: "cashier", label: "Thu ngân & ca quỹ", icon: WalletCards, roles: sectionRoles.cashier },
  { id: "inventory", label: "Kho vật tư", icon: Package, roles: sectionRoles.inventory },
  { id: "sterilization", label: "Kiểm soát vô khuẩn", icon: Sparkles, roles: sectionRoles.sterilization },
  { id: "lab", label: "Phiếu Labo", icon: FlaskConical, roles: sectionRoles.lab },
  { id: "insurance", label: "Bảo hiểm", icon: ShieldCheck, roles: sectionRoles.insurance },
  { id: "warranty", label: "Bảo hành", icon: BadgeCheck, roles: sectionRoles.warranty },
  { id: "finance", label: "Kế toán", icon: CircleDollarSign, roles: sectionRoles.finance },
  { id: "hr", label: "Nhân sự", icon: BriefcaseMedical, roles: sectionRoles.hr },
  { id: "assets", label: "Tài sản", icon: Layers3, roles: sectionRoles.assets }
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

  const handleUnauthorized = useCallback(() => {
    setToken(null);
    setCurrentUser(null);
    setActiveSection("dashboard");
  }, []);

  useEffect(() => {
    setAccessToken(token, handleUnauthorized);
  }, [handleUnauthorized, token]);

  async function signIn(username: string, password: string) {
    try {
      const result = await api<{
        accessToken: string;
        user: CurrentUser;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      setAccessToken(result.accessToken, handleUnauthorized);
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
    setAccessToken(null, handleUnauthorized);
  }

  function navigateTo(section: Section) {
    if (!currentUser || !canAccessSection(currentUser.role, section)) {
      notify("Bạn không có quyền truy cập chức năng này.", "error");
      return;
    }
    setActiveSection(section);
  }

  if (!token || !currentUser) {
    return <LoginScreen onSignIn={signIn} notice={notice} />;
  }

  const visibleNav = navItems.filter((item) => item.roles.includes(currentUser.role));

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
            <button key={id} className={`nav-item ${activeSection === id ? "nav-item-active" : ""}`} onClick={() => { navigateTo(id); setSidebarOpen(false); }}>
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
            onNavigate={navigateTo}
          />
          {activeSection === "dashboard" ? (
            <Dashboard
              user={currentUser}
              onNavigate={navigateTo}
              onNotice={notify}
            />
          ) : activeSection === "reception" || activeSection === "patients" ? (
            <PatientsAndVisits
              section={activeSection}
              user={currentUser}
              onNotice={notify}
              onOpenEmr={(visitId) => {
                if (!canAccessSection(currentUser.role, "emr")) return;
                window.sessionStorage.setItem("activeVisitId", visitId);
                navigateTo("emr");
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
        {hasPrimaryAction && canCreateInSection(user.role, section) && <button className="primary-button" onClick={() => window.dispatchEvent(new CustomEvent("erp:open-create", { detail: section }))}><Plus size={17} />{section === "patients" || section === "reception" ? "Tiếp nhận mới" : "Thêm mới"}</button>}
        {section === "dashboard" && canCreateInSection(user.role, "reception") && <button className="primary-button" onClick={() => onNavigate("reception")}><Plus size={17} />Tiếp nhận bệnh nhân</button>}
      </div>
    </div>
  );
}

export default App;
