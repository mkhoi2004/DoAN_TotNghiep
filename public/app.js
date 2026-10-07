const queue = [
  { code: 'STN#06102026/0025', name: 'Nguyễn Hà My', initials: 'NM', tone: 'teal', doctor: 'BS. Minh Khoa', status: 'Đang khám', kind: 'examining', room: 'Ghế 02' },
  { code: 'STN#06102026/0026', name: 'Lê Hoàng Nam', initials: 'LN', tone: 'coral', doctor: 'BS. Hồng Phúc', status: 'Chờ khám', kind: 'waiting', room: 'Ghế 01' },
  { code: 'STN#06102026/0027', name: 'Phạm Thùy Chi', initials: 'PC', tone: 'blue', doctor: 'BS. Minh Khoa', status: 'Chờ thanh toán', kind: 'payment', room: 'Ghế 03' },
  { code: 'STN#06102026/0028', name: 'Trần Minh Anh', initials: 'TA', tone: 'amber', doctor: 'BS. Hồng Phúc', status: 'Hoàn tất', kind: 'done', room: 'Ghế 01' },
];

const patients = [
  { code: 'BN#000124', name: 'Trần Minh Anh', initials: 'TA', tone: 'amber', phone: '090 321 8842', lastVisit: '06/10/2026 · 09:42', state: 'Đang điều trị' },
  { code: 'BN#000123', name: 'Nguyễn Hà My', initials: 'NM', tone: 'teal', phone: '091 772 1038', lastVisit: '06/10/2026 · 09:10', state: 'Đang khám' },
  { code: 'BN#000122', name: 'Lê Hoàng Nam', initials: 'LN', tone: 'coral', phone: '098 450 2291', lastVisit: '18/09/2026 · 14:25', state: 'Theo dõi' },
  { code: 'BN#000121', name: 'Phạm Thùy Chi', initials: 'PC', tone: 'blue', phone: '093 667 4412', lastVisit: '04/10/2026 · 16:03', state: 'Đang điều trị' },
  { code: 'BN#000120', name: 'Võ Thanh Tùng', initials: 'VT', tone: 'teal', phone: '097 912 6500', lastVisit: '28/09/2026 · 11:18', state: 'Bảo hành' },
];

const emrPatients = [
  { name: 'Nguyễn Hà My', code: 'STN#06102026/0025', initials: 'NM', tone: 'teal', age: '28 tuổi', tooth: 'Răng 36' },
  { name: 'Lê Hoàng Nam', code: 'STN#06102026/0026', initials: 'LN', tone: 'coral', age: '41 tuổi', tooth: 'Răng 11' },
  { name: 'Phạm Thùy Chi', code: 'STN#06102026/0027', initials: 'PC', tone: 'blue', age: '34 tuổi', tooth: 'Răng 26' },
];

let inventoryLots = [
  { itemCode: 'VT-IMPL-001', name: 'Implant NeoBiotech 4.0 × 10mm', lotCode: 'NB2026-08A', expiry: '15/08/2028', available: 12, unit: 'bộ', state: 'Sẵn sàng', kind: 'done' },
  { itemCode: 'DRG-001', name: 'Găng khám nitrile size M', lotCode: 'GLV2026-09B', expiry: '22/09/2028', available: 486, unit: 'hộp', state: 'Sẵn sàng', kind: 'done' },
  { itemCode: 'MED-024', name: 'Augmentin 1g', lotCode: 'AUG2026-04', expiry: '18/10/2026', available: 44, unit: 'viên', state: 'Sắp hết hạn', kind: 'waiting' },
  { itemCode: 'MED-031', name: 'Articaine 4% + Epinephrine', lotCode: 'ART2026-05', expiry: '04/11/2026', available: 72, unit: 'ống', state: 'Đang giữ 18', kind: 'payment' },
  { itemCode: 'VT-RES-009', name: 'Minivis chỉnh nha 1.6 × 8mm', lotCode: 'MVS2026-01', expiry: '12/01/2029', available: 7, unit: 'cái', state: 'Tồn thấp', kind: 'examining' },
];

const viewLabels = { overview: 'Tổng quan', patients: 'Bệnh nhân', visits: 'Lượt khám', emr: 'Hồ sơ EMR', billing: 'Thanh toán', inventory: 'Kho vật tư', reports: 'Báo cáo', settings: 'Cấu hình' };
const state = { selectedView: 'overview', selectedEmr: null };

function authHeaders() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function initialsAvatar(person) {
  return `<div class="avatar avatar-${person.tone}">${person.initials}</div>`;
}

function renderQueue() {
  document.querySelector('#queue-list').innerHTML = queue.map((item) => `
    <div class="table-row">
      <div class="patient-cell">${initialsAvatar(item)}<div><strong>${item.name}</strong><small>${item.code}</small></div></div>
      <div class="doctor-cell">${item.doctor}</div>
      <div><span class="status-pill ${item.kind}"><i></i>${item.status}</span></div>
      <div class="room-cell">${item.room}</div>
    </div>`).join('');
}

function renderPatients(filter = '') {
  const query = filter.trim().toLowerCase();
  const visible = patients.filter((patient) => `${patient.code} ${patient.name} ${patient.phone}`.toLowerCase().includes(query));
  document.querySelector('#patient-list').innerHTML = visible.length ? visible.map((patient) => `
    <div class="table-row">
      <div class="patient-code">${patient.code}</div>
      <div class="patient-cell">${initialsAvatar(patient)}<strong>${patient.name}</strong></div>
      <div class="plain-cell">${patient.phone}</div>
      <div class="plain-cell">${patient.lastVisit}</div>
      <div><span class="status-pill ${patient.state === 'Đang khám' ? 'examining' : patient.state === 'Bảo hành' ? 'waiting' : 'done'}"><i></i>${patient.state}</span></div>
    </div>`).join('') : '<div class="empty-state"><p>Không tìm thấy hồ sơ phù hợp.</p></div>';
}

function renderVisits() {
  document.querySelector('#visit-list').innerHTML = queue.concat([{ code: 'STN#06102026/0029', name: 'Võ Thanh Tùng', initials: 'VT', tone: 'teal', doctor: 'BS. Minh Khoa', status: 'Chờ khám', kind: 'waiting', room: 'Ghế 04' }]).map((item) => `
    <div class="table-row">
      <div class="patient-code">${item.code}</div>
      <div class="patient-cell">${initialsAvatar(item)}<strong>${item.name}</strong></div>
      <div class="doctor-cell">${item.doctor}</div>
      <div class="plain-cell">${item.status === 'Hoàn tất' ? 'Tái khám' : 'Khám điều trị'}</div>
      <div><span class="status-pill ${item.kind}"><i></i>${item.status}</span></div>
      <button class="action-more" title="Mở lượt khám">···</button>
    </div>`).join('');
}

function renderEmrPatients() {
  document.querySelector('#emr-patient-list').innerHTML = emrPatients.map((person, index) => `
    <div class="emr-person ${index === 0 ? 'active' : ''}" data-emr="${index}">
      ${initialsAvatar(person)}<div><strong>${person.name}</strong><small>${person.code} · ${person.tooth}</small></div>
    </div>`).join('');
  document.querySelectorAll('[data-emr]').forEach((item) => item.addEventListener('click', () => selectEmr(Number(item.dataset.emr))));
}

function renderInventory(filter = '') {
  const query = filter.trim().toLowerCase();
  const visible = inventoryLots.filter((lot) => `${lot.itemCode} ${lot.name} ${lot.lotCode}`.toLowerCase().includes(query));
  document.querySelector('#inventory-list').innerHTML = visible.map((lot) => `
    <div class="table-row">
      <div class="patient-cell"><div class="metric-icon mint">▦</div><div><strong>${lot.name}</strong><small>${lot.itemCode}</small></div></div>
      <div class="plain-cell">${lot.lotCode}</div>
      <div class="plain-cell">${lot.expiry}</div>
      <div class="plain-cell"><strong>${lot.available}</strong> ${lot.unit}</div>
      <div><span class="status-pill ${lot.kind}"><i></i>${lot.state}</span></div>
      <button class="action-more" title="Thao tác lô">···</button>
    </div>`).join('');
  document.querySelector('#inventory-item-count').textContent = String(new Set(inventoryLots.map((lot) => lot.itemCode)).size).padStart(2, '0');
  document.querySelector('#inventory-expiry-count').textContent = String(inventoryLots.filter((lot) => lot.kind === 'waiting').length).padStart(2, '0');
  document.querySelector('#inventory-reserved-count').textContent = String(inventoryLots.filter((lot) => lot.kind === 'payment').length * 18).padStart(2, '0');
}

async function refreshInventory() {
  try {
    const response = await fetch('/api/inventory/lots', { headers: authHeaders() });
    if (!response.ok) throw new Error('API Kho chưa sẵn sàng.');
    const lots = await response.json();
    inventoryLots = lots.map((lot) => ({
      itemCode: lot.item.itemCode,
      name: lot.item.name,
      lotCode: lot.lotCode,
      expiry: lot.expiryDate ? new Intl.DateTimeFormat('vi-VN').format(new Date(lot.expiryDate)) : 'Không hạn',
      available: Number(lot.quantityOnHand) - Number(lot.quantityReserved),
      unit: lot.item.unit,
      state: lot.status === 'RESERVED' ? 'Đang giữ' : 'Sẵn sàng',
      kind: lot.status === 'RESERVED' ? 'payment' : 'done',
    }));
    renderInventory(document.querySelector('#inventory-search').value);
    showToast('Đã đồng bộ tồn kho từ API.');
  } catch (error) {
    showToast(error.message);
  }
}

function selectEmr(index) {
  state.selectedEmr = index;
  document.querySelectorAll('[data-emr]').forEach((item) => item.classList.toggle('active', Number(item.dataset.emr) === index));
  const person = emrPatients[index];
  document.querySelector('#emr-detail').innerHTML = `
    <div class="emr-header"><div><div class="eyebrow">${person.code}</div><h2>${person.name}</h2><p>${person.age} · Bác sĩ phụ trách: BS. Minh Khoa · Ghế 02</p></div><div class="emr-actions"><button class="button button-quiet">Lưu nháp</button><button class="button button-primary" data-action="settle-demo">Chốt dịch vụ</button></div></div>
    <div class="emr-tabs"><button class="active">Tổng quan</button><button>Khám lâm sàng</button><button>Điều trị</button><button>Consent</button><button>Đơn thuốc</button></div>
    <div class="clinical-grid"><div class="clinical-box"><h3>Sinh hiệu</h3><strong>120/80</strong><p>mmHg · Mạch 72 bpm</p></div><div class="clinical-box"><h3>Chẩn đoán</h3><strong>K02.1</strong><p>Sâu ngà răng · Răng 36</p></div><div class="clinical-box"><h3>Dịch vụ dự kiến</h3><strong>2.400.000đ</strong><p>Điều trị bảo tồn · 1 dịch vụ</p></div></div>
    <div class="consent-banner"><span>!</span><div><strong>Consent cần hoàn tất</strong><br>Thủ thuật phục hồi răng 36 yêu cầu người bệnh ký xác nhận.</div><b>Chờ ký</b></div>`;
  document.querySelector('[data-action="settle-demo"]')?.addEventListener('click', () => showToast('Đã kiểm tra Consent: ca đang chờ chữ ký người bệnh.'));
}

function switchView(view) {
  state.selectedView = view;
  document.querySelectorAll('.nav-item[data-view]').forEach((item) => item.classList.toggle('active', item.dataset.view === view));
  document.querySelectorAll('.view-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `view-${view}`));
  document.querySelector('#view-title').textContent = viewLabels[view] || 'Tổng quan';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openPatientModal() { document.querySelector('#patient-modal').hidden = false; document.querySelector('input[name="fullName"]').focus(); }
function closePatientModal() { document.querySelector('#patient-modal').hidden = true; document.querySelector('#patient-form').reset(); document.querySelector('#form-message').textContent = ''; }
function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timeout); showToast.timeout = window.setTimeout(() => toast.classList.remove('show'), 3200); }

async function submitPatient(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());
  const message = document.querySelector('#form-message');
  try {
    const response = await fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error('API chưa sẵn sàng hoặc dữ liệu bị từ chối.');
    const saved = await response.json();
    patients.unshift({ code: saved.patientCode, name: saved.fullName, initials: saved.fullName.split(' ').map((part) => part[0]).slice(-2).join(''), tone: 'teal', phone: saved.phone, lastVisit: 'Chưa có lượt khám', state: 'Mới tạo' });
    renderPatients(); closePatientModal(); switchView('patients'); showToast('Đã tạo hồ sơ bệnh nhân ' + saved.patientCode);
  } catch (error) {
    message.textContent = 'Chưa kết nối được API. Đang ở chế độ xem thử, hồ sơ chưa được lưu.';
    showToast(error.message);
  }
}

function bindEvents() {
  document.querySelectorAll('.nav-item[data-view]').forEach((item) => item.addEventListener('click', () => switchView(item.dataset.view)));
  document.querySelectorAll('[data-view-link]').forEach((item) => item.addEventListener('click', () => switchView(item.dataset.viewLink)));
  document.querySelectorAll('[data-action="new-patient"]').forEach((item) => item.addEventListener('click', openPatientModal));
  document.querySelectorAll('[data-action="close-modal"]').forEach((item) => item.addEventListener('click', closePatientModal));
  document.querySelector('#patient-form').addEventListener('submit', submitPatient);
  document.querySelector('#login-form').addEventListener('submit', submitLogin);
  document.querySelector('#patient-search').addEventListener('input', (event) => renderPatients(event.target.value));
  document.querySelector('#inventory-search').addEventListener('input', (event) => renderInventory(event.target.value));
  document.querySelector('[data-action="inventory-refresh"]').addEventListener('click', refreshInventory);
  document.querySelector('[data-action="receive-lot"]').addEventListener('click', () => showToast('Màn hình nhập lô sẽ tạo phiếu nhập và cập nhật FIFO.'));
  document.querySelector('[data-action="refresh"]').addEventListener('click', () => { renderQueue(); renderVisits(); showToast('Dữ liệu màn hình đã được làm mới.'); });
  document.querySelector('#patient-modal').addEventListener('click', (event) => { if (event.target.id === 'patient-modal') closePatientModal(); });
}

async function submitLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const message = document.querySelector('#login-message');
  message.textContent = '';
  try {
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form.entries())) });
    if (!response.ok) throw new Error('Sai tài khoản hoặc mật khẩu, hoặc API chưa kết nối.');
    const result = await response.json();
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('currentUser', JSON.stringify(result.user));
    document.querySelector('#login-screen').hidden = true;
    document.querySelector('#app-shell').hidden = false;
    showToast(`Xin chào ${result.user.displayName}`);
  } catch (error) {
    message.textContent = error.message;
  }
}

function boot() {
  document.querySelector('#current-date').textContent = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  renderQueue(); renderPatients(); renderVisits(); renderEmrPatients(); renderInventory(); bindEvents();
  const token = localStorage.getItem('accessToken');
  document.querySelector('#login-screen').hidden = Boolean(token);
  document.querySelector('#app-shell').hidden = !token;
}

boot();
