import React from "react";
import { Plus, ChevronLeft, Check } from "lucide-react";

export default function BestSellersSection({
  products = [],
  onAddToCart,
  onViewAll,
  addedItemId,
}) {
  return (
    <section className="bestsellers-section" aria-label="المنتجات الأكثر طلباً" id="bestsellers-anchor">
      {/* Section Header */}
      <div className="section-title-bar">
        <h2 className="section-title-text">الأكثر طلباً</h2>
        <button
          type="button"
          className="view-all-link-btn"
          onClick={onViewAll}
        >
          <span>عرض الكل</span>
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Product Cards Slider / Grid */}
      <div className="bestsellers-scroll-track">
        {products.map((product) => {
          const isRecentlyAdded = addedItemId === product.id;
          return (
            <article key={product.id} className="bestseller-product-card">
              {/* Product Thumbnail with 404 Coffee Branding Stamp */}
              <div className="product-image-container">
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-thumbnail-img"
                  loading="lazy"
                />
                <div className="cup-stamp-overlay">
                  <span className="stamp-num">404</span>
                  <span className="stamp-text">COFFEE</span>
                </div>
              </div>

              {/* Product Info & Action */}
              <div className="product-info-bar">
                <div className="product-meta-text">
                  <h3 className="product-title-name">{product.name}</h3>
                  <span className="product-price-tag">{product.price} EGP</span>
                </div>

                <button
                  type="button"
                  className={`product-add-circle-btn ${isRecentlyAdded ? "added-success" : ""}`}
                  onClick={() => onAddToCart && onAddToCart(product)}
                  aria-label={`إضافة ${product.name} إلى السلة`}
                  title="إضافة للسلة"
                >
                  {isRecentlyAdded ? (
                    <Check size={18} className="check-icon-anim" />
                  ) : (
                    <Plus size={20} />
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
