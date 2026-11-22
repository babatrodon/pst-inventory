"use client";
import { useEffect, useState } from "react";
let idc = 0;
export function toast(msg: string, kind: "ok" | "err" = "ok") {
  window.dispatchEvent(new CustomEvent("pst-toast", { detail: { id: ++idc, msg, kind } }));
}
export function Toaster() {
  const [list, setList] = useState<{ id: number; msg: string; kind: string }[]>([]);
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setList(l => [...l, d]);
      setTimeout(() => setList(l => l.filter(x => x.id !== d.id)), 3000);
    };
    window.addEventListener("pst-toast", h);
    return () => window.removeEventListener("pst-toast", h);
  }, []);
  return (
    <div className="toast-wrap">
      {list.map(t => <div key={t.id} className={`toast ${t.kind === "err" ? "err" : ""}`}>{t.msg}</div>)}
    </div>
  );
}
