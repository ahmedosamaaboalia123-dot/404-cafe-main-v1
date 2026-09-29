export function normalizeWhatsappPhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

/**
 * Builds the wa.me link that hands the recipient (delegate or customer) their
 * invoice. The invoice link lets them open it and save it as a PDF. The print
 * payload nests the order under `order` while the totals sit next to it, so both
 * levels are read.
 */
export function buildWhatsappInvoiceUrl(phone, printData = {}, invoiceLink = "") {
  const number = normalizeWhatsappPhone(phone);
  if (!number) return null;
  const invoice = printData.invoice || printData.order || printData;
  const reference = invoice.invoiceNumber || invoice.orderNumber || printData.orderNumber || "";
  const total =
    invoice.total ?? invoice.totals?.total ?? printData.total ?? printData.totals?.total ?? "0";
  const lines = [`فاتورة ${reference}`.trim(), `الإجمالي: ${total} ج.م`];
  if (invoiceLink) lines.push(`تحميل/عرض الفاتورة PDF: ${invoiceLink}`);
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
}
