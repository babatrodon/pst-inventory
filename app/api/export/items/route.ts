import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { todayStr, qf, statusOf, STATUS_LBL } from "@/lib/utils";
import { exportResponse, type RepMeta, type RepX } from "@/lib/export-render";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const brand = sp.get("brand") || "";
  const cat = sp.get("cat") || "";
  const status = sp.get("status") || "";
  const format = sp.get("format") || "xlsx";

  const settings = await prisma.settings.findFirst();
  const defMin = Number(settings?.defMin ?? 0);
  const meta: RepMeta = {
    company: settings?.company || "Power Source Trading Est.",
    phone: settings?.phone || "", email: settings?.email || "", address: settings?.address || "",
  };
  const found = await prisma.item.findMany({
    where: {
      ...(brand ? { brand } : {}),
      ...(cat ? { category: cat } : {}),
      ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: [{ code: "asc" }],
  });
  const items = found
    .map(it => ({ ...it, stock: Number(it.stockCached), st: statusOf(Number(it.stockCached), Number(it.minStock), defMin) }))
    .filter(it => !status || it.st === status);

  const today = todayStr();
  const parts: string[] = [];
  if (brand) parts.push(`Brand: ${brand}`);
  if (cat) parts.push(`Category: ${cat}`);
  if (q) parts.push(`Search: "${q}"`);
  if (status) parts.push(STATUS_LBL[status]?.[1] || status);
  const scope = parts.length ? parts.join(" - ") : "All items";
  const totalUnits = items.reduce((a, x) => a + x.stock, 0);

  if (format === "xlsx") {
    const rep: RepX = {
      title: "Items", subtitle: scope,
      cols: ["ITEM CODE", "DESCRIPTION", "BRAND", "CATEGORY", "QTY", "MIN STOCK", "UNIT"],
      aligns: ["l", "l", "l", "l", "r", "r", "l"],
      rows: items.map(it => [it.code, it.name, it.brand, it.category, it.stock, Number(it.minStock), it.unit]),
      foots: [], file: `PST-Items-${today}`,
    };
    return exportResponse("xlsx", rep, meta, today, true);
  }
  const rep: RepX = {
    title: "Stock List", subtitle: `${scope} - ${items.length} items`,
    cols: ["Code", "Description", "Brand", "Category", "Stock", "Unit", "Status"],
    aligns: ["l", "l", "l", "l", "r", "l", "l"],
    rows: items.map(it => [it.code, it.name, it.brand, it.category, qf(it.stock), it.unit, STATUS_LBL[it.st][1]]),
    foots: [["TOTAL", "", "", "", qf(totalUnits), "", ""]],
    file: `stock-list-${today}`,
  };
  return exportResponse(format, rep, meta, today);
}
