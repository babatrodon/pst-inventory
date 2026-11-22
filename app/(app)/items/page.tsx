import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fetchItemsPage, brandAndCategoryLists } from "@/lib/items-query";
import { ItemsClient } from "@/components/items-client";

export const dynamic = "force-dynamic";

export default async function ItemsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const settings = await prisma.settings.findFirst();
  const params = {
    q: sp.q || "", brand: sp.brand || "", cat: sp.cat || "",
    status: sp.status || "", sort: sp.sort || "", page: Number(sp.page) || 1,
  };
  const data = await fetchItemsPage(params, Number(settings?.defMin ?? 0));
  const { brands, cats } = await brandAndCategoryLists();
  return (
    <ItemsClient rows={data.rows} counts={data.counts} totals={data.totals}
      page={data.page} pages={data.pages}
      params={{ q: params.q, brand: params.brand, cat: params.cat, status: params.status, sort: params.sort }}
      brands={brands} cats={cats} isAdmin={user.role === "admin"} currency={settings?.currency || "SAR"} />
  );
}
