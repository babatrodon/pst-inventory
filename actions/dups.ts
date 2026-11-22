"use server";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { normCode } from "@/lib/utils";

export type DupGroup = {
  same: boolean;
  items: { id: string; code: string; name: string; brand: string; category: string; stock: number; cost: number }[];
};

export async function scanDups(): Promise<DupGroup[]> {
  await assertAdmin();
  const rows = await prisma.$queryRaw<{
    id: string; code: string; name: string; brand: string; category: string;
    stock: number; cost: number; cn: string;
  }[]>`
    SELECT id, code, name, brand, category, "stockCached"::float8 stock, "cost"::float8 cost, "codeNorm" cn
    FROM "item" WHERE "codeNorm" <> '' AND "codeNorm" IN (
      SELECT "codeNorm" FROM "item" WHERE "codeNorm" <> '' GROUP BY "codeNorm" HAVING COUNT(*) > 1)
    ORDER BY "codeNorm", name`;
  const by = new Map<string, typeof rows>();
  for (const r of rows) { if (!by.has(r.cn)) by.set(r.cn, []); by.get(r.cn)!.push(r); }
  const nn = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return [...by.values()]
    .map(v => ({ same: new Set(v.map(x => nn(x.name))).size === 1,
      items: v.map(({ cn: _cn, ...x }) => x) }))
    .sort((a, b) => b.items.length - a.items.length);
}

export async function mergeGroups(groups: string[][]) {
  await assertAdmin();
  let removed = 0;
  for (const ids of groups) {
    if (ids.length < 2) continue;
    const items = await prisma.item.findMany({ where: { id: { in: ids } } });
    if (items.length < 2) continue;
    const surv = items.reduce((a, b) => (b.name.length > a.name.length ? b : a), items[0]);
    let sq = 0, sv = 0, open = 0;
    for (const x of items) { const q = Number(x.stockCached); sq += q; sv += q * Number(x.cost); open += Number(x.openingQty); }
    const cost = sq > 0 ? +(sv / sq).toFixed(4) : Math.max(0, ...items.map(x => Number(x.cost)));
    const mode = (arr: string[]) => { const c: Record<string, number> = {}; let best = arr[0];
      for (const v of arr) { c[v] = (c[v] || 0) + 1; if (c[v] > (c[best] || 0)) best = v; } return best; };
    const others = items.filter(x => x.id !== surv.id).map(x => x.id);
    await prisma.$transaction([
      prisma.movement.updateMany({ where: { itemId: { in: others } }, data: { itemId: surv.id } }),
      prisma.item.update({ where: { id: surv.id }, data: {
        cost: new Prisma.Decimal(cost),
        openingQty: new Prisma.Decimal(open),
        stockCached: new Prisma.Decimal(sq),
        minStock: new Prisma.Decimal(Math.max(0, ...items.map(x => Number(x.minStock)))),
        brand: mode(items.map(x => x.brand)), category: mode(items.map(x => x.category)),
      } }),
      prisma.item.deleteMany({ where: { id: { in: others } } }),
    ]);
    removed += others.length;
  }
  ["/", "/items", "/movements", "/settings"].forEach(p => revalidatePath(p));
  return { ok: true as const, removed };
}

export async function makeUnique(ids: string[]) {
  await assertAdmin();
  const items = await prisma.item.findMany({ where: { id: { in: ids } }, orderBy: { name: "asc" } });
  const used = new Set((await prisma.item.findMany({ select: { codeNorm: true } })).map(x => x.codeNorm));
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  items.forEach((x, i) => {
    if (i === 0) return;
    const tag = x.name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 18) || `V${i + 1}`;
    let nc = `${x.code.trim()}-${tag}`.slice(0, 40); let n = 2;
    while (used.has(normCode(nc))) { nc = `${x.code.trim()}-${tag}-${n}`.slice(0, 40); n++; }
    used.add(normCode(nc));
    ops.push(prisma.item.update({ where: { id: x.id }, data: { code: nc, codeNorm: normCode(nc) } }));
  });
  if (ops.length) await prisma.$transaction(ops);
  ["/", "/items", "/settings"].forEach(p => revalidatePath(p));
  return { ok: true as const };
}
