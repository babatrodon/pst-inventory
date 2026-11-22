import { PrismaClient, Prisma } from "@prisma/client";
import { auth } from "../lib/auth";
import { normCode } from "../lib/utils";
import items from "./seed-items.json";

const prisma = new PrismaClient();

async function main() {
  const n = await prisma.item.count();
  if (n === 0) {
    const data: Prisma.ItemCreateManyInput[] = (items as {
      code: string; name: string; brand: string; category: string; unit: string;
      cost: number; listPrice: number | null; discountPct: number | null; minStock: number; openingQty: number;
    }[]).map(it => ({
      code: it.code, codeNorm: normCode(it.code), name: it.name, brand: it.brand, category: it.category,
      unit: it.unit || "PCS",
      cost: new Prisma.Decimal(it.cost || 0),
      listPrice: it.listPrice != null ? new Prisma.Decimal(it.listPrice) : null,
      discountPct: it.discountPct != null ? new Prisma.Decimal(it.discountPct) : null,
      minStock: new Prisma.Decimal(it.minStock || 0),
      openingQty: new Prisma.Decimal(it.openingQty || 0),
      stockCached: new Prisma.Decimal(it.openingQty || 0),
    }));
    for (let i = 0; i < data.length; i += 500) {
      await prisma.item.createMany({ data: data.slice(i, i + 500) });
    }
    console.log(`Seeded ${data.length} items.`);
  } else {
    console.log(`Items already present (${n}), skipping item seed.`);
  }
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD, name = process.env.ADMIN_NAME || "Admin";
  if (email && password) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (!exists) {
      const res = await auth.api.signUpEmail({ body: { name, email, password } });
      if (res.user) {
        await prisma.user.update({ where: { id: res.user.id }, data: { role: "admin" } });
        console.log(`Admin created: ${email}`);
      }
    } else console.log("Admin already exists.");
  }
  const [agg] = await prisma.$queryRaw<{ n: number; u: number; v: number }[]>`
    SELECT COUNT(*)::int n, COALESCE(SUM("stockCached"),0)::float8 u, COALESCE(SUM("stockCached"*"cost"),0)::float8 v FROM "item"`;
  console.log(`DB now: ${agg.n} items, ${agg.u} units, value ${agg.v.toFixed(2)}`);
}

main().finally(() => prisma.$disconnect());
