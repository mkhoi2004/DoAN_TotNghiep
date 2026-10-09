import { ArrowDownRight, Check, ChevronRight, CircleDollarSign, ClipboardList, Clock3, CreditCard, Plus, WalletCards } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, money, type CurrentUser, type Visit } from "../../api";
import { MiniValue, FieldError } from "../../shared/components";

export function CashierWorkspace({ user, onNotice }: { user: CurrentUser; onNotice: (message: string, type?: "success" | "error") => void }) {
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
        {awaitingPayment.length === 0 && <div className="empty-table"><span><ClipboardList size={21} /></span><strong>Không có lượt chờ thanh toán</strong><small>Khi bác sĩ chốt dịch vụ, lượt khám sẽ xuất hiện tại đây.</small></div>}
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
