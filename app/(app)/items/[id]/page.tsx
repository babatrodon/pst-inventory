import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { fmt, qf, statusOf, STATUS_LBL } from "@/lib/utils";
import { MovementDialog, CountDialog, ItemFormDialog } from "@/components/dialogs";
import { HistoryTable, type HistRow } from "@/components/history-table";
import { brandAndCategoryLists } from "@/lib/items-query";

export const dynamic = "force-dynamic";

export default async function ItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id }, include: {
    movements: { orderBy: [{ date: "asc" }, { createdAt: "asc" }], include: { user: { select: { name: true } } } },
  } });
  if (!item) notFound();
  const settings = await prisma.settings.findFirst();
  const stock = Number(item.stockCached);
  const st = statusOf(stock, Number(item.minStock), Number(settings?.defMin ?? 0));
  const [cls, lbl] = STATUS_LBL[st];
  let run = Number(item.openingQty);
  const hist: HistRow[] = item.movements.map(m => {
    const s = m.type === "IN" || m.type === "ADJ_IN" ? Number(m.qty) : -Number(m.qty);
    run += s;
    return { id: m.id, date: m.date.toISOString().slice(0, 10), type: m.type, qty: Number(m.qty),
      unitCost: Number(m.unitCost), balance: run, party: m.party, ref: m.ref, note: m.note, user: m.user?.name };
  }).reverse();
  const combo = { id: item.id, code: item.code, name: item.name, brand: item.brand, category: item.category, stock, cost: Number(item.cost) };
  const full = { id: item.id, code: item.code, name: item.name, brand: item.brand, category: item.category, unit: item.unit,
    cost: Number(item.cost), listPrice: item.listPrice ? Number(item.listPrice) : null,
    discountPct: item.discountPct ? Number(item.discountPct) : null,
    minStock: Number(item.minStock), openingQty: Number(item.openingQty) };
  const { brands, cats } = await brandAndCategoryLists();
  const isAdmin = user.role === "admin";
  const kpis = isAdmin ? [
    ["In stock now", qf(stock), item.unit],
    ["Cost / piece", fmt(item.cost), item.listPrice ? `list ${fmt(item.listPrice)} · −${qf(item.discountPct)}%` : " "],
    ["Stock value", fmt(stock * Number(item.cost)), settings?.currency || "SAR"],
    ["Alert at", qf(item.minStock), " "],
  ] : [
    ["In stock now", qf(stock), item.unit],
    ["Alert at", qf(item.minStock), " "],
  ];
  return (
    <div className="grid gap-4">
      <div className="card">
        <div className="card-h">
          <div><h2>{item.code || "(no code)"} <span className={`bdg ${cls} align-middle`}>{lbl}</span></h2>
            <div className="dim">{item.name} · {item.brand} · {item.category}</div></div>
          <div className="flex gap-2 flex-wrap no-pr">
            <MovementDialog mode="IN" item={combo} showCost={isAdmin} triggerClass="btn btn-p btn-sm" trigger={<>Add stock</>} />
            <MovementDialog mode="OUT" item={combo} triggerClass="btn btn-b btn-sm" trigger={<>Stock out</>} />
            <CountDialog item={combo} triggerClass="btn btn-y btn-sm" trigger={<>Count stock</>} />
            {isAdmin && <ItemFormDialog item={full} brands={brands} cats={cats} isAdmin triggerClass="btn btn-o btn-sm" trigger={<>Edit</>} />}
          </div>
        </div>
        <div className="card-b grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))" }}>
          {kpis.map(([l, v, s]) => (
            <div className="kpi" key={l as string}><span><i>{l}</i><b className="num">{v as string}</b><s className="num">{s as string}</s></span></div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-h"><h2>History</h2>
          <span className="sub">started with {qf(item.openingQty)} · {settings?.openLabel}</span></div>
        <div className="overflow-auto" style={{ maxHeight: "60vh" }}>
          <HistoryTable rows={hist} isAdmin={isAdmin} showBalance showMoney={isAdmin} />
        </div>
      </div>
    </div>
  );
}
