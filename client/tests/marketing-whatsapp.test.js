import { describe, expect, it } from "vitest";
import {
  buildWhatsappUrl,
  isEgyptianMobileWhatsapp,
  normalizeWhatsappNumber,
} from "@/modules/admin/customers/utils/whatsapp";

describe("normalizeWhatsappNumber", () => {
  it("converts trunk-zero mobiles to international digits", () => {
    expect(normalizeWhatsappNumber("01012345678")).toBe("201012345678");
    expect(normalizeWhatsappNumber("01112345678")).toBe("201112345678");
    expect(normalizeWhatsappNumber("01212345678")).toBe("201212345678");
    expect(normalizeWhatsappNumber("01512345678")).toBe("201512345678");
  });

  it("handles plus, double-zero, spaces and dashes", () => {
    expect(normalizeWhatsappNumber("+201012345678")).toBe("201012345678");
    expect(normalizeWhatsappNumber("00201012345678")).toBe("201012345678");
    expect(normalizeWhatsappNumber("010 1234 5678")).toBe("201012345678");
    expect(normalizeWhatsappNumber("010-1234-5678")).toBe("201012345678");
  });

  it("keeps already-international digits untouched", () => {
    expect(normalizeWhatsappNumber("201012345678")).toBe("201012345678");
  });

  it("returns empty string for missing input", () => {
    expect(normalizeWhatsappNumber("")).toBe("");
    expect(normalizeWhatsappNumber(null)).toBe("");
    expect(normalizeWhatsappNumber(undefined)).toBe("");
  });
});

describe("isEgyptianMobileWhatsapp", () => {
  it("accepts valid Egyptian mobiles in any common writing", () => {
    expect(isEgyptianMobileWhatsapp("01012345678")).toBe(true);
    expect(isEgyptianMobileWhatsapp("+201112345678")).toBe(true);
    expect(isEgyptianMobileWhatsapp("00201212345678")).toBe(true);
    expect(isEgyptianMobileWhatsapp("015 1234 5678")).toBe(true);
  });

  it("rejects short, long and trunk-less numbers", () => {
    expect(isEgyptianMobileWhatsapp("0101234567")).toBe(false);
    expect(isEgyptianMobileWhatsapp("010123456789")).toBe(false);
    expect(isEgyptianMobileWhatsapp("1012345678")).toBe(false);
  });

  it("rejects landlines, foreign numbers and empty input", () => {
    expect(isEgyptianMobileWhatsapp("0223456789")).toBe(false);
    expect(isEgyptianMobileWhatsapp("+966512345678")).toBe(false);
    expect(isEgyptianMobileWhatsapp("")).toBe(false);
    expect(isEgyptianMobileWhatsapp(null)).toBe(false);
  });
});

describe("buildWhatsappUrl", () => {
  it("builds a wa.me link with encoded Arabic text", () => {
    const url = buildWhatsappUrl("01012345678", "أهلًا يا أحمد");
    expect(url).toBe(`https://wa.me/201012345678?text=${encodeURIComponent("أهلًا يا أحمد")}`);
  });

  it("returns null for invalid numbers", () => {
    expect(buildWhatsappUrl("0223456789", "عرض")).toBeNull();
    expect(buildWhatsappUrl("", "عرض")).toBeNull();
  });
});
