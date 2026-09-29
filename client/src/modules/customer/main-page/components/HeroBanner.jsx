import React from "react";
import { Coffee, ReceiptText, Bot, ConciergeBell } from "lucide-react";

export default function HeroBanner({
  tableNumber,
  onOrderNow,
  onOpenAiBot,
  onOpenOrders,
  onOpenWaiter,
}) {
  return (
    <section className="hero-showcase-section" aria-label="بانر الترحيب">
      <div className="hero-showcase-inner">
        {/* Right Side in RTL: Typography & Action Buttons */}
        <div className="hero-text-content">
          {tableNumber && (
            <p className="hero-table-welcome">أهلاً بك على طاولة رقم {tableNumber}</p>
          )}
          <h1 className="hero-main-heading">
            <span className="heading-line-1">المزاج</span>
            <span className="heading-line-2">مش موجود؟</span>
            <span className="heading-line-3">القهوة موجودة.</span>
          </h1>

          <p className="hero-subtext">
            مش مجرد قهوة، دي تجربة 404
          </p>

          <div className="hero-cta-buttons">
            <button
              type="button"
              className="hero-primary-btn"
              onClick={onOrderNow}
            >
              <Coffee size={20} className="cta-icon" />
              <span>المنيو</span>
            </button>

            <button type="button" className="hero-secondary-btn" onClick={onOpenOrders}><ReceiptText size={19}/><span>تتبع الطلبات</span></button>
            <button type="button" className="hero-secondary-btn" onClick={onOpenWaiter || onOpenAiBot}>{tableNumber ? <ConciergeBell size={19}/> : <Bot size={19}/>}<span>{tableNumber ? "خدمات الجرسون" : "روبوت 404"}</span></button>
          </div>
        </div>

        {/* Left Side in RTL: Arched Frame with Iced Coffee & Coaster */}
        <div className="hero-visual-container">
          {/* Botanical background leaves SVG */}
          <div className="botanical-decor-bg" aria-hidden="true">
            <svg viewBox="0 0 200 300" className="botanical-svg left-leaves">
              <path d="M10,250 Q60,180 80,100 Q85,80 70,60" fill="none" stroke="#D1C2B4" strokeWidth="1.5" />
              <path d="M40,210 Q60,190 70,200 Q50,225 40,210" fill="#D8C9BC" opacity="0.6" />
              <path d="M60,160 Q80,140 90,150 Q70,175 60,160" fill="#D8C9BC" opacity="0.6" />
              <path d="M75,110 Q95,90 105,100 Q85,125 75,110" fill="#D8C9BC" opacity="0.6" />
            </svg>
            <svg viewBox="0 0 200 300" className="botanical-svg right-leaves">
              <path d="M190,250 Q140,180 120,100 Q115,80 130,60" fill="none" stroke="#D1C2B4" strokeWidth="1.5" />
              <path d="M160,210 Q140,190 130,200 Q150,225 160,210" fill="#D8C9BC" opacity="0.6" />
              <path d="M140,160 Q120,140 110,150 Q130,175 140,160" fill="#D8C9BC" opacity="0.6" />
              <path d="M125,110 Q105,90 95,100 Q115,125 125,110" fill="#D8C9BC" opacity="0.6" />
            </svg>
          </div>

          {/* Architectural Arch Frame */}
          <div className="arch-frame-backdrop">
            <div className="arch-inner-glow" />
          </div>

          {/* Realistic Coffee Cup on Pedestal */}
          <div className="hero-product-stage">
            <div className="cup-wrapper">
              <img
                src="https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80"
                alt="404 Iced Coffee"
                className="hero-cup-image"
                loading="eager"
              />
              <div className="cup-brand-overlay">
                <span className="cup-logo-num">404</span>
                <span className="cup-logo-text">COFFEE</span>
                <span className="cup-logo-est">EST. 2025</span>
              </div>
            </div>
            {/* Marble / Stone pedestal slab */}
            <div className="stone-pedestal-base">
              <div className="stone-surface" />
              <div className="stone-side" />
              <div className="stone-shadow" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
