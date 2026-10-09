import { ArrowRight, ClipboardList, Home, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function VisitStatus({ status }: { status: number | unknown }) {
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

export function QuickAction({ icon: Icon, tint, title, text, onClick }: { icon: typeof Home; tint: string; title: string; text: string; onClick: () => void }) {
  return <button className="quick-action" onClick={onClick}><span className={`quick-icon quick-${tint}`}><Icon size={18} /></span><span><strong>{title}</strong><small>{text}</small></span><ArrowRight size={15} /></button>;
}

export function WorkflowRow({ icon: Icon, tint, title, subtitle, action, onClick }: { icon: typeof Home; tint: string; title: string; subtitle: string; action: string; onClick: () => void }) {
  return <div className="workflow-row"><span className={`quick-icon quick-${tint}`}><Icon size={17} /></span><span className="workflow-copy"><strong>{title}</strong><small>{subtitle}</small></span><button onClick={onClick}>{action}<ArrowRight size={14} /></button></div>;
}

export function MiniStat({ label, value, icon: Icon, tint }: { label: string; value: ReactNode; icon: typeof Home; tint: string }) {
  return <div className="mini-stat panel"><span className={`metric-icon tone-${tint}`}><Icon size={18} /></span><span><small>{label}</small><strong>{value}</strong></span></div>;
}

export function MiniValue({ label, value }: { label: string; value: string }) {
  return <div className="mini-value"><span>{label}</span><strong>{value}</strong></div>;
}

export function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><span className="eyebrow">DENTALCARE · NGHIỆP VỤ</span><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Đóng"><X size={19} /></button></div><div className="modal-body">{children}</div></div></div>;
}

export function EmptyRow({ colSpan, title, body }: { colSpan: number; title: string; body: string }) {
  return <tr><td colSpan={colSpan}><div className="empty-table"><span><ClipboardList size={21} /></span><strong>{title}</strong><small>{body}</small></div></td></tr>;
}

export function LoadingRow({ colSpan }: { colSpan: number }) {
  return <tr><td colSpan={colSpan}><div className="loading-row"><span className="spinner" />Đang tải dữ liệu...</div></td></tr>;
}

export function FieldError({ text }: { text: string }) {
  return text ? <div className="field-error" role="alert"><X size={14} />{text}</div> : null;
}
