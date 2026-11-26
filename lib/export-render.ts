import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import type { Rep } from "./reports";

applyPlugin(jsPDF as never);
type DocWithTable = jsPDF & { autoTable: (opts: Record<string, unknown>) => void };

type Cell = string | number;
export type RepX = Omit<Rep, "rows" | "foots"> & { rows: Cell[][]; foots: Cell[][] };
export type RepMeta = { company: string; phone: string; email: string; address: string };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function renderXlsx(rep: RepX, meta: RepMeta, plain = false): Buffer {
  const aoa: Cell[][] = plain
    ? [rep.cols, ...rep.rows]
    : [[meta.company], [`${rep.title} · ${rep.subtitle}`], [], rep.cols, ...rep.rows, ...rep.foots];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = rep.cols.map((c, i) => ({
    wch: Math.min(44, Math.max(c.length + 2, ...rep.rows.slice(0, 300).map(r => String(r[i] ?? "").length + 2), 10)),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, rep.title.slice(0, 31));
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function renderPdf(rep: RepX, meta: RepMeta, today: string): Buffer {
  const doc = new jsPDF({ orientation: rep.cols.length > 6 ? "landscape" : "portrait", unit: "mm", format: "a4" }) as DocWithTable;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(40, 83, 168);
  doc.text(meta.company, 14, 14);
  doc.setFontSize(11); doc.setTextColor(18, 161, 75); doc.text(rep.title, 14, 21);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(102, 116, 140);
  doc.text(`${rep.subtitle}   -   ${meta.phone}   -   ${meta.email}`, 14, 26.5);
  const columnStyles: Record<number, { halign: "right" }> = {};
  rep.aligns.forEach((a, i) => { if (a === "r") columnStyles[i] = { halign: "right" }; });
  doc.autoTable({
    head: [rep.cols], body: rep.rows.map(r => r.map(String)), foot: rep.foots.map(r => r.map(String)), startY: 31,
    styles: { fontSize: 8, cellPadding: 1.6, textColor: [31, 42, 61] },
    headStyles: { fillColor: [18, 161, 75], textColor: 255, fontSize: 8 },
    footStyles: { fillColor: [240, 244, 250], textColor: [31, 42, 61], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 253] }, columnStyles,
    didDrawPage: () => {
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text(`Generated ${today} - ${meta.address}`, 14, doc.internal.pageSize.getHeight() - 7);
      doc.text(`Page ${doc.internal.pages.length - 1}`, doc.internal.pageSize.getWidth() - 24, doc.internal.pageSize.getHeight() - 7);
    },
  });
  return Buffer.from(doc.output("arraybuffer"));
}

function htmlTable(rep: RepX): string {
  return `<table><thead><tr>${rep.cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>
    ${rep.rows.map(r => "<tr>" + r.map((v, i) => `<td class="${rep.aligns[i] === "r" ? "r" : ""}">${esc(v)}</td>`).join("") + "</tr>").join("\n")}
    ${rep.foots.map(r => '<tr class="tot">' + r.map((v, i) => `<td class="${rep.aligns[i] === "r" ? "r" : ""}">${esc(v)}</td>`).join("") + "</tr>").join("")}
    </tbody></table>`;
}

export function renderDoc(rep: RepX, meta: RepMeta): string {
  return `﻿<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
  <head><meta charset="utf-8"><title>${esc(rep.title)}</title><style>
  body{font-family:Calibri,Arial,sans-serif;font-size:10pt;color:#1F2A3D}
  h1{font-size:15pt;color:#2853A8;margin:0}h2{font-size:12pt;color:#12A14B;margin:2pt 0}
  p.meta{color:#66748C;font-size:9pt;margin:2pt 0 10pt}
  table{border-collapse:collapse;width:100%}th,td{border:1pt solid #C9D2E6;padding:3pt 6pt;font-size:8.5pt}
  th{background:#12A14B;color:#fff;text-align:left}td.r{text-align:right}
  tr.tot td{font-weight:bold;background:#F0F4FA}</style></head><body>
  <h1>${esc(meta.company)}</h1><h2>${esc(rep.title)}</h2>
  <p class="meta">${esc(rep.subtitle)} - ${esc(meta.phone)} - ${esc(meta.email)} - ${esc(meta.address)}</p>
  ${htmlTable(rep)}</body></html>`;
}

export function renderPrint(rep: RepX, meta: RepMeta, today: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(rep.file)}</title><style>
  *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1F2A3D;margin:24px;font-size:13px}
  h1{font-size:19px;color:#2853A8;margin:0}h2{font-size:15px;color:#12A14B;margin:3px 0}
  p.meta{color:#66748C;font-size:11px;margin:3px 0 14px}
  table{border-collapse:collapse;width:100%}th,td{border:1px solid #C9D2E6;padding:5px 8px;font-size:11.5px;text-align:left}
  th{background:#12A14B;color:#fff}td.r{text-align:right;font-variant-numeric:tabular-nums}
  tr:nth-child(even) td{background:#F8FAFD}tr.tot td{font-weight:bold;background:#F0F4FA;border-top:2px solid #9AA7C4}
  thead{display:table-header-group}
  .bar{position:sticky;top:0;background:#fff;padding:10px 0;display:flex;gap:10px;align-items:center}
  .bar button{background:#12A14B;color:#fff;border:0;border-radius:9px;padding:10px 22px;font-size:14px;font-weight:bold;cursor:pointer}
  .bar span{color:#66748C;font-size:12px}
  @media print{.bar{display:none}body{margin:0}}
  </style></head><body>
  <div class="bar"><button onclick="window.print()">Print</button><span>or press Ctrl+P - close this tab when done</span></div>
  <h1>${esc(meta.company)}</h1><h2>${esc(rep.title)}</h2>
  <p class="meta">${esc(rep.subtitle)} - Generated ${esc(today)} - ${esc(meta.phone)} - ${esc(meta.email)}</p>
  ${htmlTable(rep)}
  <script>window.addEventListener("load",function(){setTimeout(function(){window.print()},350)});</script>
  </body></html>`;
}

export function exportResponse(format: string, rep: RepX, meta: RepMeta, today: string, plainXlsx = false): Response {
  if (format === "xlsx") {
    return new Response(new Uint8Array(renderXlsx(rep, meta, plainXlsx)), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${rep.file}.xlsx"`,
    } });
  }
  if (format === "pdf") {
    return new Response(new Uint8Array(renderPdf(rep, meta, today)), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${rep.file}.pdf"`,
    } });
  }
  if (format === "doc") {
    return new Response(renderDoc(rep, meta), { headers: {
      "Content-Type": "application/msword",
      "Content-Disposition": `attachment; filename="${rep.file}.doc"`,
    } });
  }
  return new Response(renderPrint(rep, meta, today), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
