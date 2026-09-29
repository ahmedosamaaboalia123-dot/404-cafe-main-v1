export const IN_TYPES = new Set(["SALES", "COLLECTION"]);
export const money = new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" });
export const formatDrawerDate = (value) => value ? new Date(value).toLocaleString("ar-EG") : "—";
export function drawerTotals(shift) {
  const transactions = shift?.transactions || [];
  const incoming = Number(shift?.cashIn ?? transactions.filter((item) => IN_TYPES.has(item.type)).reduce((sum, item) => sum + Number(item.amount), 0));
  const outgoing = Number(shift?.cashOut ?? transactions.filter((item) => !IN_TYPES.has(item.type)).reduce((sum, item) => sum + Number(item.amount), 0));
  return { incoming, outgoing, balance: Number(shift?.expectedBalance ?? Number(shift?.openingBalance || 0) + incoming - outgoing) };
}
