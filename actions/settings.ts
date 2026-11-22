"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertAdmin } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const SettingsSchema = z.object({
  company: z.string().min(1).max(120),
  phone: z.string().max(120).default(""),
  email: z.string().max(120).default(""),
  address: z.string().max(200).default(""),
  currency: z.string().min(1).max(10),
  defMin: z.coerce.number().min(0).default(0),
});
export async function updateSettings(input: unknown) {
  await assertAdmin();
  const d = SettingsSchema.parse(input);
  await prisma.settings.upsert({ where: { id: 1 },
    update: { ...d, defMin: new Prisma.Decimal(d.defMin) },
    create: { id: 1, ...d, defMin: new Prisma.Decimal(d.defMin) } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

const NewUser = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["admin", "staff"]),
});
export async function createUser(input: unknown) {
  await assertAdmin();
  const d = NewUser.parse(input);
  const email = d.email.trim().toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error("A user with this email already exists");
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(d.password);
  const id = crypto.randomUUID();
  await prisma.$transaction([
    prisma.user.create({ data: { id, name: d.name.trim(), email, emailVerified: true, role: d.role } }),
    prisma.account.create({ data: { id: crypto.randomUUID(), userId: id, providerId: "credential", accountId: id, password: hash } }),
  ]);
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function setUserRole(userId: string, role: "admin" | "staff") {
  const me = await assertAdmin();
  if (me.id === userId) throw new Error("Change your own role from another admin account");
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function resetPassword(userId: string, password: string) {
  await assertAdmin();
  z.string().min(8).max(100).parse(password);
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  await ctx.internalAdapter.updatePassword(userId, hash);
  await prisma.session.deleteMany({ where: { userId } });
  return { ok: true as const };
}

export async function deleteUser(userId: string) {
  const me = await assertAdmin();
  if (me.id === userId) throw new Error("You are signed in with this account");
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function dangerReset(mode: "movements" | "all") {
  await assertAdmin();
  if (mode === "movements") {
    await prisma.$transaction([
      prisma.movement.deleteMany({}),
      prisma.$executeRaw`UPDATE "item" SET "stockCached" = "openingQty"`,
    ]);
  } else {
    await prisma.$transaction([prisma.movement.deleteMany({}), prisma.item.deleteMany({})]);
  }
  ["/", "/items", "/movements", "/reports", "/settings"].forEach(p => revalidatePath(p));
  return { ok: true as const };
}
