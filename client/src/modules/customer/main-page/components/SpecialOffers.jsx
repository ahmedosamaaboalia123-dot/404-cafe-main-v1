import React from "react";
import { Tag } from "lucide-react";

export default function SpecialOffers({ offers = [], onSelectOffer }) {
  return (
    <section className="customer-offers-section" aria-label="عروض مميزة">
      <div className="section-header">
        <h2 className="section-title">عروض مميزة</h2>
      </div>

      <div className="offers-slider-track">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="offer-banner-card"
            onClick={() => onSelectOffer && onSelectOffer(offer)}
            role="button"
            tabIndex={0}
          >
            {/* Offer Text Details (Right side in RTL) */}
            <div className="offer-content-side">
              <span className="offer-badge-pill">
                <Tag size={12} className="offer-tag-icon" />
                {offer.badge}
              </span>
              <h3 className="offer-title">{offer.title}</h3>
              <p className="offer-description">{offer.description}</p>
            </div>

            {/* Offer Image Thumbnail (Left side in RTL) */}
            <div className="offer-image-side">
              <img
                src={offer.image}
                alt={offer.title}
                className="offer-thumbnail-img"
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
