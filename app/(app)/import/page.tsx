import { requireAdmin } from "@/lib/session";
import { brandAndCategoryLists } from "@/lib/items-query";
import { ImportClient } from "@/components/import-client";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireAdmin();
  const { brands, cats } = await brandAndCategoryLists();
  return <ImportClient brands={brands} cats={cats} />;
}
