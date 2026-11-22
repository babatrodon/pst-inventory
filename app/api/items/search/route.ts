import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";
import { normCode } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json([], { status: 401 });
  const sp = req.nextUrl.searchParams;
  const norm = sp.get("norm");
  if (norm != null) {
    const rows = await prisma.item.findMany({
      where: { codeNorm: normCode(norm) }, take: 5,
      select: { id: true, code: true, name: true, category: true, stockCached: true },
    });
    return NextResponse.json(rows.map(r => ({ id: r.id, code: r.code, name: r.name, category: r.category, stock: Number(r.stockCached) })));
  }
  const q = (sp.get("q") || "").trim();
  const rows = await prisma.item.findMany({
    where: q ? { OR: [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
    ] } : {},
    orderBy: [{ code: "asc" }], take: 30,
    select: { id: true, code: true, name: true, brand: true, category: true, stockCached: true, cost: true },
  });
  return NextResponse.json(rows.map(r => ({
    id: r.id, code: r.code, name: r.name, brand: r.brand, category: r.category,
    stock: Number(r.stockCached), cost: Number(r.cost),
  })));
}
