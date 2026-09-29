const PROFILE = "404:customer:profile"; const ACCESS = "404:customer:order-access"; const SESSION = "404:customer:access-session";
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch { return fallback; } };
export const customerStorage = {
  loadProfile: () => read(PROFILE, { name: "", phone: "", address: "" }),
  saveProfile(value) { const profile = { name: String(value.name || ""), phone: String(value.phone || ""), address: String(value.address || ""), city: String(value.city || ""), area: String(value.area || ""), street: String(value.street || ""), building: String(value.building || ""), floor: String(value.floor || ""), landmark: String(value.landmark || "") }; localStorage.setItem(PROFILE, JSON.stringify(profile)); return profile; },
  saveOrderAccess(orderNumber, value) { const all = read(ACCESS, {}); all[String(orderNumber)] = { orderNumber: String(orderNumber), barcodeValue: value.barcodeValue || "", trackingReadToken: value.trackingReadToken || "", orderActionToken: value.orderActionToken || "", readExpiresAt: value.readExpiresAt || null, actionExpiresAt: value.actionExpiresAt || null }; localStorage.setItem(ACCESS, JSON.stringify(all)); return all[String(orderNumber)]; },
  getOrderAccess(orderNumber) { return read(ACCESS, {})[String(orderNumber)] || null; },
  listOrderAccess() { return Object.values(read(ACCESS, {})); },
  forgetOrderAccess(orderNumber) { const all = read(ACCESS, {}); delete all[String(orderNumber)]; localStorage.setItem(ACCESS, JSON.stringify(all)); },
  saveAccessSession(value) { localStorage.setItem(SESSION, JSON.stringify(value)); return value; }, loadAccessSession: () => read(SESSION, null),
};
