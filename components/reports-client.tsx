"use client";
import { useState } from "react";
import { toast } from "./toast";
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
  async function pdf() {
    if (!data) return;
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const rep = data.rep;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(40, 83, 168);
    doc.text(data.company || "", 14, 14);
    doc.setFontSize(11); doc.setTextColor(18, 161, 75); doc.text(rep.title, 14, 21);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(102, 116, 140);
    doc.text(`${rep.subtitle}   ·   ${data.phone || ""}   ·   ${data.email || ""}`, 14, 26.5);
    const colStyles: Record<number, { halign: "right" }> = {};
    rep.aligns.forEach((a, i) => { if (a === "r") colStyles[i] = { halign: "right" }; });
    autoTable(doc, {
      head: [rep.cols], body: rep.rows, foot: rep.foots, startY: 31,
      styles: { fontSize: 7.3, cellPadding: 1.5, textColor: [31, 42, 61] },
      headStyles: { fillColor: [18, 161, 75], textColor: 255, fontSize: 7.3 },
      footStyles: { fillColor: [240, 244, 250], textColor: [31, 42, 61], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 253] }, columnStyles: colStyles,
      didDrawPage: () => {
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`Generated ${todayStr()} · ${data.address || ""}`, 14, doc.internal.pageSize.getHeight() - 7);
        doc.text(`Page ${doc.internal.pages.length - 1}`, doc.internal.pageSize.getWidth() - 24, doc.internal.pageSize.getHeight() - 7);
      },
    });
    doc.save(`${rep.file}.pdf`); toast("PDF downloaded");
  }
  function word() {
    if (!data) return;
    const rep = data.rep;
    const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    const tbl = `<table><thead><tr>${rep.cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>
      ${rep.rows.map(r => "<tr>" + r.map((v, i) => `<td style="text-align:${rep.aligns[i] === "r" ? "right" : "left"}">${esc(v)}</td>`).join("") + "</tr>").join("")}
      ${rep.foots.map(r => "<tr>" + r.map((v, i) => `<td style="text-align:${rep.aligns[i] === "r" ? "right" : "left"};font-weight:bold;background:#F0F4FA">${esc(v)}</td>`).join("") + "</tr>").join("")}
      </tbody></table>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>
      body{font-family:Calibri,Arial,sans-serif;font-size:10pt;color:#1F2A3D}h1{font-size:15pt;color:#2853A8;margin:0}h2{font-size:12pt;color:#12A14B;margin:2pt 0}
      p.meta{color:#66748C;font-size:9pt;margin:2pt 0 10pt}table{border-collapse:collapse;width:100%}th,td{border:1pt solid #C9D2E6;padding:3pt 6pt;font-size:8.5pt}
      th{background:#12A14B;color:#fff;text-align:left}</style></head><body>
      <h1>${esc(data.company || "")}</h1><h2>${esc(rep.title)}</h2>
      <p class="meta">${esc(rep.subtitle)} · ${esc(data.phone || "")} · ${esc(data.email || "")} · ${esc(data.address || "")}</p>${tbl}</body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + html], { type: "application/msword" }));
    a.download = `${rep.file}.doc`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
    toast("Word file downloaded");
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
            <div className="hint">Opening, in, out, closing and value for every item.</div>
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
        <div className="card"><div className="card-h"><h2>Stock value today</h2></div>
          <div className="card-b grid gap-3">
            <div><label className="f">Brand</label><select className="in" value={vBrand} onChange={e => setVBrand(e.target.value)}>
              <option value="">All brands</option>{brands.map(b => <option key={b}>{b}</option>)}</select></div>
            <button className="btn btn-b" disabled={busy} onClick={() => load(`type=valuation&brand=${encodeURIComponent(vBrand)}`)}>Create report</button>
            <div className="hint">Everything on hand, valued at unit cost.</div>
          </div></div>
      </div>
      {rep && (
        <div className="card" id="repOut">
          <div className="card-h">
            <div><h2>{rep.title}</h2><div className="sub">{data?.company} · {rep.subtitle} · {rep.rows.length} rows</div></div>
            <div className="flex gap-2 flex-wrap no-pr">
              <button className="btn btn-d btn-sm" onClick={pdf}>PDF</button>
              <a className="btn btn-p btn-sm" href={`/api/reports?${qs}&format=xlsx`}>Excel</a>
              <button className="btn btn-b btn-sm" onClick={word}>Word</button>
              <button className="btn btn-o btn-sm" onClick={() => window.print()}>Print</button>
            </div>
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
