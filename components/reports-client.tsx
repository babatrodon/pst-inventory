"use client";
import { useState } from "react";
import { toast } from "./toast";
import { ExportMenu } from "./export-menu";
import { thisMonth, todayStr } from "@/lib/utils";
import type { Rep } from "@/lib/reports";

type Meta = { rep: Rep; company?: string; phone?: string; email?: string; address?: string };

export function ReportsClient({ brands }: { brands: string[] }) {
  const [month, setMonth] = useState(thisMonth());
  const [mBrand, setMBrand] = useState("");
  const [from, setFrom] = useState(thisMonth() + "-01");
  const [to, setTo] = useState(todayStr());
  const [mtype, setMtype] = useState("");
  const [vBrand, setVBrand] = useState("");
  const [data, setData] = useState<Meta | null>(null);
  const [qs, setQs] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(params: string) {
    setBusy(true);
    const r = await fetch(`/api/reports?${params}`);
    setBusy(false);
    if (!r.ok) return toast("Report failed", "err");
    setQs(params);
    setData(await r.json());
    setTimeout(() => document.getElementById("repOut")?.scrollIntoView({ behavior: "smooth" }), 50);
  }
  const rep = data?.rep;
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 no-pr" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
        <div className="card"><div className="card-h"><h2>Monthly stock report</h2></div>
          <div className="card-b grid gap-3">
            <div><label className="f">Month</label><input className="in" type="month" value={month} onChange={e => setMonth(e.target.value)} /></div>
            <div><label className="f">Brand</label><select className="in" value={mBrand} onChange={e => setMBrand(e.target.value)}>
              <option value="">All brands</option>{brands.map(b => <option key={b}>{b}</option>)}</select></div>
            <button className="btn btn-b" disabled={busy} onClick={() => load(`type=monthly&month=${month}&brand=${encodeURIComponent(mBrand)}`)}>Create report</button>
            <div className="hint">Opening, in, out and closing pieces for every item.</div>
          </div></div>
        <div className="card"><div className="card-h"><h2>History log</h2></div>
          <div className="card-b grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="f">From</label><input className="in" type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
              <div><label className="f">To</label><input className="in" type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
            </div>
            <div><label className="f">Type</label><select className="in" value={mtype} onChange={e => setMtype(e.target.value)}>
              <option value="">All</option><option value="IN">Added</option><option value="OUT">Taken out</option>
              <option value="ADJ_IN">Count +</option><option value="ADJ_OUT">Count −</option></select></div>
            <button className="btn btn-b" disabled={busy} onClick={() => load(`type=history&from=${from}&to=${to}&mtype=${mtype}`)}>Create report</button>
          </div></div>
        <div className="card"><div className="card-h"><h2>Stock count today</h2></div>
          <div className="card-b grid gap-3">
            <div><label className="f">Brand</label><select className="in" value={vBrand} onChange={e => setVBrand(e.target.value)}>
              <option value="">All brands</option>{brands.map(b => <option key={b}>{b}</option>)}</select></div>
            <button className="btn btn-b" disabled={busy} onClick={() => load(`type=valuation&brand=${encodeURIComponent(vBrand)}`)}>Create report</button>
            <div className="hint">Everything on hand, in pieces.</div>
          </div></div>
      </div>
      {rep && (
        <div className="card" id="repOut">
          <div className="card-h">
            <div><h2>{rep.title}</h2><div className="sub">{data?.company} · {rep.subtitle} · {rep.rows.length} rows</div></div>
            <ExportMenu base={`/api/reports?${qs}`} triggerClass="btn btn-p btn-sm no-pr"
              scopeLabel={`${rep.title} - ${rep.subtitle} - ${rep.rows.length} rows`} />
          </div>
          <div className="overflow-auto" style={{ maxHeight: "65vh" }}>
            <table className="t">
              <thead><tr>{rep.cols.map((c, i) => <th key={i} className={rep.aligns[i] === "r" ? "r" : ""}>{c}</th>)}</tr></thead>
              <tbody>
                {rep.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={rep.aligns[j] === "r" ? "r num" : ""}>{v}</td>)}</tr>)}
                {rep.foots.map((r, i) => <tr key={"f" + i} className="tot">{r.map((v, j) => <td key={j} className={rep.aligns[j] === "r" ? "r num" : ""}>{v}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
