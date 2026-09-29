import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function OrderBarcode({ value, trackingToken }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    const token = trackingToken ? `?token=${encodeURIComponent(trackingToken)}` : "";
    const trackingUrl = `${window.location.origin}/customer/orders/${encodeURIComponent(value)}/track${token}`;
    QRCode.toDataURL(trackingUrl, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#211711", light: "#FFFFFF" },
    }).then(setQrDataUrl);
  }, [trackingToken, value]);

  return (
    <div className="order-barcode" role="img" aria-label={`باركود الطلب ${value}`}>
      {qrDataUrl && <img src={qrDataUrl} alt={`QR لتتبع الطلب ${value}`} />}
      <strong>{value}</strong>
    </div>
  );
}
