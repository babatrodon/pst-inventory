import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const rows = await prisma.item.findMany({
    where: {
      ...(sp.get("brand") ? { brand: sp.get("brand")! } : {}),
      ...(sp.get("cat") ? { category: sp.get("cat")! } : {}),
      ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: [{ code: "asc" }],
  });
  const aoa = [
    ["ITEM CODE", "DESCRIPTION", "BRAND", "CATEGORY", "OPENING QTY", "CURRENT STOCK", "UNIT COST", "LIST PRICE", "DISCOUNT %", "MIN STOCK", "UNIT", "STOCK VALUE"],
    ...rows.map(it => [it.code, it.name, it.brand, it.category, Number(it.openingQty), Number(it.stockCached),
      Number(it.cost), it.listPrice ? Number(it.listPrice) : "", it.discountPct ? Number(it.discountPct) : "",
      Number(it.minStock), it.unit, +(Number(it.stockCached) * Number(it.cost)).toFixed(2)]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = aoa[0].map(h => ({ wch: Math.max(12, String(h).length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Items");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="PST-Items-${todayStr()}.xlsx"`,
  } });
}
