import React from "react";
import { Heart, Star, Sparkles } from "lucide-react";

export default function MenuProductCard({
  product,
  isFavorite = false,
  onToggleFavorite,
  onSelectProduct,
}) {
  const handleOpenDetails = (e) => {
    e.stopPropagation();
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  return (
    <div
      className="menu-product-card"
      id={`product-${product.id}`}
      onClick={handleOpenDetails}
      style={{ cursor: "pointer" }}
    >
      {/* Top Badges & Favorite Heart */}
      <div className="product-card-top-bar">
        <button
          type="button"
          className={`card-favorite-btn ${isFavorite ? "active-favorite" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          aria-label="إضافة للمفضلة"
          title="المفضلة"
        >
          <Heart size={18} fill={isFavorite ? "#D9534F" : "none"} color={isFavorite ? "#D9534F" : "#7A685D"} />
        </button>

        <div className="card-badge-container">
          {product.isNew && (
            <span className="product-pill-badge new-badge">جديد</span>
          )}
          {product.isBestSeller && !product.isNew && (
            <span className="product-pill-badge bestseller-badge">
              <Star size={12} fill="#B38E5D" color="#B38E5D" />
              <span>الأكثر طلباً</span>
            </span>
          )}
        </div>
      </div>

      {/* Center Cup Presentation with 404 Brand mark */}
      <div className="product-image-stage" onClick={handleOpenDetails}>
        <div className="product-cup-wrapper">
          <img
            src={product.image}
            alt={product.name}
            className="product-cup-img"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          {/* Branded 404 Logo Watermark over Cup */}
          <div className="cup-brand-watermark">
            <span className="watermark-number">404</span>
            <span className="watermark-coffee">COFFEE</span>
          </div>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="product-details-content">
        <h4 className="product-main-name" onClick={handleOpenDetails}>
          {product.name}
        </h4>
        <p className="product-description-text">
          {product.description}
        </p>

        <div className="product-pricing-row">
          <span className="product-price-value">{product.price} EGP</span>
        </div>

        {/* Action Button: "تفاصيل المنتج" / "تخصيص" to open details view */}
        <div className="product-card-actions">
          <button
            type="button"
            className="product-details-btn"
            onClick={handleOpenDetails}
          >
            <span>تفاصيل المنتج</span>
            <Sparkles size={14} className="details-sparkle-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}

