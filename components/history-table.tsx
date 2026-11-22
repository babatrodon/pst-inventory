"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteMovement } from "@/actions/movements";
import { toast } from "./toast";
import { qf, TYPE_LBL, TYPE_BDG } from "@/lib/utils";

export type HistRow = {
  id: string; date: string; type: string; qty: number; unitCost: number;
  balance?: number; party: string; ref: string; note: string; user?: string;
  code?: string; name?: string;
};

export function HistoryTable({ rows, isAdmin, showItem, showBalance }: {
  rows: HistRow[]; isAdmin: boolean; showItem?: boolean; showBalance?: boolean;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  function del(id: string) {
    if (!confirm("Remove this record? The stock number recalculates.")) return;
    start(() => deleteMovement(id).then(() => { router.refresh(); toast("Record deleted"); })
      .catch(e => toast(e.message, "err")));
  }
  return (
    <table className="t">
      <thead><tr>
        <th>Date</th><th>Type</th>
        {showItem && <th>Item</th>}
        <th className="r">Qty</th>
        {showBalance && <th className="r">Balance</th>}
        <th className="hidden md:table-cell">Who</th><th className="hidden lg:table-cell">Ref</th>
        <th className="hidden lg:table-cell">By</th>
        {isAdmin && <th className="c no-pr" />}
      </tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={11} className="hint p-5">Nothing here yet. Use the buttons above: Add stock, Stock out or Count stock.</td></tr>}
        {rows.map(m => {
          const s = m.type === "IN" || m.type === "ADJ_IN" ? m.qty : -m.qty;
          return (
            <tr key={m.id}>
              <td className="num">{m.date}</td>
              <td><span className={`bdg ${TYPE_BDG[m.type]}`}>{TYPE_LBL[m.type]}</span></td>
              {showItem && <td><span className="code">{m.code || "–"}</span> <span className="dim hidden md:inline">{m.name}</span></td>}
              <td className={`r num ${s >= 0 ? "pos" : "neg"}`}>{s >= 0 ? "+" : "−"}{qf(Math.abs(s))}</td>

              {showBalance && <td className="r num font-extrabold">{qf(m.balance ?? 0)}</td>}
              <td className="dim hidden md:table-cell">{m.party}</td>
              <td className="dim hidden lg:table-cell">{m.ref}</td>
              <td className="dim hidden lg:table-cell">{m.user || ""}</td>
              {isAdmin && <td className="c no-pr"><button className="btn btn-o btn-sm" onClick={() => del(m.id)}>🗑</button></td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
