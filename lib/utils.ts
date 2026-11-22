export const normCode = (s: string) => String(s || "").replace(/[\s\-./]/g, "").toUpperCase();
export const fmt = (n: unknown) =>
  (Number(n as number) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const qf = (n: unknown) =>
  (Number(n as number) || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const thisMonth = () => todayStr().slice(0, 7);
export const N = (v: unknown) => (v == null ? 0 : Number(v));
export const TYPE_LBL: Record<string, string> = { IN: "Added", OUT: "Taken out", ADJ_IN: "Count +", ADJ_OUT: "Count −" };
export const TYPE_BDG: Record<string, string> = { IN: "b-in", OUT: "b-out", ADJ_IN: "b-adj", ADJ_OUT: "b-adj" };
export const signedQty = (type: string, qty: number) => (type === "IN" || type === "ADJ_IN" ? qty : -qty);
export function statusOf(stock: number, min: number, defMin: number) {
  const m = min > 0 ? min : defMin;
  if (stock <= 0) return "out";
  if (m > 0 && stock <= m) return "low";
  return "ok";
}
export const STATUS_LBL: Record<string, [string, string]> = {
  ok: ["b-ok", "In stock"], low: ["b-low", "Low"], out: ["b-empty", "Empty"],
};
