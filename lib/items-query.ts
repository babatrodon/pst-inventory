import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type ItemsParams = {
  q?: string; brand?: string; cat?: string; status?: string; sort?: string; page?: number;
};
export type ItemRow = {
  id: string; code: string; name: string; brand: string; category: string; unit: string;
  cost: number; listPrice: number | null; discountPct: number | null;
  minStock: number; openingQty: number; stock: number; value: number; status: "ok" | "low" | "out";
};

const PAGE = 50;

export async function fetchItemsPage(p: ItemsParams, defMin: number) {
  const q = (p.q || "").trim();
  const effMin = Prisma.sql`(CASE WHEN i."minStock" > 0 THEN i."minStock" ELSE ${defMin} END)`;
  const conds: Prisma.Sql[] = [Prisma.sql`1=1`];
  if (p.brand) conds.push(Prisma.sql`i."brand" = ${p.brand}`);
  if (p.cat) conds.push(Prisma.sql`i."category" = ${p.cat}`);
  if (q) conds.push(Prisma.sql`(i."code" ILIKE ${"%" + q + "%"} OR i."name" ILIKE ${"%" + q + "%"})`);
  const base = Prisma.join(conds, " AND ");
  const statusCond =
    p.status === "out" ? Prisma.sql` AND i."stockCached" <= 0`
    : p.status === "low" ? Prisma.sql` AND i."stockCached" > 0 AND ${effMin} > 0 AND i."stockCached" <= ${effMin}`
    : p.status === "ok" ? Prisma.sql` AND i."stockCached" > 0 AND (${effMin} <= 0 OR i."stockCached" > ${effMin})`
    : Prisma.empty;
  const order =
    p.sort === "name" ? Prisma.sql`NULLIF(i."name",'') NULLS LAST, i."code"`
    : p.sort === "qty_desc" ? Prisma.sql`i."stockCached" DESC`
    : p.sort === "qty_asc" ? Prisma.sql`i."stockCached" ASC`
    : p.sort === "value_desc" ? Prisma.sql`(i."stockCached"*i."cost") DESC`
    : Prisma.sql`NULLIF(i."code",'') NULLS LAST, i."name"`;
  const page = Math.max(1, p.page || 1);

  const [counts] = await prisma.$queryRaw<{ all: number; ok: number; low: number; out: number }[]>(
    Prisma.sql`SELECT COUNT(*)::int "all",
      COUNT(*) FILTER (WHERE i."stockCached" > 0 AND (${effMin} <= 0 OR i."stockCached" > ${effMin}))::int ok,
      COUNT(*) FILTER (WHERE i."stockCached" > 0 AND ${effMin} > 0 AND i."stockCached" <= ${effMin})::int low,
      COUNT(*) FILTER (WHERE i."stockCached" <= 0)::int out
      FROM "item" i WHERE ${base}`);
  const [tot] = await prisma.$queryRaw<{ n: number; units: number; value: number }[]>(
    Prisma.sql`SELECT COUNT(*)::int n, COALESCE(SUM(i."stockCached"),0)::float8 units,
      COALESCE(SUM(i."stockCached"*i."cost"),0)::float8 value
      FROM "item" i WHERE ${base}${statusCond}`);
  const raw = await prisma.$queryRaw<Record<string, unknown>[]>(
    Prisma.sql`SELECT i.id, i.code, i.name, i.brand, i.category, i.unit,
      i."cost"::float8 cost, i."listPrice"::float8 "listPrice", i."discountPct"::float8 "discountPct",
      i."minStock"::float8 "minStock", i."openingQty"::float8 "openingQty",
      i."stockCached"::float8 stock, (i."stockCached"*i."cost")::float8 value,
      CASE WHEN i."stockCached" <= 0 THEN 'out'
           WHEN ${effMin} > 0 AND i."stockCached" <= ${effMin} THEN 'low' ELSE 'ok' END status
      FROM "item" i WHERE ${base}${statusCond}
      ORDER BY ${order} LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`);
  const rows = raw as unknown as ItemRow[];
  return { rows, counts, totals: tot, page, pages: Math.max(1, Math.ceil(tot.n / PAGE)) };
}

export async function brandAndCategoryLists() {
  const b = await prisma.$queryRaw<{ v: string }[]>`SELECT DISTINCT "brand" v FROM "item" ORDER BY 1`;
  const c = await prisma.$queryRaw<{ v: string }[]>`SELECT DISTINCT "category" v FROM "item" ORDER BY 1`;
  return { brands: b.map(x => x.v), cats: c.map(x => x.v) };
}
