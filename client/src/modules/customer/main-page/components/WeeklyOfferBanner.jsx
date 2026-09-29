import React, { useState } from "react";
import { Copy, Check, Sparkles } from "lucide-react";

export default function WeeklyOfferBanner({ offerData, onApplyOffer }) {
  const [copied, setCopied] = useState(false);

  const offer = offerData || {
    badge: "عرض الأسبوع",
    discount: "خصم 20%",
    subtext: "على جميع المشروبات الباردة",
    code: "404COLD",
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80",
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(offer.code);
    setCopied(true);
    if (onApplyOffer) onApplyOffer(offer.code);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className="weekly-offer-banner-section" aria-label="عرض الأسبوع" id="offers-anchor">
      <div className="weekly-offer-banner-card">
        {/* Botanical side leaves SVG decor */}
        <div className="offer-botanical-bg" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="offer-decor-svg left-svg">
            <path d="M5,95 Q30,60 40,20" fill="none" stroke="#D8C9BC" strokeWidth="1.5" />
            <path d="M20,70 Q35,55 45,65 Q30,85 20,70" fill="#E4D7CC" opacity="0.6" />
            <path d="M30,40 Q45,25 55,35 Q40,55 30,40" fill="#E4D7CC" opacity="0.6" />
          </svg>
        </div>

        {/* Right Content in RTL (Offer details) */}
        <div className="offer-details-content">
          <span className="offer-badge-label">{offer.badge}</span>
          <h3 className="offer-main-discount">{offer.discount}</h3>
          <p className="offer-subtext-desc">{offer.subtext}</p>

          <button
            type="button"
            className="offer-code-pill-btn"
            onClick={handleCopyCode}
            title="انقر لنسخ الكود وتطبيقه"
          >
            <span>استخدم الكود: <strong>{offer.code}</strong></span>
            {copied ? (
              <span className="copied-tag">
                <Check size={14} /> تم النسخ!
              </span>
            ) : (
              <Copy size={14} className="copy-icon" />
            )}
          </button>
        </div>

        {/* Left Content in RTL (Gift Box & 404 Brand Graphic) */}
        <div className="offer-visual-art">
          <div className="gift-box-wrapper">
            <img
              src={offer.image}
              alt="404 Coffee Offer Gift Box"
              className="gift-box-img"
              loading="lazy"
            />
            <div className="offer-brand-stamp">
              <span className="stamp-title">404</span>
              <span className="stamp-sub">COFFEE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
