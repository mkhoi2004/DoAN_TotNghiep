import { ArrowDownRight, ArrowRight, Check, Clock3, Layers3, Package, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, money, shortDate, type CurrentUser, type InventoryLot, type Product } from "../../api";
import { MiniStat, Modal, EmptyRow } from "../../shared/components";

export function InventoryWorkspace({ user, onNotice }: { user: CurrentUser; onNotice: (message: string, type?: "success" | "error") => void }) {
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
  const canIssue = ["ADMIN", "INVENTORY_MANAGER", "DOCTOR"].includes(user.role);
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
      <div className="inventory-toolbar"><span><Package size={16} />{warehouses.length} kho lưu trữ</span><span>Giá trị hàng khả dụng <strong>{money(lots.reduce((sum, lot) => sum + lot.QuantityAvailable * lot.UnitCost, 0))}</strong></span>{canReserve && <button className="secondary-button compact-action" onClick={() => { setForm({ expiresInMinutes: "240" }); setModal("reserve"); }}>Dự trữ cho ca khám</button>}{canIssue && <button className="text-button" onClick={() => setModal("issue")}>Xuất FIFO <ArrowRight size={15} /></button>}</div>
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
