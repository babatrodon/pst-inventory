import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/toast";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = await prisma.settings.findFirst() ?? { company: "Power Source Trading Est." };

  return (
    <>
      <header className="site bg-white border-b" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-[1240px] mx-auto px-4 py-2.5 flex items-center gap-3.5">
          <Logo h={48} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] leading-tight truncate" style={{ color: "var(--blue)" }}>{settings.company}</h1>
            <span className="sub tracking-widest uppercase text-[11px]">Inventory System · Riyadh</span>
          </div>

        </div>
      </header>
      <Nav name={user.name} role={user.role} />
      <main className="max-w-[1240px] mx-auto px-4 py-5 pb-24">{children}</main>
      <Toaster />
    </>
  );
}
