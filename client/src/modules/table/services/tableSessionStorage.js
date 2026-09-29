const prefix = "404:table-session:";
export const tableSessionStorage = {
  save(tableNumber, value) { sessionStorage.setItem(`${prefix}${tableNumber}`, JSON.stringify({ tableNumber: Number(tableNumber), tableToken: value.tableToken, session: value.session, expiresAt: value.session?.expiresAt })); },
  read(tableNumber) { try { const value = JSON.parse(sessionStorage.getItem(`${prefix}${tableNumber}`) || "null"); if (!value || Number(value.tableNumber) !== Number(tableNumber) || (value.expiresAt && Date.parse(value.expiresAt) <= Date.now())) return null; return value; } catch { return null; } },
  clear(tableNumber) { sessionStorage.removeItem(`${prefix}${tableNumber}`); },
};
