"use server";
import { prisma } from "@/lib/prisma";
import { assertUser, assertAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { normCode } from "@/lib/utils";

function refreshAll() {
  ["/", "/items", "/movements", "/reports", "/settings"].forEach(p => revalidatePath(p));
}

const ItemSchema = z.object({
  id: z.string().optional(),
  code: z.string().max(60).default(""),
  name: z.string().max(240).default(""),
  brand: z.string().max(80).default("Other"),
  category: z.string().max(100).default("Uncategorized"),
  unit: z.string().max(20).default("PCS"),
  cost: z.coerce.number().min(0),
  listPrice: z.coerce.number().min(0).nullable().optional(),
  discountPct: z.coerce.number().min(0).max(100).nullable().optional(),
  minStock: z.coerce.number().min(0).default(0),
  openingQty: z.coerce.number().default(0),
}).refine(d => d.code.trim() || d.name.trim(), { message: "Code or description required" });

export async function upsertItem(input: unknown) {
  await assertUser();
  const d = ItemSchema.parse(input);
  const data = {
    code: d.code.trim(), codeNorm: normCode(d.code),
    name: d.name.trim(), brand: d.brand.trim() || "Other", category: d.category.trim() || "Uncategorized",
    unit: d.unit.trim() || "PCS",
    cost: new Prisma.Decimal(d.cost),
    listPrice: d.listPrice != null ? new Prisma.Decimal(d.listPrice) : null,
    discountPct: d.discountPct != null ? new Prisma.Decimal(d.discountPct) : null,
    minStock: new Prisma.Decimal(d.minStock),
  };
  if (d.id) {
    const prev = await prisma.item.findUniqueOrThrow({ where: { id: d.id } });
    const openDelta = new Prisma.Decimal(d.openingQty).minus(prev.openingQty);
    await prisma.item.update({ where: { id: d.id }, data: {
      ...data, openingQty: new Prisma.Decimal(d.openingQty),
      stockCached: { increment: openDelta },
    } });
  } else {
    await prisma.item.create({ data: {
      ...data, openingQty: new Prisma.Decimal(d.openingQty), stockCached: new Prisma.Decimal(d.openingQty),
    } });
  }
  refreshAll();
  return { ok: true as const };
}

export async function deleteItems(ids: string[]) {
  await assertAdmin();
  const list = z.array(z.string()).min(1).parse(ids);
  await prisma.item.deleteMany({ where: { id: { in: list } } });
  refreshAll();
  return { ok: true as const, n: list.length };
}

export async function bulkSetField(ids: string[], field: "brand" | "category", value: string) {
  await assertAdmin();
  const list = z.array(z.string()).min(1).parse(ids);
  const v = z.string().min(1).max(100).parse(value.trim());
  await prisma.item.updateMany({ where: { id: { in: list } }, data: field === "brand" ? { brand: v } : { category: v } });
  refreshAll();
  return { ok: true as const, n: list.length };
}

export async function recomputeStock() {
  await assertAdmin();
  await prisma.$executeRaw`
    UPDATE "item" i SET "stockCached" = i."openingQty" + COALESCE(m.s, 0)
    FROM (SELECT "itemId", SUM(CASE WHEN "type" IN ('IN','ADJ_IN') THEN "qty" ELSE -"qty" END) s
          FROM "movement" GROUP BY "itemId") m
    WHERE m."itemId" = i.id`;
  await prisma.$executeRaw`
    UPDATE "item" i SET "stockCached" = i."openingQty"
    WHERE NOT EXISTS (SELECT 1 FROM "movement" mv WHERE mv."itemId" = i.id)`;
  refreshAll();
  return { ok: true as const };
}
