import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildMonthly, buildHistoryLog, buildStockToday, type Rep } from "@/lib/reports";
import { exportResponse, type RepMeta } from "@/lib/export-render";
import { thisMonth, todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const settings = await prisma.settings.findFirst();
  const meta: RepMeta = {
    company: settings?.company || "Power Source Trading Est.",
    phone: settings?.phone || "", email: settings?.email || "", address: settings?.address || "",
  };
  const type = sp.get("type");
  let rep: Rep;
  if (type === "monthly") rep = await buildMonthly(sp.get("month") || thisMonth(), sp.get("brand") || "");
  else if (type === "history") rep = await buildHistoryLog(sp.get("from") || "", sp.get("to") || "", sp.get("mtype") || "");
  else if (type === "valuation") rep = await buildStockToday(sp.get("brand") || "", todayStr());
  else return NextResponse.json({ error: "Unknown report" }, { status: 400 });

  const format = sp.get("format");
  if (!format || format === "json") {
    return NextResponse.json({ rep, company: meta.company, phone: meta.phone, email: meta.email, address: meta.address });
  }
  return exportResponse(format, rep, meta, todayStr());
}
