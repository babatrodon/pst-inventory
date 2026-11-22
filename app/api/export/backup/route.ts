import { NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const [items, movements, settings] = await Promise.all([
    prisma.item.findMany(), prisma.movement.findMany(), prisma.settings.findFirst(),
  ]);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), items, movements, settings });
  return new NextResponse(body, { headers: {
    "Content-Type": "application/json",
    "Content-Disposition": `attachment; filename="PST-Inventory-Backup-${todayStr()}.json"`,
  } });
}
