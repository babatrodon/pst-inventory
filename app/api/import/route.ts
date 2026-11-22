import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type ImportRow = {
  code: string; name: string; brand: string; category: string;
  qty: number | string; cost: number | string;
  listPrice?: number | string; discountPct?: number | string; minStock?: number | string; unit?: string;
};

function parseExcel(buf: ArrayBuffer): ImportRow[] {
  const wbk = XLSX.read(buf);
  const ws = wbk.Sheets[wbk.SheetNames[0]];
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const hi = aoa.findIndex(r => r.some(c => /CODE|PART/i.test(String(c))));
  if (hi < 0) throw new Error("No header row with ITEM CODE / PART found");
  const H = aoa[hi].map(h => String(h).toUpperCase());
  const col = (re: RegExp) => H.findIndex(h => re.test(h));
  const ix = {
    code: col(/CODE|PART/), name: col(/DESC|NAME/), brand: col(/BRAND/), cat: col(/CATEG/),
    qty: col(/QTY|QUANTITY|STOCK|OPENING/), cost: col(/UNIT COST|U\.?PRICE|^COST/), list: col(/LIST/),
    disc: col(/DISC/), min: col(/MIN/), unit: col(/^UNIT$/),
  };
  const rows: ImportRow[] = [];
  for (let r = hi + 1; r < aoa.length; r++) {
    const row = aoa[r];
    const g = (k: keyof typeof ix) => (ix[k] >= 0 ? row[ix[k]] : "");
    const code = String(g("code")).trim(), name = String(g("name")).trim();
    if (!code && !name) continue;
    if (/^TOTAL/i.test(code) || /^TOTAL/i.test(name)) continue;
    const num = (k: keyof typeof ix) => { const v = parseFloat(String(g(k)).replace(/,/g, "")); return isNaN(v) ? "" : v; };
    rows.push({ code, name, brand: String(g("brand")).trim(), category: String(g("cat")).trim(),
      qty: num("qty") === "" ? 0 : num("qty"), cost: num("cost") === "" ? 0 : num("cost"),
      listPrice: num("list"), discountPct: num("disc"), minStock: num("min"),
      unit: String(g("unit")).trim() || "PCS" });
  }
  return rows;
}

async function parsePdf(buf: ArrayBuffer): Promise<ImportRow[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, useSystemFonts: true }).promise;
  const rows: ImportRow[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const lines: Record<number, { x: number; s: string }[]> = {};
    for (const t of tc.items as { transform: number[]; str: string }[]) {
      const y = Math.round(t.transform[5] / 2) * 2;
      (lines[y] ||= []).push({ x: t.transform[4], s: t.str });
    }
    const ys = Object.keys(lines).map(Number).sort((a, b) => b - a);
    for (const y of ys) {
      const parts = lines[y].sort((a, b) => a.x - b.x).map(t => t.s).join(" ").trim().split(/\s+/).filter(Boolean);
      let ci = -1;
      for (let i = 0; i < parts.length; i++) {
        const t = parts[i];
        if (/^[A-Z0-9][A-Z0-9\-/.]{3,}$/i.test(t) && /[A-Z]/i.test(t) && /\d/.test(t) && !/%$/.test(t)) { ci = i; break; }
      }
      if (ci < 0) continue;
      const code = parts[ci];
      const nums: string[] = [], words: string[] = [];
      for (let i = ci + 1; i < parts.length; i++) {
        const raw = parts[i], t = raw.replace(/,/g, "");
        if (/^\d+(\.\d+)?%?$/.test(t)) nums.push(t); else words.push(raw);
      }
      const plain = nums.filter(t => !t.endsWith("%")).map(parseFloat);
      if (!plain.length) continue;
      let qty = 0;
      for (const v of plain) if (Number.isInteger(v) && v > 0 && v < 1_000_000) { qty = v; break; }
      let cost = 0;
      if (plain.length >= 3) cost = plain[plain.length - 2];
      else if (plain.length === 2) cost = plain[1];
      else cost = plain[0] === qty ? 0 : plain[0];
      rows.push({ code, name: words.join(" "), brand: "", category: "", qty, cost, unit: "PCS" });
    }
  }
  return rows;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "File too large (15 MB max)" }, { status: 400 });
  const buf = await file.arrayBuffer();
  try {
    const rows = file.name.toLowerCase().endsWith(".pdf") ? await parsePdf(buf) : parseExcel(buf);
    return NextResponse.json({ rows, fname: file.name });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "File not readable" }, { status: 422 });
  }
}
