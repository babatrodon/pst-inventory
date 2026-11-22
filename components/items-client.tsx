"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { ItemRow } from "@/lib/items-query";
import { fmt, qf, STATUS_LBL } from "@/lib/utils";
import { MovementDialog, ItemFormDialog } from "./dialogs";
import { toast } from "./toast";
import { deleteItems, bulkSetField } from "@/actions/items";

type Props = {
  rows: ItemRow[]; counts: { all: number; ok: number; low: number; out: number };
  totals: { n: number; units: number; value: number }; page: number; pages: number;
  params: { q: string; brand: string; cat: string; status: string; sort: string };
  brands: string[]; cats: string[]; isAdmin: boolean; currency: string;
};

export function ItemsClient(p: Props) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [, start] = useTransition();

  function setParam(k: string, v: string, clearPage = true) {
    const n = new URLSearchParams(sp.toString());
    if (v) n.set(k, v); else n.delete(k);
    if (clearPage) n.delete("page");
    if (k === "brand") n.delete("cat");
    router.replace(`${path}?${n.toString()}`);
  }
  const onSearch = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setParam("q", v), 300);
  };
  const toggleAll = (on: boolean) => setSel(on ? new Set(p.rows.map(r => r.id)) : new Set());
  const toggle = (id: string, on: boolean) => setSel(s => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const ids = [...sel];

  function doBulk(field: "brand" | "category") {
    const v = prompt(`New ${field} for ${ids.length} items:`);
    if (!v?.trim()) return;
    start(() => bulkSetField(ids, field === "brand" ? "brand" : "category", v).then(() => {
      setSel(new Set()); router.refresh(); toast(`${field} updated`);
    }).catch(e => toast(e.message, "err")));
  }
  function doDelete() {
    if (!confirm(`Delete ${ids.length} items and their whole history?`)) return;
    start(() => deleteItems(ids).then(() => {
      setSel(new Set()); router.refresh(); toast("Items deleted");
    }).catch(e => toast(e.message, "err")));
  }
  const chips = [["", "All", p.counts.all, ""], ["ok", "In stock", p.counts.ok, "c-ok"],
    ["low", "Low", p.counts.low, "c-low"], ["out", "Empty", p.counts.out, "c-out"]] as const;

  return (
    <div className="card">
      <div className="card-h">
        <h2>Stock list <span className="sub num">{p.totals.n} items · {qf(p.totals.units)} pcs · {p.currency} {fmt(p.totals.value)}</span></h2>
        <div className="flex gap-2 flex-wrap no-pr">
          <a className="btn btn-o btn-sm" href={`/api/export/items?${sp.toString()}`}>Excel</a>
          <Link className="btn btn-b btn-sm" href="/import">Import</Link>
          <ItemFormDialog brands={p.brands} cats={p.cats} isAdmin={p.isAdmin} triggerClass="btn btn-p btn-sm" trigger={<>+ New item</>} />
        </div>
      </div>
      <div className="card-b pb-3 grid gap-2.5 no-pr">
        <div className="flex gap-2.5 flex-wrap">
          <input className="in flex-[2] min-w-[200px]" placeholder="🔎 Search item code or description"
            defaultValue={p.params.q} onChange={e => onSearch(e.target.value)} />
          <select className="in flex-1 min-w-[140px] max-w-[230px]" value={p.params.brand} onChange={e => setParam("brand", e.target.value)}>
            <option value="">All brands</option>{p.brands.map(b => <option key={b}>{b}</option>)}
          </select>
          <select className="in flex-1 min-w-[140px] max-w-[230px]" value={p.params.cat} onChange={e => setParam("cat", e.target.value)}>
            <option value="">All categories</option>{p.cats.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="in w-auto" value={p.params.sort} onChange={e => setParam("sort", e.target.value)}>
            <option value="">Sort: Code</option><option value="name">Sort: Description</option>
            <option value="qty_desc">Most stock first</option><option value="qty_asc">Least stock first</option>
            <option value="value_desc">Highest value first</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {chips.map(([k, l, n, c]) => (
            <button key={k} className={`chip ${c} ${p.params.status === k ? "on" : ""}`} onClick={() => setParam("status", k)}>
              {l} · {n}</button>
          ))}
        </div>
      </div>
      {sel.size > 0 && (
        <div className="flex items-center gap-2.5 flex-wrap px-5 py-2.5 font-bold text-[13.5px] no-pr"
          style={{ background: "var(--blue-s)", color: "var(--blue)", borderTop: "1px solid #D4E1F5", borderBottom: "1px solid #D4E1F5" }}>
          <span>{sel.size} selected</span><span className="flex-1" />
          {p.isAdmin && <><button className="btn btn-o btn-sm" onClick={() => doBulk("brand")}>Change brand</button>
            <button className="btn btn-o btn-sm" onClick={() => doBulk("category")}>Change category</button>
            <button className="btn btn-d btn-sm" onClick={doDelete}>Delete</button></>}
          <button className="btn btn-o btn-sm" onClick={() => setSel(new Set())}>Cancel</button>
        </div>
      )}
      <div className="overflow-auto" style={{ maxHeight: "68vh" }}>
        <table className="t">
          <thead><tr>
            <th className="c no-pr" style={{ width: 34 }}><input type="checkbox" checked={p.rows.length > 0 && p.rows.every(r => sel.has(r.id))} onChange={e => toggleAll(e.target.checked)} /></th>
            <th>Code</th><th>Description</th><th className="hidden lg:table-cell">Brand</th>
            <th className="hidden lg:table-cell">Category</th><th className="r hidden md:table-cell">Cost</th>
            <th className="r">Stock</th><th className="r hidden md:table-cell">Value</th>
            <th className="c hidden md:table-cell">Status</th><th className="c no-pr">Actions</th>
          </tr></thead>
          <tbody>
            {p.rows.length === 0 && <tr><td colSpan={10} className="hint p-5">No items match. Clear a filter, or use Import / New item above.</td></tr>}
            {p.rows.map(r => {
              const [cls, lbl] = STATUS_LBL[r.status];
              const combo = { id: r.id, code: r.code, name: r.name, brand: r.brand, category: r.category, stock: r.stock, cost: r.cost };
              return (
                <tr key={r.id}>
                  <td className="c no-pr"><input type="checkbox" checked={sel.has(r.id)} onChange={e => toggle(r.id, e.target.checked)} /></td>
                  <td><Link href={`/items/${r.id}`} className="code">{r.code || "–"}</Link></td>
                  <td><Link href={`/items/${r.id}`} className="text-inherit">{r.name || <span className="dim">–</span>}</Link></td>
                  <td className="hidden lg:table-cell"><span className="bdg b-brand">{r.brand}</span></td>
                  <td className="hidden lg:table-cell dim">{r.category}</td>
                  <td className="r num hidden md:table-cell">{fmt(r.cost)}</td>
                  <td className="r num text-[15px]">{qf(r.stock)}</td>
                  <td className="r num hidden md:table-cell">{fmt(r.value)}</td>
                  <td className="c hidden md:table-cell"><span className={`bdg ${cls}`}>{lbl}</span></td>
                  <td className="c no-pr whitespace-nowrap">
                    <MovementDialog mode="IN" item={combo} triggerClass="btn btn-p btn-sm" trigger={<>Add</>} />{" "}
                    <MovementDialog mode="OUT" item={combo} triggerClass="btn btn-b btn-sm" trigger={<>Out</>} />
                  </td>
                </tr>
              );
            })}
            {p.rows.length > 0 && (
              <tr className="tot"><td className="no-pr" /><td colSpan={2}>TOTAL (filtered)</td>
                <td className="hidden lg:table-cell" /><td className="hidden lg:table-cell" /><td className="hidden md:table-cell" />
                <td className="r num">{qf(p.totals.units)}</td>
                <td className="r num hidden md:table-cell">{fmt(p.totals.value)}</td>
                <td className="hidden md:table-cell" /><td className="no-pr" /></tr>
            )}
          </tbody>
        </table>
      </div>
      {p.pages > 1 && (
        <div className="card-b flex items-center justify-center gap-2 no-pr">
          <button className="btn btn-o btn-sm" disabled={p.page <= 1} onClick={() => setParam("page", String(p.page - 1), false)}>← Back</button>
          <span className="dim">Page {p.page} of {p.pages}</span>
          <button className="btn btn-o btn-sm" disabled={p.page >= p.pages} onClick={() => setParam("page", String(p.page + 1), false)}>Next →</button>
        </div>
      )}
    </div>
  );
}
