"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { toast } from "./toast";
import { applyImport } from "@/actions/import";

type Row = { code: string; name: string; brand: string; category: string; qty: number | string; cost: number | string;
  listPrice?: number | string; discountPct?: number | string; minStock?: number | string; unit?: string };
const empty = (): Row => ({ code: "", name: "", brand: "", category: "", qty: "", cost: "", unit: "PCS" });

export function ImportClient({ brands, cats }: { brands: string[]; cats: string[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fname, setFname] = useState("");
  const [brand, setBrand] = useState("");
  const [brandNew, setBrandNew] = useState("");
  const [cat, setCat] = useState("");
  const [mode, setMode] = useState<"add" | "set">("add");
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const fx = useRef<HTMLInputElement>(null);
  const fp = useRef<HTMLInputElement>(null);

  async function parse(file: File) {
    setBusy(true);
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch("/api/import", { method: "POST", body: fd });
    setBusy(false);
    if (!r.ok) { const e = await r.json().catch(() => ({}));
      return toast(e.error || "File not readable. Use the Excel format from the button.", "err"); }
    const d = await r.json();
    if (!d.rows?.length) return toast("No items found in this file", "err");
    setRows(d.rows); setFname(d.fname);
  }
  function template() {
    const aoa = [["ITEM CODE", "DESCRIPTION", "BRAND", "CATEGORY", "QTY", "MIN STOCK", "UNIT"],
      ["LC1D09M7", "TeSys D Contactor 9A 220V", "Schneider Electric", "Contactors", 10, 5, "PCS"]];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = aoa[0].map(h => ({ wch: String(h).length + 4 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Items");
    XLSX.writeFile(wb, "PST-Import-Format.xlsx"); toast("Format downloaded");
  }
  function setRow(i: number, k: keyof Row, v: string) {
    setRows(rs => rs!.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  }
  function go() {
    const b = brand === "__new" ? brandNew.trim() : brand;
    if (brand === "__new" && !b) return toast("Type the new brand name", "err");
    start(() => applyImport({ rows: rows!, brand: b, category: cat.trim(), mode, fname })
      .then(res => { toast(`${res.added} new items · ${res.updated} updated`); router.push("/items"); router.refresh(); })
      .catch(e => toast(e.message || "Import failed", "err")));
  }
  const CAP = 250;

  if (!rows) return (
    <div className="card max-w-3xl mx-auto">
      <div className="card-h"><h2>Import stock from a file</h2></div>
      <div className="card-b grid gap-4">
        <div className="flex items-center gap-2 font-extrabold disp text-[13px]" style={{ color: "var(--mut)" }}>
          <b className="w-6 h-6 rounded-full text-white inline-flex items-center justify-center text-[12.5px]" style={{ background: "var(--green)" }}>1</b>
          Choose your file
        </div>
        <div className="flex flex-col items-center gap-3 p-7 rounded-2xl border-2 border-dashed text-center"
          style={{ borderColor: "#BFD9C9", background: "var(--green-s2)" }}>
          <div className="font-extrabold disp text-[16px]">Excel, CSV, PDF or by hand</div>
          <div className="hint max-w-[430px]">The app looks for: <b>ITEM CODE, DESCRIPTION, QTY</b>. Extra columns are okay. You check everything on the next screen before saving.</div>
          <div className="flex gap-2.5 flex-wrap justify-center">
            <button className="btn btn-p" disabled={busy} onClick={() => fx.current?.click()}>{busy ? "Reading…" : "Choose Excel / CSV"}</button>
            <button className="btn btn-b" disabled={busy} onClick={() => fp.current?.click()}>Choose PDF</button>
            <button className="btn btn-y" onClick={() => { setRows(Array.from({ length: 10 }, empty)); setFname("Manual entry"); }}>Enter by hand</button>
          </div>
          <button className="btn btn-o btn-sm" onClick={template}>Download the Excel format</button>
        </div>
        <div className="hint">PDF files come in many shapes. The app reads what fits and you correct the rest on the preview. Nothing is saved until you press Import.</div>
        <input ref={fx} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) parse(f); }} />
        <input ref={fp} type="file" accept=".pdf" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) parse(f); }} />
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-h"><h2>Check &amp; import · {rows.length} rows <span className="sub">{fname}</span></h2>
        <button className="btn btn-o btn-sm" onClick={() => setRows(null)}>Back</button></div>
      <div className="card-b grid gap-3.5">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <div><label className="f">Brand for these items</label>
            <select className="in" value={brand} onChange={e => setBrand(e.target.value)}>
              <option value="">Keep as in file</option>
              {brands.map(b => <option key={b}>{b}</option>)}
              <option value="__new">+ New brand…</option>
            </select>
            {brand === "__new" && <input className="in mt-1.5" placeholder="Type the new brand" value={brandNew} onChange={e => setBrandNew(e.target.value)} />}</div>
          <div><label className="f">Category (optional)</label>
            <input className="in" list="imp-cats" placeholder="Keep as in file" value={cat} onChange={e => setCat(e.target.value)} />
            <datalist id="imp-cats">{cats.map(c => <option key={c} value={c} />)}</datalist></div>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          <label className="radio"><input type="radio" checked={mode === "add"} onChange={() => setMode("add")} />
            <span><b className="block text-[14px]">New stock arrived</b>
              <span className="hint">Adds these quantities on top of current stock. History shows the arrival.</span></span></label>
          <label className="radio"><input type="radio" checked={mode === "set"} onChange={() => setMode("set")} />
            <span><b className="block text-[14px]">Starting stock</b>
              <span className="hint">Sets the stock to exactly these quantities.</span></span></label>
        </div>
        <div className="overflow-auto rounded-xl border" style={{ maxHeight: "46vh", borderColor: "var(--line2)" }}>
          <table className="t">
            <thead><tr><th style={{ width: 36 }}>#</th><th style={{ minWidth: 130 }}>Code</th><th style={{ minWidth: 190 }}>Description</th>
              <th className="r" style={{ width: 95 }}>Qty</th><th style={{ width: 44 }} /></tr></thead>
            <tbody>
              {rows.slice(0, CAP).map((r, i) => (
                <tr key={i}>
                  <td className="dim num">{i + 1}</td>
                  <td><input className="in !min-h-[34px] !py-1 !text-[13px]" value={r.code} onChange={e => setRow(i, "code", e.target.value)} /></td>
                  <td><input className="in !min-h-[34px] !py-1 !text-[13px]" value={r.name} onChange={e => setRow(i, "name", e.target.value)} /></td>
                  <td><input className="in !min-h-[34px] !py-1 !text-[13px] text-right" type="number" step="any" value={r.qty} onChange={e => setRow(i, "qty", e.target.value)} /></td>
                  <td className="c"><button className="btn btn-o btn-sm" onClick={() => setRows(rs => rs!.filter((_, j) => j !== i))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > CAP && <div className="hint">Showing the first {CAP} rows. All {rows.length} rows import.</div>}
      </div>
      <div className="mo-f">
        <button className="btn btn-o" onClick={() => setRows(rs => [...rs!, ...Array.from({ length: 10 }, empty)])}>+ 10 rows</button>
        <span className="flex-1" />
        <button className="btn btn-p" disabled={pending} onClick={go}>{pending ? "Importing…" : "Import"}</button>
      </div>
    </div>
  );
}
