import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { fmt, qf, thisMonth, TYPE_LBL, TYPE_BDG, signedQty } from "@/lib/utils";
import { MovementDialog, CountDialog, ItemFormDialog } from "@/components/dialogs";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  await requireUser();
  const settings = await prisma.settings.findFirst();
  const defMin = Number(settings?.defMin ?? 0);
  const monthStart = new Date(thisMonth() + "-01T00:00:00Z");

  const [agg] = await prisma.$queryRaw<{ items: number; units: number; value: number; low: number; empty: number }[]>`
    SELECT COUNT(*)::int items,
           COALESCE(SUM("stockCached"),0)::float8 units,
           COALESCE(SUM("stockCached"*"cost"),0)::float8 value,
           COUNT(*) FILTER (WHERE "stockCached" > 0 AND (CASE WHEN "minStock">0 THEN "minStock" ELSE ${defMin} END) > 0
                            AND "stockCached" <= (CASE WHEN "minStock">0 THEN "minStock" ELSE ${defMin} END))::int low,
           COUNT(*) FILTER (WHERE "stockCached" <= 0)::int empty
    FROM "item"`;
  const [mon] = await prisma.$queryRaw<{ min: number; mout: number }[]>`
    SELECT COALESCE(SUM("qty") FILTER (WHERE "type" IN ('IN','ADJ_IN')),0)::float8 min,
           COALESCE(SUM("qty") FILTER (WHERE "type" IN ('OUT','ADJ_OUT')),0)::float8 mout
    FROM "movement" WHERE "date" >= ${monthStart}`;
  const brands = await prisma.$queryRaw<{ brand: string; v: number }[]>`
    SELECT "brand", COALESCE(SUM("stockCached"*"cost"),0)::float8 v
    FROM "item" GROUP BY "brand" ORDER BY v DESC`;
  const attention = await prisma.$queryRaw<{ id: string; code: string; name: string; stock: number; st: string }[]>`
    SELECT id, code, name, "stockCached"::float8 stock,
           CASE WHEN "stockCached" <= 0 THEN 'Empty' ELSE 'Low' END st
    FROM "item"
    WHERE "stockCached" <= 0 OR ("stockCached" > 0 AND (CASE WHEN "minStock">0 THEN "minStock" ELSE ${defMin} END) > 0
          AND "stockCached" <= (CASE WHEN "minStock">0 THEN "minStock" ELSE ${defMin} END))
    ORDER BY "stockCached" ASC LIMIT 10`;
  const recent = await prisma.movement.findMany({
    orderBy: { createdAt: "desc" }, take: 8, include: { item: { select: { code: true, name: true } } },
  });
  const brandList = brands.map(b => b.brand).sort();
  const catRows = await prisma.$queryRaw<{ category: string }[]>`SELECT DISTINCT "category" FROM "item" ORDER BY 1`;
  const cats = catRows.map(c => c.category);
  const mx = brands[0]?.v || 1;

  const kpis = [
    ["Stock value", `SAR ${fmt(agg.value)}`, `${agg.items} different items`, "b"],
    ["Pieces in stock", qf(agg.units), "all brands together", "b"],
    ["Added this month", `+${qf(mon.min)}`, "pieces received", "g"],
    ["Taken out this month", `−${qf(mon.mout)}`, "pieces gone out", "g"],
    ["Low stock", String(agg.low), agg.low ? "running out soon" : "nothing running low", "y"],
    ["Empty", String(agg.empty), "items at zero", "r"],
  ] as const;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 no-pr" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <MovementDialog mode="IN" triggerClass="btn btn-p !py-4 flex-col disp" trigger={<>Add stock</>} />
        <MovementDialog mode="OUT" triggerClass="btn btn-b !py-4 flex-col disp" trigger={<>Stock out</>} />
        <CountDialog triggerClass="btn btn-y !py-4 flex-col disp" trigger={<>Count stock</>} />
        <Link href="/import" className="btn btn-o !py-4 disp" style={{ color: "var(--blue)" }}>Import / Bulk add</Link>
        <ItemFormDialog brands={brandList} cats={cats} isAdmin triggerClass="btn btn-o !py-4 disp" trigger={<>New item</>} />
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))" }}>
        {kpis.map(([l, v, s, c]) => (
          <div className="kpi" key={l}><span className={`ico ${c}`}>●</span>
            <span><i>{l}</i><b className="num">{v}</b><s className="num">{s}</s></span></div>
        ))}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <div className="card">
          <div className="card-h"><h2>Stock value by brand</h2><span className="sub num">{brands.length} brands</span></div>
          <div className="card-b">
            {brands.map(b => (
              <div className="bar" key={b.brand}><span>{b.brand}</span>
                <span className="tk"><i style={{ width: `${Math.max(2, b.v / mx * 100)}%` }} /></span>
                <b className="num text-right">{fmt(b.v)}</b></div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h2>{attention.length ? "Needs attention" : "All stock levels healthy"}</h2><span className="sub">lowest stock first</span></div>
          <div className="overflow-x-auto"><table className="t">
            <thead><tr><th>Code</th><th>Description</th><th className="r">Stock</th><th className="c">Status</th></tr></thead>
            <tbody>
              {attention.length === 0 && <tr><td className="hint p-4" colSpan={4}>Nothing is empty and nothing is under its alert level.</td></tr>}
              {attention.map(x => (
                <tr key={x.id}><td><Link className="code" href={`/items/${x.id}`}>{x.code || "–"}</Link></td>
                  <td className="dim">{x.name}</td><td className="r num">{qf(x.stock)}</td>
                  <td className="c"><span className={`bdg ${x.st === "Empty" ? "b-empty" : "b-low"}`}>{x.st}</span></td></tr>
              ))}
            </tbody>
          </table></div>
        </div>
        <div className="card" style={{ gridColumn: "1/-1" }}>
          <div className="card-h"><h2>Latest activity</h2><Link href="/movements" className="btn btn-o btn-sm">Open full history</Link></div>
          <div className="overflow-x-auto"><table className="t">
            <thead><tr><th>Date</th><th>Type</th><th>Item</th><th className="r">Qty</th><th className="r">Value</th><th>Who</th></tr></thead>
            <tbody>
              {recent.length === 0 && <tr><td className="hint p-4" colSpan={6}>Nothing recorded yet. Use the big buttons on top: Add stock, Stock out or Count stock.</td></tr>}
              {recent.map(m => {
                const s = signedQty(m.type, Number(m.qty));
                return (<tr key={m.id}>
                  <td className="num">{m.date.toISOString().slice(0, 10)}</td>
                  <td><span className={`bdg ${TYPE_BDG[m.type]}`}>{TYPE_LBL[m.type]}</span></td>
                  <td><span className="code">{m.item.code || "–"}</span> <span className="dim">{m.item.name}</span></td>
                  <td className={`r num ${s >= 0 ? "pos" : "neg"}`}>{s >= 0 ? "+" : "−"}{qf(Math.abs(s))}</td>
                  <td className="r num">{fmt(Number(m.qty) * Number(m.unitCost))}</td>
                  <td className="dim">{m.party}</td></tr>);
              })}
            </tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}
