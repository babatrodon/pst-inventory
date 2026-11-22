import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/toast";
import { fmt } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = await prisma.settings.findFirst() ?? { company: "Power Source Trading Est.", currency: "SAR" };
  const agg = await prisma.$queryRaw<{ v: number }[]>`SELECT COALESCE(SUM("stockCached"*"cost"),0)::float8 v FROM "item"`;
  const value = agg[0]?.v ?? 0;
  return (
    <>
      <header className="site bg-white border-b" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-[1240px] mx-auto px-4 py-2.5 flex items-center gap-3.5">
          <Logo h={48} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] leading-tight truncate" style={{ color: "var(--blue)" }}>{settings.company}</h1>
            <span className="sub tracking-widest uppercase text-[11px]">Inventory System · Riyadh</span>
          </div>
          <div className="rounded-2xl px-4 py-2 text-right border" style={{ background: "var(--green-s)", borderColor: "#C8EBD4" }}>
            <b className="num block text-[16px]" style={{ color: "var(--green-d)" }}>{settings.currency} {fmt(value)}</b>
            <i className="not-italic text-[10px] font-bold uppercase tracking-wide" style={{ color: "#4E8A64" }}>Stock value</i>
          </div>
        </div>
      </header>
      <Nav name={user.name} role={user.role} />
      <main className="max-w-[1240px] mx-auto px-4 py-5 pb-24">{children}</main>
      <Toaster />
    </>
  );
}
