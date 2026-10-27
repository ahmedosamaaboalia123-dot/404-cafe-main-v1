const EGYPT_COUNTRY = "20";
const EGYPT_MOBILE_PATTERN = /^20(10|11|12|15)\d{8}$/;

export function normalizeWhatsappNumber(phone = "") {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.startsWith(`00${EGYPT_COUNTRY}`)) digits = digits.slice(2);
  else if (digits.startsWith(EGYPT_COUNTRY)) digits = digits;
  else if (digits.startsWith("0")) digits = `${EGYPT_COUNTRY}${digits.slice(1)}`;
  return digits;
}

export function isEgyptianMobileWhatsapp(phone = "") {
  return EGYPT_MOBILE_PATTERN.test(normalizeWhatsappNumber(phone));
}

export function buildWhatsappUrl(phone, message = "") {
  if (!isEgyptianMobileWhatsapp(phone)) return null;
  const number = normalizeWhatsappNumber(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
