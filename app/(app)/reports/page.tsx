import { requireUser } from "@/lib/session";
import { brandAndCategoryLists } from "@/lib/items-query";
import { ReportsClient } from "@/components/reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireUser();
  const { brands } = await brandAndCategoryLists();
  return <ReportsClient brands={brands} />;
}
