"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const LINKS = [
  ["/", "Home"], ["/items", "Stock"], ["/movements", "History"],
  ["/import", "Import"], ["/reports", "Reports"], ["/settings", "Settings"],
] as const;

export function Nav({ name, role }: { name: string; role: string }) {
  const path = usePathname();
  const router = useRouter();
  const links = LINKS.filter(([href]) => href !== "/settings" || role === "admin");
  return (
    <nav className="site sticky top-0 z-40 bg-white border-b" style={{ borderColor: "var(--line)" }}>
      <div className="max-w-[1240px] mx-auto px-3 py-2 flex items-center gap-1 overflow-x-auto">
        {links.map(([href, label]) => {
          const on = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href}
              className="px-4 py-2 rounded-xl font-bold text-[14px] whitespace-nowrap"
              style={on ? { background: "var(--green)", color: "#fff" } : { color: "var(--mut)" }}>
              {label}
            </Link>
          );
        })}
        <span className="flex-1" />
        <span className="dim hidden sm:inline">{name}</span>
        <button className="btn btn-o btn-sm" onClick={async () => { await authClient.signOut(); router.push("/login"); router.refresh(); }}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
