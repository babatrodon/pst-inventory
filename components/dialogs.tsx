"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { ItemCombo, type ComboItem } from "./item-combo";
import { toast } from "./toast";
import { recordMovement, applyCount } from "@/actions/movements";
import { upsertItem, deleteItems } from "@/actions/items";
import { qf, todayStr } from "@/lib/utils";

function run(fn: () => Promise<unknown>, after: () => void) {
  return fn().then(() => after()).catch((e: Error) => toast(e.message || "Something went wrong", "err"));
}
const onEnter = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") { e.preventDefault(); fn(); }
};

export function MovementDialog({ mode, item, trigger, triggerClass }: {
  mode: "IN" | "OUT"; item?: ComboItem | null; trigger: React.ReactNode; triggerClass?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [sel, setSel] = useState<ComboItem | null>(null);
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(todayStr());
  const [party, setParty] = useState(""); const [refNo, setRefNo] = useState(""); const [note, setNote] = useState("");
  const isOut = mode === "OUT";

  function openDlg() {
    setSel(item ?? null); setQty("");
    setDate(todayStr()); setParty(""); setRefNo(""); setNote(""); setOpen(true);
  }
  function save() {
    if (!sel) return toast("Pick an item first", "err");
    const q = parseFloat(qty);
    if (!q || q <= 0) return toast("Enter how many", "err");
    if (isOut && q > sel.stock && !confirm(`Only ${qf(sel.stock)} shows in stock. Save anyway? The number goes below zero until corrected.`)) return;
    start(() => run(
      () => recordMovement({ itemId: sel.id, type: mode, qty: q, date, party, ref: refNo, note }),
      () => { setOpen(false); router.refresh(); toast(isOut ? "Stock out saved" : "Stock added"); }
    ));
  }
  return (<>
    <button type="button" className={triggerClass} onClick={openDlg}>{trigger}</button>
    <Modal open={open} onClose={() => setOpen(false)}
      title={isOut ? "Stock out · goods going out" : "Add stock · goods received"}
      footer={<>
        <button type="button" className="btn btn-o" onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className={`btn ${isOut ? "btn-b" : "btn-p"}`} onClick={save} disabled={pending}>
          {pending ? "Saving…" : isOut ? "Save stock out" : "Save stock"}</button>
      </>}>
      <div className="grid gap-3.5" onKeyDown={onEnter(save)}>
        <div><label className="f">Which item?</label>
          {item && sel ? <input className="in" value={`${sel.code}${sel.name ? " · " + sel.name : ""}`} readOnly />
            : <ItemCombo onPick={setSel} />}
          <div className="hint mt-1.5">{sel ? `In stock now: ${qf(sel.stock)}` : "Type to search by code or name."}</div></div>
        <div className="grid grid-cols-2 gap-3.5">
          <div><label className="f">How many? *</label>
            <input className="in num text-[17px]" type="number" step="any" min="0" inputMode="decimal"
              value={qty} onChange={e => setQty(e.target.value)} placeholder="0" /></div>
          <div><label className="f">Date</label><input className="in" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><label className="f">{isOut ? "Reference no." : "Reference / PO"}</label>
            <input className="in" value={refNo} onChange={e => setRefNo(e.target.value)} /></div>
        </div>
        <div><label className="f">{isOut ? "Taken by / customer (optional)" : "Supplier (optional)"}</label>
          <input className="in" value={party} onChange={e => setParty(e.target.value)} /></div>
        <div><label className="f">Note</label><input className="in" value={note} onChange={e => setNote(e.target.value)} /></div>
      </div>
    </Modal>
  </>);
}

export function CountDialog({ item, trigger, triggerClass }: { item?: ComboItem | null; trigger: React.ReactNode; triggerClass?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [sel, setSel] = useState<ComboItem | null>(null);
  const [counted, setCounted] = useState(""); const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("Stock count");
  function openDlg() { setSel(item ?? null); setCounted(""); setDate(todayStr()); setNote("Stock count"); setOpen(true); }
  function save() {
    if (!sel) return toast("Pick an item first", "err");
    const c = parseFloat(counted);
    if (isNaN(c) || c < 0) return toast("Enter the counted quantity", "err");
    start(() => run(
      () => applyCount({ itemId: sel.id, counted: c, date, note }),
      () => { setOpen(false); router.refresh(); toast("Stock corrected"); }
    ));
  }
  return (<>
    <button type="button" className={triggerClass} onClick={openDlg}>{trigger}</button>
    <Modal open={open} onClose={() => setOpen(false)} title="Count stock · type what you counted"
      footer={<>
        <button type="button" className="btn btn-o" onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className="btn btn-y" onClick={save} disabled={pending}>{pending ? "Saving…" : "Apply count"}</button>
      </>}>
      <div className="grid gap-3.5" onKeyDown={onEnter(save)}>
        <div><label className="f">Which item?</label>
          {item && sel ? <input className="in" value={`${sel.code}${sel.name ? " · " + sel.name : ""}`} readOnly /> : <ItemCombo onPick={setSel} />}
          <div className="hint mt-1.5">{sel ? `System shows ${qf(sel.stock)} in stock. The difference is booked automatically.` : "The difference is booked automatically."}</div></div>
        <div className="grid grid-cols-2 gap-3.5">
          <div><label className="f">Counted quantity *</label>
            <input className="in num text-[17px]" type="number" step="any" min="0" inputMode="decimal" value={counted} onChange={e => setCounted(e.target.value)} placeholder="0" /></div>
          <div><label className="f">Date</label><input className="in" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        </div>
        <div><label className="f">Note</label><input className="in" value={note} onChange={e => setNote(e.target.value)} /></div>
      </div>
    </Modal>
  </>);
}

export type ItemFull = {
  id?: string; code: string; name: string; brand: string; category: string; unit: string;
  cost: number; listPrice: number | null; discountPct: number | null; minStock: number; openingQty: number;
};
export function ItemFormDialog({ item, brands, cats, isAdmin, trigger, triggerClass }: {
  item?: ItemFull; brands: string[]; cats: string[]; isAdmin: boolean; trigger: React.ReactNode; triggerClass?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const blank: ItemFull = { code: "", name: "", brand: "", category: "", unit: "PCS", cost: 0, listPrice: null, discountPct: null, minStock: 0, openingQty: 0 };
  const [f, setF] = useState<ItemFull>(blank);
  const [dupHint, setDupHint] = useState(""); const [dupOk, setDupOk] = useState(false);
  const set = (k: keyof ItemFull, v: string) => setF(p => ({ ...p, [k]: v as never }));

  function openDlg() { setF(item ?? blank); setDupHint(""); setDupOk(false); setOpen(true); }
  async function checkDup(code: string) {
    setDupOk(false);
    if (!code.trim()) return setDupHint("");
    const r = await fetch(`/api/items/search?norm=${encodeURIComponent(code)}`);
    const rows: { id: string; name: string; category: string; stock: number }[] = await r.json();
    const ex = rows.find(x => x.id !== item?.id);
    setDupHint(ex ? `This code already exists: ${ex.name || ex.category} · stock ${qf(ex.stock)}` : "");
  }
  function save() {
    if (!String(f.code).trim() && !String(f.name).trim()) return toast("Give the item a code or a description", "err");
    if (dupHint && !dupOk) { setDupOk(true); return toast("Code already exists. Press save again to keep both lines.", "err"); }
    start(() => run(
      () => upsertItem({ ...f, listPrice: f.listPrice === null || String(f.listPrice) === "" ? null : f.listPrice, discountPct: f.discountPct === null || String(f.discountPct) === "" ? null : f.discountPct }),
      () => { setOpen(false); router.refresh(); toast(item?.id ? "Item updated" : "Item added"); }
    ));
  }
  function del() {
    if (!item?.id) return;
    if (!confirm("Delete this item and its whole history? A backup keeps you safe.")) return;
    start(() => run(
      () => deleteItems([item.id!]),
      () => { setOpen(false); router.push("/items"); router.refresh(); toast("Item deleted"); }
    ));
  }
  return (<>
    <button type="button" className={triggerClass} onClick={openDlg}>{trigger}</button>
    <Modal open={open} onClose={() => setOpen(false)} title={item?.id ? "Edit item" : "New item"}
      footer={<>
        {item?.id && isAdmin && <button type="button" className="btn btn-d mr-auto" onClick={del}>Delete item</button>}
        <button type="button" className="btn btn-o" onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className="btn btn-p" onClick={save} disabled={pending}>{pending ? "Saving…" : item?.id ? "Save changes" : "Add item"}</button>
      </>}>
      <div className="grid grid-cols-2 gap-3.5" onKeyDown={onEnter(save)}>
        <div><label className="f">Item code</label>
          <input className="in" value={f.code} onChange={e => { set("code", e.target.value); checkDup(e.target.value); }} placeholder="LC1D09M7" />
          {dupHint && <div className="hint mt-1" style={{ color: "var(--yellow-d)", fontWeight: 600 }}>{dupHint}</div>}</div>
        <div><label className="f">Unit</label><input className="in" value={f.unit} onChange={e => set("unit", e.target.value)} /></div>
        <div className="col-span-2"><label className="f">Description</label>
          <input className="in" value={f.name} onChange={e => set("name", e.target.value)} placeholder="Contactor 9A 220V" /></div>
        <div><label className="f">Brand</label><input className="in" list="dl-brands" value={f.brand} onChange={e => set("brand", e.target.value)} />
          <datalist id="dl-brands">{brands.map(b => <option key={b} value={b} />)}</datalist></div>
        <div><label className="f">Category</label><input className="in" list="dl-cats" value={f.category} onChange={e => set("category", e.target.value)} />
          <datalist id="dl-cats">{cats.map(c => <option key={c} value={c} />)}</datalist></div>
        <div><label className="f">Alert me when stock is at</label><input className="in num" type="number" step="any" inputMode="decimal" value={f.minStock} onChange={e => set("minStock", e.target.value)} /></div>
        <div><label className="f">{item?.id ? "Opening qty" : "Quantity now *"}</label><input className="in num" type="number" step="any" inputMode="decimal" value={f.openingQty} onChange={e => set("openingQty", e.target.value)} /></div>
        <div className="col-span-2 hint">After saving, use Add stock / Stock out for daily changes.</div>
      </div>
    </Modal>
  </>);
}
