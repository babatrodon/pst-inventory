"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ItemCombo, type ComboItem } from "./item-combo";
import { toast } from "./toast";
import { recordMovement, applyCount } from "@/actions/movements";
import { upsertItem, deleteItems } from "@/actions/items";
import { fmt, qf, todayStr } from "@/lib/utils";

function useDlg() {
  const ref = useRef<HTMLDialogElement>(null);
  return { ref, open: () => ref.current?.showModal(), close: () => ref.current?.close() };
}
function run(fn: () => Promise<unknown>, after: () => void) {
  fn().then(() => after()).catch((e: Error) => toast(e.message || "Something went wrong", "err"));
}

export function MovementDialog({ mode, item, trigger, triggerClass }: {
  mode: "IN" | "OUT"; item?: ComboItem | null; trigger: React.ReactNode; triggerClass?: string;
}) {
  const { ref, open, close } = useDlg();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState<ComboItem | null>(item ?? null);
  const [qty, setQty] = useState(""); const [cost, setCost] = useState("");
  const [date, setDate] = useState(todayStr());
  const [party, setParty] = useState(""); const [refNo, setRefNo] = useState(""); const [note, setNote] = useState("");
  const isOut = mode === "OUT";
  const effCost = isOut ? (sel?.cost ?? 0) : (parseFloat(cost) || sel?.cost || 0);
  const total = (parseFloat(qty) || 0) * effCost;

  function openDlg() {
    setSel(item ?? null); setQty(""); setCost(item && !isOut ? String(item.cost) : "");
    setDate(todayStr()); setParty(""); setRefNo(""); setNote(""); open();
  }
  function save() {
    if (!sel) return toast("Pick an item first", "err");
    const q = parseFloat(qty);
    if (!q || q <= 0) return toast("Enter how many", "err");
    if (isOut && q > sel.stock && !confirm(`Only ${qf(sel.stock)} shows in stock. Save anyway? The number goes below zero until corrected.`)) return;
    start(() => new Promise<void>(res => run(
      () => recordMovement({ itemId: sel.id, type: mode, qty: q, unitCost: isOut ? undefined : (parseFloat(cost) || undefined), date, party, ref: refNo, note }),
      () => { close(); router.refresh(); toast(isOut ? "Stock out saved" : "Stock added"); res(); }
    )));
  }
  return (<>
    <button type="button" className={triggerClass} onClick={openDlg}>{trigger}</button>
    <dialog ref={ref} className="mo">
      <div className="mo-h"><h3>{isOut ? "Stock out · goods going out" : "Add stock · goods received"}</h3>
        <button className="btn btn-o btn-sm" onClick={close}>✕</button></div>
      <div className="mo-b grid gap-3">
        <div><label className="f">Which item?</label>
          {item ? <input className="in" value={`${item.code}${item.name ? " · " + item.name : ""}`} readOnly /> : <ItemCombo onPick={x => { setSel(x); if (!isOut) setCost(String(x.cost)); }} />}
          <div className="hint mt-1">{sel ? `In stock now: ${qf(sel.stock)}` : ""}</div></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="f">Date</label><input className="in" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><label className="f">How many? *</label><input className="in num" type="number" step="any" min="0" value={qty} onChange={e => setQty(e.target.value)} /></div>
          {!isOut && <div><label className="f">Cost for 1 piece (optional)</label><input className="in num" type="number" step="any" min="0" value={cost} onChange={e => setCost(e.target.value)} /></div>}
          <div><label className="f">{isOut ? "Reference no." : "Reference / PO"}</label><input className="in" value={refNo} onChange={e => setRefNo(e.target.value)} /></div>
        </div>
        <div><label className="f">{isOut ? "Taken by / customer (optional)" : "Supplier (optional)"}</label><input className="in" value={party} onChange={e => setParty(e.target.value)} /></div>
        <div><label className="f">Note</label><input className="in" value={note} onChange={e => setNote(e.target.value)} /></div>
      </div>
      <div className="mo-f"><span className="hint num flex-1 text-[15px]">{total > 0 ? `Value: SAR ${fmt(total)}` : ""}</span>
        <button className="btn btn-o" onClick={close}>Cancel</button>
        <button className={`btn ${isOut ? "btn-b" : "btn-p"}`} onClick={save} disabled={pending}>{pending ? "Saving…" : isOut ? "Save stock out" : "Save stock"}</button></div>
    </dialog>
  </>);
}

export function CountDialog({ item, trigger, triggerClass }: { item?: ComboItem | null; trigger: React.ReactNode; triggerClass?: string }) {
  const { ref, open, close } = useDlg();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState<ComboItem | null>(item ?? null);
  const [counted, setCounted] = useState(""); const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("Stock count");
  function openDlg() { setSel(item ?? null); setCounted(""); setDate(todayStr()); setNote("Stock count"); open(); }
  function save() {
    if (!sel) return toast("Pick an item first", "err");
    const c = parseFloat(counted);
    if (isNaN(c) || c < 0) return toast("Enter the counted quantity", "err");
    start(() => new Promise<void>(res => run(
      () => applyCount({ itemId: sel.id, counted: c, date, note }),
      () => { close(); router.refresh(); toast("Stock corrected"); res(); }
    )));
  }
  return (<>
    <button type="button" className={triggerClass} onClick={openDlg}>{trigger}</button>
    <dialog ref={ref} className="mo">
      <div className="mo-h"><h3>Count stock · type what you counted</h3><button className="btn btn-o btn-sm" onClick={close}>✕</button></div>
      <div className="mo-b grid gap-3">
        <div><label className="f">Which item?</label>
          {item ? <input className="in" value={`${item.code}${item.name ? " · " + item.name : ""}`} readOnly /> : <ItemCombo onPick={setSel} />}
          <div className="hint mt-1">{sel ? `System shows ${qf(sel.stock)} in stock. The difference is booked automatically.` : "The difference is booked automatically."}</div></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="f">Date</label><input className="in" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><label className="f">Counted quantity *</label><input className="in num" type="number" step="any" min="0" value={counted} onChange={e => setCounted(e.target.value)} /></div>
        </div>
        <div><label className="f">Note</label><input className="in" value={note} onChange={e => setNote(e.target.value)} /></div>
      </div>
      <div className="mo-f"><button className="btn btn-o" onClick={close}>Cancel</button>
        <button className="btn btn-y" onClick={save} disabled={pending}>{pending ? "Saving…" : "Apply count"}</button></div>
    </dialog>
  </>);
}

export type ItemFull = {
  id?: string; code: string; name: string; brand: string; category: string; unit: string;
  cost: number; listPrice: number | null; discountPct: number | null; minStock: number; openingQty: number;
};
export function ItemFormDialog({ item, brands, cats, isAdmin, trigger, triggerClass }: {
  item?: ItemFull; brands: string[]; cats: string[]; isAdmin: boolean; trigger: React.ReactNode; triggerClass?: string;
}) {
  const { ref, open, close } = useDlg();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState<ItemFull>(item ?? { code: "", name: "", brand: "", category: "", unit: "PCS", cost: 0, listPrice: null, discountPct: null, minStock: 0, openingQty: 0 });
  const [dupHint, setDupHint] = useState(""); const dupOk = useRef(false);
  const set = (k: keyof ItemFull, v: string) => setF(p => ({ ...p, [k]: v as never }));

  function openDlg() {
    setF(item ?? { code: "", name: "", brand: "", category: "", unit: "PCS", cost: 0, listPrice: null, discountPct: null, minStock: 0, openingQty: 0 });
    setDupHint(""); dupOk.current = false; open();
  }
  async function checkDup(code: string) {
    dupOk.current = false;
    if (!code.trim()) return setDupHint("");
    const r = await fetch(`/api/items/search?norm=${encodeURIComponent(code)}`);
    const rows: { id: string; name: string; category: string; stock: number }[] = await r.json();
    const ex = rows.find(x => x.id !== item?.id);
    setDupHint(ex ? `This code already exists: ${ex.name || ex.category} · stock ${qf(ex.stock)}` : "");
  }
  function calcCost(lp: string, disc: string) {
    const l = parseFloat(lp), d = parseFloat(disc);
    if (!isNaN(l) && !isNaN(d)) setF(p => ({ ...p, cost: +(l * (1 - d / 100)).toFixed(4) }));
  }
  function save() {
    if (!String(f.code).trim() && !String(f.name).trim()) return toast("Give the item a code or a description", "err");
    if (isNaN(Number(f.cost))) return toast("Cost is required", "err");
    if (dupHint && !dupOk.current) { dupOk.current = true; return toast("Code already exists. Press save again to keep both lines.", "err"); }
    start(() => new Promise<void>(res => run(
      () => upsertItem({ ...f, listPrice: f.listPrice === null || String(f.listPrice) === "" ? null : f.listPrice, discountPct: f.discountPct === null || String(f.discountPct) === "" ? null : f.discountPct }),
      () => { close(); router.refresh(); toast(item?.id ? "Item updated" : "Item added"); res(); }
    )));
  }
  function del() {
    if (!item?.id) return;
    if (!confirm("Delete this item and its whole history? A backup keeps you safe.")) return;
    start(() => new Promise<void>(res => run(
      () => deleteItems([item.id!]),
      () => { close(); router.push("/items"); router.refresh(); toast("Item deleted"); res(); }
    )));
  }
  return (<>
    <button type="button" className={triggerClass} onClick={openDlg}>{trigger}</button>
    <dialog ref={ref} className="mo">
      <div className="mo-h"><h3>{item?.id ? "Edit item" : "New item"}</h3><button className="btn btn-o btn-sm" onClick={close}>✕</button></div>
      <div className="mo-b grid grid-cols-2 gap-3">
        <div><label className="f">Item code</label><input className="in" value={f.code} onChange={e => { set("code", e.target.value); checkDup(e.target.value); }} placeholder="LC1D09M7" />
          {dupHint && <div className="hint mt-1" style={{ color: "var(--yellow-d)", fontWeight: 600 }}>{dupHint}</div>}</div>
        <div><label className="f">Unit</label><input className="in" value={f.unit} onChange={e => set("unit", e.target.value)} /></div>
        <div className="col-span-2"><label className="f">Description</label><input className="in" value={f.name} onChange={e => set("name", e.target.value)} placeholder="Contactor 9A 220V" /></div>
        <div><label className="f">Brand</label><input className="in" list="dl-brands" value={f.brand} onChange={e => set("brand", e.target.value)} />
          <datalist id="dl-brands">{brands.map(b => <option key={b} value={b} />)}</datalist></div>
        <div><label className="f">Category</label><input className="in" list="dl-cats" value={f.category} onChange={e => set("category", e.target.value)} />
          <datalist id="dl-cats">{cats.map(c => <option key={c} value={c} />)}</datalist></div>
        <div><label className="f">List price</label><input className="in num" type="number" step="any" value={f.listPrice ?? ""} onChange={e => { set("listPrice", e.target.value); calcCost(e.target.value, String(f.discountPct ?? "")); }} /></div>
        <div><label className="f">Discount %</label><input className="in num" type="number" step="any" value={f.discountPct ?? ""} onChange={e => { set("discountPct", e.target.value); calcCost(String(f.listPrice ?? ""), e.target.value); }} /></div>
        <div><label className="f">Cost for 1 piece (SAR) *</label><input className="in num" type="number" step="any" value={f.cost} onChange={e => set("cost", e.target.value)} /></div>
        <div><label className="f">Alert me when stock is at</label><input className="in num" type="number" step="any" value={f.minStock} onChange={e => set("minStock", e.target.value)} /></div>
        <div><label className="f">{item?.id ? "Opening qty" : "Quantity now *"}</label><input className="in num" type="number" step="any" value={f.openingQty} onChange={e => set("openingQty", e.target.value)} /></div>
        <div className="col-span-2 hint">List price and discount fill the cost for you. After saving, use Add stock / Stock out for daily changes.</div>
      </div>
      <div className="mo-f">
        {item?.id && isAdmin && <button className="btn btn-d mr-auto" onClick={del}>Delete item</button>}
        <button className="btn btn-o" onClick={close}>Cancel</button>
        <button className="btn btn-p" onClick={save} disabled={pending}>{pending ? "Saving…" : item?.id ? "Save changes" : "Add item"}</button></div>
    </dialog>
  </>);
}
