"use client";
import { useEffect, useRef, useState } from "react";
import { qf } from "@/lib/utils";

export type ComboItem = { id: string; code: string; name: string; brand: string; category: string; stock: number; cost: number };

export function ItemCombo({ onPick, initial }: { onPick: (it: ComboItem) => void; initial?: ComboItem | null }) {
  const [q, setQ] = useState(initial ? `${initial.code}${initial.name ? " · " + initial.name : ""}` : "");
  const [list, setList] = useState<ComboItem[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(text: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/items/search?q=${encodeURIComponent(text)}`);
      if (r.ok) { setList(await r.json()); setOpen(true); }
    }, 180);
  }
  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={box}>
      <input className="in" value={q} placeholder="Type the code or name"
        onChange={e => { setQ(e.target.value); search(e.target.value); }}
        onFocus={() => search(q)} autoComplete="off" />
      {open && (
        <div className="combo-list">
          {list.length === 0 && <div className="co hint">No match</div>}
          {list.map(it => (
            <button type="button" key={it.id} className="co" onClick={() => {
              setQ(`${it.code}${it.name ? " · " + it.name : ""}`); setOpen(false); onPick(it);
            }}>
              <b className="block">{it.code || "(no code)"} · {it.name || it.category}</b>
              <span className="dim">{it.brand} · {it.category} · stock {qf(it.stock)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
