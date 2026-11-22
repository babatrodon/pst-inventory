"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

export function MoveFilters() {
  const router = useRouter(); const path = usePathname(); const sp = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function set(k: string, v: string) {
    const n = new URLSearchParams(sp.toString());
    if (v) n.set(k, v); else n.delete(k);
    router.replace(`${path}?${n.toString()}`);
  }
  return (
    <div className="flex gap-2.5 flex-wrap">
      <input className="in flex-[2] min-w-[170px]" placeholder="🔎 Search code, customer, invoice" defaultValue={sp.get("q") || ""}
        onChange={e => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => set("q", e.target.value), 300); }} />
      <select className="in w-auto" value={sp.get("type") || ""} onChange={e => set("type", e.target.value)}>
        <option value="">All types</option><option value="IN">Added</option><option value="OUT">Taken out</option>
        <option value="ADJ_IN">Count +</option><option value="ADJ_OUT">Count −</option>
      </select>
      <input className="in w-auto" type="date" defaultValue={sp.get("from") || ""} onChange={e => set("from", e.target.value)} />
      <input className="in w-auto" type="date" defaultValue={sp.get("to") || ""} onChange={e => set("to", e.target.value)} />
    </div>
  );
}
