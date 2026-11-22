"use server";
import { prisma } from "@/lib/prisma";
import { assertUser, assertAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const MoveSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(["IN", "OUT"]),
  qty: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  party: z.string().max(200).default(""),
  ref: z.string().max(200).default(""),
  note: z.string().max(500).default(""),
});

function refreshAll() {
  ["/", "/items", "/movements", "/reports", "/settings"].forEach(p => revalidatePath(p));
}

export async function recordMovement(input: unknown) {
  const user = await assertUser();
  const d = MoveSchema.parse(input);
  const item = await prisma.item.findUniqueOrThrow({ where: { id: d.itemId } });
  const cost = d.type === "OUT" ? Number(item.cost) : (d.unitCost ?? Number(item.cost));
  const signed = d.type === "IN" ? d.qty : -d.qty;
  await prisma.$transaction([
    prisma.movement.create({ data: {
      itemId: d.itemId, type: d.type, qty: new Prisma.Decimal(d.qty),
      unitCost: new Prisma.Decimal(cost), date: new Date(d.date + "T00:00:00Z"),
      party: d.party.trim(), ref: d.ref.trim(), note: d.note.trim(), userId: user.id,
    } }),
    prisma.item.update({ where: { id: d.itemId }, data: {
      stockCached: { increment: new Prisma.Decimal(signed) },
      ...(d.type === "IN" && d.unitCost != null && d.unitCost > 0 ? { cost: new Prisma.Decimal(d.unitCost) } : {}),
    } }),
  ]);
  refreshAll();
  return { ok: true as const };
}

const CountSchema = z.object({
  itemId: z.string().min(1),
  counted: z.coerce.number().min(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).default("Stock count"),
});

export async function applyCount(input: unknown) {
  const user = await assertUser();
  const d = CountSchema.parse(input);
  const item = await prisma.item.findUniqueOrThrow({ where: { id: d.itemId } });
  const delta = d.counted - Number(item.stockCached);
  if (delta === 0) return { ok: true as const, delta: 0 };
  await prisma.$transaction([
    prisma.movement.create({ data: {
      itemId: d.itemId, type: delta > 0 ? "ADJ_IN" : "ADJ_OUT", qty: new Prisma.Decimal(Math.abs(delta)),
      unitCost: item.cost, date: new Date(d.date + "T00:00:00Z"),
      party: "", ref: "", note: d.note.trim(), userId: user.id,
    } }),
    prisma.item.update({ where: { id: d.itemId }, data: { stockCached: { increment: new Prisma.Decimal(delta) } } }),
  ]);
  refreshAll();
  return { ok: true as const, delta };
}

export async function deleteMovement(id: string) {
  await assertAdmin();
  const m = await prisma.movement.findUniqueOrThrow({ where: { id } });
  const signed = m.type === "IN" || m.type === "ADJ_IN" ? m.qty : m.qty.neg();
  await prisma.$transaction([
    prisma.movement.delete({ where: { id } }),
    prisma.item.update({ where: { id: m.itemId }, data: { stockCached: { decrement: signed } } }),
  ]);
  refreshAll();
  return { ok: true as const };
}
