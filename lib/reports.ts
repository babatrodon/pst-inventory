import { prisma } from "./prisma";
import { qf, TYPE_LBL } from "./utils";

export type Rep = {
  title: string; subtitle: string; cols: string[]; aligns: ("l" | "r")[];
  rows: string[][]; foots: string[][]; file: string;
};

const monthName = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};

export async function buildMonthly(ym: string, brand: string): Promise<Rep> {
  const start = new Date(ym + "-01T00:00:00Z");
  const [y, m] = ym.split("-").map(Number);
  const end = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1));
  const rows = await prisma.$queryRaw<{
    code: string; name: string; brand: string; category: string; cost: number;
    opening: number; inn: number; outt: number;
  }[]>`
    SELECT i.code, i.name, i.brand, i.category, i."cost"::float8 cost,
      (i."openingQty" + COALESCE(SUM(CASE WHEN m."date" < ${start}
          THEN (CASE WHEN m."type" IN ('IN','ADJ_IN') THEN m."qty" ELSE -m."qty" END) ELSE 0 END), 0))::float8 opening,
      COALESCE(SUM(CASE WHEN m."date" >= ${start} AND m."date" < ${end} AND m."type" IN ('IN','ADJ_IN') THEN m."qty" ELSE 0 END), 0)::float8 inn,
      COALESCE(SUM(CASE WHEN m."date" >= ${start} AND m."date" < ${end} AND m."type" IN ('OUT','ADJ_OUT') THEN m."qty" ELSE 0 END), 0)::float8 outt
    FROM "item" i LEFT JOIN "movement" m ON m."itemId" = i.id
    WHERE (${brand} = '' OR i."brand" = ${brand})
    GROUP BY i.id
    ORDER BY NULLIF(i.code,'') NULLS LAST, i.name`;
  let tO = 0, tI = 0, tU = 0, tC = 0;
  const out: string[][] = [];
  for (const r of rows) {
    const close = r.opening + r.inn - r.outt;
    if (!r.opening && !r.inn && !r.outt && !close) continue;
    tO += r.opening; tI += r.inn; tU += r.outt; tC += close;
    out.push([r.code, r.name, r.brand, r.category, qf(r.opening), qf(r.inn), qf(r.outt), qf(close)]);
  }
  return {
    title: "Monthly Stock Report",
    subtitle: `${monthName(ym)}${brand ? " · " + brand : " · all brands"}`,
    cols: ["Code", "Description", "Brand", "Category", "Opening", "In", "Out", "Closing"],
    aligns: ["l", "l", "l", "l", "r", "r", "r", "r"],
    rows: out,
    foots: [["TOTAL", "", "", "", qf(tO), qf(tI), qf(tU), qf(tC)]],
    file: `stock-report-${ym}`,
  };
}

export async function buildHistoryLog(from: string, to: string, type: string): Promise<Rep> {
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (from) where.date = { gte: new Date(from + "T00:00:00Z") };
  if (to) where.date = { ...(where.date as object || {}), lte: new Date(to + "T00:00:00Z") };
  const rows = await prisma.movement.findMany({
    where, orderBy: [{ date: "asc" }, { createdAt: "asc" }], take: 5000,
    include: { item: { select: { code: true, name: true } }, user: { select: { name: true } } },
  });
  let ti = 0, to2 = 0;
  const out = rows.map(m => {
    const s = m.type === "IN" || m.type === "ADJ_IN" ? Number(m.qty) : -Number(m.qty);
    if (s > 0) ti += Number(m.qty); else to2 += Number(m.qty);
    return [m.date.toISOString().slice(0, 10), TYPE_LBL[m.type], m.item.code, m.item.name,
      (s >= 0 ? "+" : "−") + qf(Math.abs(s)), m.party, m.ref, m.user?.name || ""];
  });
  return {
    title: "Stock History Log",
    subtitle: `${from || "start"} to ${to || "today"}${type ? " · " + TYPE_LBL[type] : ""}`,
    cols: ["Date", "Type", "Code", "Description", "Qty", "By / From", "Ref", "User"],
    aligns: ["l", "l", "l", "l", "r", "l", "l", "l"],
    rows: out,
    foots: [["TOTAL", "", "", "", `+${qf(ti)} / −${qf(to2)}`, "", "", ""]],
    file: `history-log-${from || "all"}`,
  };
}

export async function buildStockToday(brand: string, today: string): Promise<Rep> {
  const rows = await prisma.$queryRaw<{
    code: string; name: string; brand: string; category: string; stock: number;
  }[]>`
    SELECT code, name, brand, category, "stockCached"::float8 stock
    FROM "item"
    WHERE "stockCached" <> 0 AND (${brand} = '' OR "brand" = ${brand})
    ORDER BY NULLIF(code,'') NULLS LAST, name`;
  let tu = 0;
  const out = rows.map(r => { tu += r.stock;
    return [r.code, r.name, r.brand, r.category, qf(r.stock)]; });
  return {
    title: "Stock Count Today",
    subtitle: `As of ${today}${brand ? " · " + brand : " · all brands"}`,
    cols: ["Code", "Description", "Brand", "Category", "Stock"],
    aligns: ["l", "l", "l", "l", "r"],
    rows: out,
    foots: [["TOTAL", "", "", "", qf(tu)]],
    file: `stock-count-${today}`,
  };
}
