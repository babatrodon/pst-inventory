"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) { setErr("Wrong email or password."); return; }
    router.push("/"); router.refresh();
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <div className="card-b flex flex-col items-center gap-1 pt-8">
          <Logo h={62} />
          <h1 className="text-lg mt-2">Power Source Trading Est.</h1>
          <span className="sub tracking-widest uppercase">Inventory System</span>
        </div>
        <form onSubmit={submit} className="card-b grid gap-3 pt-0">
          <div><label className="f">Email</label>
            <input className="in" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required /></div>
          <div><label className="f">Password</label>
            <input className="in" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></div>
          {err && <div className="bdg b-empty justify-self-start">{err}</div>}
          <button className="btn btn-p mt-1" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <div className="hint text-center">Ask the administrator for an account.</div>
        </form>
      </div>
    </main>
  );
}
