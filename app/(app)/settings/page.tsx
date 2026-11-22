import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireAdmin();
  const settings = await prisma.settings.findFirst();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true } });
  const [dup] = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int n FROM (SELECT "codeNorm" FROM "item" WHERE "codeNorm" <> ''
      GROUP BY "codeNorm" HAVING COUNT(*) > 1) d`;
  const [counts] = await prisma.$queryRaw<{ items: number; moves: number }[]>`
    SELECT (SELECT COUNT(*) FROM "item")::int items, (SELECT COUNT(*) FROM "movement")::int moves`;
  return (
    <SettingsClient meId={me.id}
      settings={{ company: settings?.company || "", phone: settings?.phone || "", email: settings?.email || "",
        address: settings?.address || "", currency: settings?.currency || "SAR", defMin: Number(settings?.defMin ?? 0) }}
      users={users.map(u => ({ ...u, createdAt: u.createdAt.toISOString().slice(0, 10) }))}
      dupCount={dup.n} counts={counts} />
  );
}
