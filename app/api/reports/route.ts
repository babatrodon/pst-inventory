import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildMonthly, buildHistoryLog, buildStockToday, type Rep } from "@/lib/reports";
import { thisMonth, todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const settings = await prisma.settings.findFirst();
  const type = sp.get("type");
  let rep: Rep;
  if (type === "monthly") rep = await buildMonthly(sp.get("month") || thisMonth(), sp.get("brand") || "");
  else if (type === "history") rep = await buildHistoryLog(sp.get("from") || "", sp.get("to") || "", sp.get("mtype") || "");
  else if (type === "valuation") rep = await buildStockToday(sp.get("brand") || "", todayStr());
  else return NextResponse.json({ error: "Unknown report" }, { status: 400 });

  if (sp.get("format") === "xlsx") {
    const aoa = [[settings?.company || ""], [`${rep.title} · ${rep.subtitle}`], [], rep.cols, ...rep.rows, ...rep.foots];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = rep.cols.map((c, i) => ({
      wch: Math.min(42, Math.max(c.length + 2, ...rep.rows.slice(0, 200).map(r => String(r[i] || "").length + 2), 10)),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, rep.title.slice(0, 31));
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buf), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${rep.file}.xlsx"`,
    } });
  }
  return NextResponse.json({ rep, company: settings?.company, phone: settings?.phone, email: settings?.email, address: settings?.address });
}
