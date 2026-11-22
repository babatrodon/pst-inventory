"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "./toast";
import { qf } from "@/lib/utils";
import { updateSettings, createUser, resetPassword, deleteUser, setUserRole, dangerReset } from "@/actions/settings";
import { scanDups, mergeGroups, makeUnique, type DupGroup } from "@/actions/dups";
import { recomputeStock } from "@/actions/items";

type U = { id: string; name: string; email: string; role: string; createdAt: string };
type S = { company: string; phone: string; email: string; address: string; currency: string; defMin: number };

export function SettingsClient({ meId, settings, users, dupCount, counts }: {
  meId: string; settings: S; users: U[]; dupCount: number; counts: { items: number; moves: number };
}) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [nu, setNu] = useState({ name: "", email: "", password: "", role: "staff" as "staff" | "admin" });
  const [groups, setGroups] = useState<DupGroup[] | null>(null);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<unknown>, msg: string) =>
    start(() => fn().then(() => { toast(msg); router.refresh(); }).catch(e => toast(e.message || "Failed", "err")));

  async function openDups() {
    const g = await scanDups();
    if (!g.length) return toast("No duplicated codes. Clean list.");
    setGroups(g);
    setTicked(new Set(g.map((x, i) => (x.same ? i : -1)).filter(i => i >= 0)));
  }
  function doMerge() {
    const picked = [...ticked].map(i => groups![i].items.map(x => x.id));
    if (!picked.length) return toast("Tick at least one group", "err");
    act(async () => { const r = await mergeGroups(picked); setGroups(null); return r; }, "Groups merged");
  }
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
      <div className="card"><div className="card-h"><h2>Company details</h2><span className="sub">shown on printed reports</span></div>
        <div className="card-b grid gap-3">
          <div><label className="f">Company name</label><input className="in" value={s.company} onChange={e => setS({ ...s, company: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="f">Phone</label><input className="in" value={s.phone} onChange={e => setS({ ...s, phone: e.target.value })} /></div>
            <div><label className="f">Email</label><input className="in" value={s.email} onChange={e => setS({ ...s, email: e.target.value })} /></div>
          </div>
          <div><label className="f">Address</label><input className="in" value={s.address} onChange={e => setS({ ...s, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="f">Currency label</label><input className="in" value={s.currency} onChange={e => setS({ ...s, currency: e.target.value })} /></div>
            <div><label className="f">Low-stock alert (default)</label><input className="in num" type="number" min="0" value={s.defMin} onChange={e => setS({ ...s, defMin: Number(e.target.value) })} /></div>
          </div>
          <button className="btn btn-p justify-self-start" disabled={pending} onClick={() => act(() => updateSettings(s), "Details saved")}>Save details</button>
        </div></div>

      <div className="card"><div className="card-h"><h2>Users</h2><span className="sub">{users.length} accounts</span></div>
        <div className="card-b grid gap-3">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-2 flex-wrap border rounded-xl px-3 py-2" style={{ borderColor: "var(--line2)" }}>
              <div className="min-w-0 flex-1"><b className="block truncate">{u.name}</b><span className="dim">{u.email}</span></div>
              <span className={`bdg ${u.role === "admin" ? "b-out" : "b-ok"}`}>{u.role}</span>
              {u.id !== meId && <>
                <button className="btn btn-o btn-sm" onClick={() => act(() => setUserRole(u.id, u.role === "admin" ? "staff" : "admin"), "Role changed")}>
                  Make {u.role === "admin" ? "staff" : "admin"}</button>
                <button className="btn btn-o btn-sm" onClick={() => { const p = prompt(`New password for ${u.name} (min 8 characters):`);
                  if (p) act(() => resetPassword(u.id, p), "Password changed, user signed out"); }}>Reset password</button>
                <button className="btn btn-d btn-sm" onClick={() => { if (confirm(`Delete ${u.name}'s account? Their records stay in history.`))
                  act(() => deleteUser(u.id), "User deleted"); }}>Delete</button>
              </>}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2.5 border-t pt-3" style={{ borderColor: "var(--line2)" }}>
            <input className="in" placeholder="Name" value={nu.name} onChange={e => setNu({ ...nu, name: e.target.value })} />
            <input className="in" placeholder="Email" value={nu.email} onChange={e => setNu({ ...nu, email: e.target.value })} />
            <input className="in" placeholder="Password (min 8)" type="password" value={nu.password} onChange={e => setNu({ ...nu, password: e.target.value })} />
            <select className="in" value={nu.role} onChange={e => setNu({ ...nu, role: e.target.value as "staff" | "admin" })}>
              <option value="staff">Staff · records stock</option><option value="admin">Admin · full control</option>
            </select>
            <button className="btn btn-p col-span-2" disabled={pending}
              onClick={() => act(async () => { await createUser(nu); setNu({ name: "", email: "", password: "", role: "staff" }); }, "User created")}>
              + Create user</button>
          </div>
        </div></div>

      <div className="card"><div className="card-h"><h2>Fix duplicate items</h2>
        <span className="sub">{dupCount ? `${dupCount} duplicated codes` : "codes are clean"}</span></div>
        <div className="card-b grid gap-3">
          <button className="btn btn-b justify-self-start" onClick={openDups}>Find duplicates</button>
          <div className="hint">Same code on many lines: identical descriptions merge into one line with history kept, different descriptions get their own unique codes. You approve every change first.</div>
        </div></div>

      <div className="card"><div className="card-h"><h2>Data &amp; maintenance</h2>
        <span className="sub">{counts.items} items · {counts.moves} records</span></div>
        <div className="card-b grid gap-2.5">
          <div className="flex gap-2.5 flex-wrap">
            <a className="btn btn-b" href="/api/export/backup">Download backup (JSON)</a>
            <a className="btn btn-o" href="/api/export/items">Export all items (Excel)</a>
            <button className="btn btn-o" onClick={() => act(() => recomputeStock(), "Stock recalculated from history")}>Recalculate stock</button>
          </div>
          <div className="hint">The real backup is the nightly database dump on the server. This JSON download is an extra copy you keep yourself.</div>
          <div className="flex gap-2.5 flex-wrap border-t pt-3" style={{ borderColor: "var(--line2)" }}>
            <button className="btn btn-d" onClick={() => { if (confirm("Delete every movement and go back to opening stock? Items stay.") && confirm("Really sure? There is no undo without a backup."))
              act(() => dangerReset("movements"), "History cleared, back to opening stock"); }}>Clear all history</button>
            <button className="btn btn-d" onClick={() => { if (confirm("Delete ALL items and history?") && confirm("Really sure? There is no undo without a backup."))
              act(() => dangerReset("all"), "Everything erased"); }}>Erase everything</button>
          </div>
        </div></div>

      {groups && (
        <div className="card" style={{ gridColumn: "1/-1" }}>
          <div className="card-h"><h2>Duplicate codes · {groups.length} groups</h2>
            <div className="flex gap-2"><button className="btn btn-o btn-sm" onClick={() => setGroups(null)}>Close</button>
              <button className="btn btn-p btn-sm" disabled={pending} onClick={doMerge}>Merge ticked groups</button></div></div>
          <div className="card-b grid gap-2.5" style={{ maxHeight: "60vh", overflow: "auto" }}>
            <div className="hint"><b>Merge</b> combines lines into one: quantities add up, history stays. Ticked automatically only where descriptions match. <b>Give own codes</b> keeps lines separate and makes every code unique, for one family code covering many products (sizes, colors, ratings).</div>
            {groups.map((g, gi) => (
              <div key={gi} className="border rounded-xl" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-2.5 flex-wrap px-3.5 py-2.5">
                  <label className="flex items-center gap-2 font-extrabold disp cursor-pointer">
                    <input type="checkbox" checked={ticked.has(gi)}
                      onChange={e => setTicked(t => { const n = new Set(t); if (e.target.checked) n.add(gi); else n.delete(gi); return n; })} />
                    {g.items[0].code} · {g.items.length} lines · stock {qf(g.items.reduce((a, x) => a + x.stock, 0))}
                  </label>
                  <span className="flex-1" />
                  {g.same ? <span className="bdg b-ok">Same description</span> : <>
                    <span className="bdg b-low">Descriptions differ</span>
                    <button className="btn btn-o btn-sm" disabled={pending}
                      onClick={() => act(async () => { await makeUnique(g.items.map(x => x.id)); setGroups(await scanDups()); }, "Codes made unique")}>
                      Give own codes</button></>}
                </div>
                <div className="px-3.5 pb-2.5">
                  {g.items.map(x => (
                    <div key={x.id} className="bar" style={{ gridTemplateColumns: "1fr 120px" }}>
                      <span className="dim">{x.name || "(no description)"} · {x.brand}</span>
                      <b className="num text-right">stock {qf(x.stock)}</b>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
