import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { MovementDialog, CountDialog } from "@/components/dialogs";
import { HistoryTable, type HistRow } from "@/components/history-table";
import { MoveFilters } from "@/components/move-filters";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function MovementsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const where: Prisma.MovementWhereInput = {};
  if (sp.type === "IN" || sp.type === "OUT" || sp.type === "ADJ_IN" || sp.type === "ADJ_OUT") where.type = sp.type;
  if (sp.from) where.date = { ...(where.date as object || {}), gte: new Date(sp.from + "T00:00:00Z") };
  if (sp.to) where.date = { ...(where.date as object || {}), lte: new Date(sp.to + "T00:00:00Z") };
  if (q) where.OR = [
    { party: { contains: q, mode: "insensitive" } }, { ref: { contains: q, mode: "insensitive" } },
    { item: { is: { OR: [{ code: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } } },
  ];
  const [rows, n] = await Promise.all([
    prisma.movement.findMany({ where, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 300,
      include: { item: { select: { code: true, name: true } }, user: { select: { name: true } } } }),
    prisma.movement.count({ where }),
  ]);
  const hist: HistRow[] = rows.map(m => ({
    id: m.id, date: m.date.toISOString().slice(0, 10), type: m.type, qty: Number(m.qty),
    unitCost: Number(m.unitCost), party: m.party, ref: m.ref, note: m.note,
    user: m.user?.name, code: m.item.code, name: m.item.name,
  }));
  return (
    <div className="card">
      <div className="card-h">
        <h2>Stock history <span className="sub num">{n} records{n > 300 ? " · latest 300 shown" : ""}</span></h2>
        <div className="flex gap-2 flex-wrap no-pr">
          <MovementDialog mode="IN" triggerClass="btn btn-p btn-sm" trigger={<>Add stock</>} />
          <MovementDialog mode="OUT" triggerClass="btn btn-b btn-sm" trigger={<>Stock out</>} />
          <CountDialog triggerClass="btn btn-y btn-sm" trigger={<>Count stock</>} />
        </div>
      </div>
      <div className="card-b pb-3 no-pr"><MoveFilters /></div>
      <div className="overflow-auto" style={{ maxHeight: "68vh" }}>
        <HistoryTable rows={hist} isAdmin={user.role === "admin"} showItem />
      </div>
    </div>
  );
}
