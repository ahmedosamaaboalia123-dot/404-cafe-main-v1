import FingerprintJS from "@fingerprintjs/fingerprintjs";

let fingerprintAgent;
const browserName = () => {
  const brands = navigator.userAgentData?.brands;
  const brand = Array.isArray(brands) && brands.find((item) => !/not.?a.?brand/i.test(item.brand));
  if (brand?.brand) return brand.brand;
  const ua = navigator.userAgent || "";
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Browser";
};

export async function buildLoginDevice() {
  fingerprintAgent ||= FingerprintJS.load();
  const result = await (await fingerprintAgent).get();
  const os = navigator.userAgentData?.platform || navigator.platform || "Unknown OS";
  const browser = browserName();
  return { fingerprint: result.visitorId, device: { name: `${os} - ${browser}`, browser, os } };
}
