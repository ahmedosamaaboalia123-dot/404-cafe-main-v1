import { describe, expect, it } from "vitest";
import { buildWhatsappInvoiceUrl, normalizeWhatsappPhone } from "../src/modules/admin/delegates/utils/whatsapp";

describe("delivery WhatsApp invoice link", () => {
  it("normalizes the phone and encodes invoice data", () => {
    const url = buildWhatsappInvoiceUrl("+20 100-123-4567", { invoice: { invoiceNumber: "INV-9", total: "125.50" } });
    expect(normalizeWhatsappPhone("+20 100-123-4567")).toBe("201001234567");
    expect(url).toContain("https://wa.me/201001234567?text=");
    expect(decodeURIComponent(url)).toContain("INV-9");
    expect(decodeURIComponent(url)).toContain("125.50");
  });

  it("refuses an empty phone", () => {
    expect(buildWhatsappInvoiceUrl("", {})).toBeNull();
  });
});
