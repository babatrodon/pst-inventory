import { requireAdmin } from "@/lib/session";
import { brandAndCategoryLists } from "@/lib/items-query";
import { ReportsClient } from "@/components/reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireAdmin();
  const { brands } = await brandAndCategoryLists();
  return <ReportsClient brands={brands} />;
}
