"use server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { assertUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { normCode } from "@/lib/utils";

const Row = z.object({
  code: z.string().max(60).default(""),
  name: z.string().max(240).default(""),
  brand: z.string().max(80).default(""),
  category: z.string().max(100).default(""),
  qty: z.coerce.number().default(0),
  cost: z.coerce.number().min(0).default(0),
  listPrice: z.union([z.coerce.number(), z.literal("")]).optional(),
  discountPct: z.union([z.coerce.number(), z.literal("")]).optional(),
  minStock: z.union([z.coerce.number(), z.literal("")]).optional(),
  unit: z.string().max(20).optional(),
});
const Input = z.object({
  rows: z.array(Row).max(5000),
  brand: z.string().max(80).default(""),
  category: z.string().max(100).default(""),
  mode: z.enum(["add", "set"]),
  fname: z.string().max(200).default("Import"),
});

export async function applyImport(input: unknown) {
  const user = await assertUser();
  const d = Input.parse(input);
  const existing = await prisma.item.findMany({
    select: { id: true, codeNorm: true, name: true, cost: true, stockCached: true },
  });
  const byBoth = new Map<string, typeof existing[number]>();
  const byCode = new Map<string, typeof existing[number][]>();
  for (const it of existing) {
    byBoth.set(it.codeNorm + "|" + it.name.trim().toUpperCase(), it);
    if (!byCode.has(it.codeNorm)) byCode.set(it.codeNorm, []);
    byCode.get(it.codeNorm)!.push(it);
  }
  const stockNow = new Map(existing.map(it => [it.id, Number(it.stockCached)]));
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const num = (v: unknown) => { const n = Number(v); return isNaN(n) ? null : n; };

  type Mv = { id: string; itemId: string; type: "IN" | "ADJ_IN" | "ADJ_OUT"; qty: Prisma.Decimal; unitCost: Prisma.Decimal; date: Date; ref: string; note: string; userId: string };
  const creates: Prisma.ItemCreateManyInput[] = [];
  const moves: Mv[] = [];
  const updates = new Map<string, { fields: Prisma.ItemUpdateInput; delta: number }>();
  let added = 0, updated = 0;

  for (const r of d.rows) {
    const code = r.code.trim(), name = r.name.trim();
    if (!code && !name) continue;
    const qty = Number(r.qty) || 0;
    const cost = Number(r.cost) || 0;
    const cn = normCode(code);
    let it = byBoth.get(cn + "|" + name.toUpperCase()) || null;
    if (!it && code) { const c = byCode.get(cn); if (c && c.length === 1) it = c[0]; }
    if (it) {
      const u = updates.get(it.id) ?? { fields: {}, delta: 0 };
      if (cost > 0) u.fields.cost = new Prisma.Decimal(cost);
      if (d.brand) u.fields.brand = d.brand;
      if (d.category) u.fields.category = d.category;
      if (num(r.listPrice) != null) u.fields.listPrice = new Prisma.Decimal(num(r.listPrice)!);
      if (num(r.discountPct) != null) u.fields.discountPct = new Prisma.Decimal(num(r.discountPct)!);
      if (num(r.minStock) != null) u.fields.minStock = new Prisma.Decimal(num(r.minStock)!);
      const cur = stockNow.get(it.id) ?? 0;
      const effCost = cost > 0 ? cost : Number(it.cost);
      if (d.mode === "set") {
        const delta = qty - cur;
        if (delta !== 0) {
          moves.push({ id: randomUUID(), itemId: it.id, type: delta > 0 ? "ADJ_IN" : "ADJ_OUT",
            qty: new Prisma.Decimal(Math.abs(delta)), unitCost: new Prisma.Decimal(effCost),
            date: today, ref: d.fname, note: "Import: set quantity", userId: user.id });
          u.delta += delta; stockNow.set(it.id, qty);
        }
      } else if (qty > 0) {
        moves.push({ id: randomUUID(), itemId: it.id, type: "IN",
          qty: new Prisma.Decimal(qty), unitCost: new Prisma.Decimal(effCost),
          date: today, ref: d.fname, note: "Import", userId: user.id });
        u.delta += qty; stockNow.set(it.id, cur + qty);
      }
      updates.set(it.id, u); updated++;
    } else {
      const id = "imp" + randomUUID().replace(/-/g, "");
      const opening = d.mode === "set" ? qty : 0;
      creates.push({
        id, code, codeNorm: cn, name,
        brand: d.brand || r.brand.trim() || "Other",
        category: d.category || r.category.trim() || "Uncategorized",
        unit: (r.unit || "PCS").trim() || "PCS",
        cost: new Prisma.Decimal(cost),
        listPrice: num(r.listPrice) != null ? new Prisma.Decimal(num(r.listPrice)!) : null,
        discountPct: num(r.discountPct) != null ? new Prisma.Decimal(num(r.discountPct)!) : null,
        minStock: new Prisma.Decimal(num(r.minStock) ?? 0),
        openingQty: new Prisma.Decimal(opening),
        stockCached: new Prisma.Decimal(d.mode === "set" ? qty : qty),
      });
      if (d.mode === "add" && qty > 0) {
        moves.push({ id: randomUUID(), itemId: id, type: "IN",
          qty: new Prisma.Decimal(qty), unitCost: new Prisma.Decimal(cost),
          date: today, ref: d.fname, note: "Import", userId: user.id });
      }
      const rec = { id, codeNorm: cn, name, cost: new Prisma.Decimal(cost), stockCached: new Prisma.Decimal(qty) };
      byBoth.set(cn + "|" + name.toUpperCase(), rec);
      if (!byCode.has(cn)) byCode.set(cn, []);
      byCode.get(cn)!.push(rec);
      stockNow.set(id, qty);
      added++;
    }
  }
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  if (creates.length) ops.push(prisma.item.createMany({ data: creates }));
  if (moves.length) ops.push(prisma.movement.createMany({ data: moves }));
  for (const [id, u] of updates) {
    ops.push(prisma.item.update({ where: { id }, data: {
      ...u.fields, ...(u.delta !== 0 ? { stockCached: { increment: new Prisma.Decimal(u.delta) } } : {}),
    } }));
  }
  await prisma.$transaction(ops);
  ["/", "/items", "/movements", "/reports", "/settings"].forEach(p => revalidatePath(p));
  return { ok: true as const, added, updated };
}
