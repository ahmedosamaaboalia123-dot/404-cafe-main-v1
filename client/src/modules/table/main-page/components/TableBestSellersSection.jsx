import React from "react";
import { Plus, ChevronLeft, Check } from "lucide-react";
import { useTable } from "../../context/TableContext";

export default function TableBestSellersSection({
  products = [],
  onAddToCart,
  onViewAll,
  addedItemId,
}) {
  const { tableNumber } = useTable();

  return (
    <section className="bestsellers-section" aria-label="المنتجات الأكثر طلباً لضيوف الطاولات" id="bestsellers-anchor">
      {/* Section Header */}
      <div className="section-title-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h2 className="section-title-text">الأكثر طلباً لطاولة {tableNumber}</h2>
          <span
            style={{
              fontSize: "0.75rem",
              background: "#EFE4D8",
              color: "#593215",
              padding: "2px 8px",
              borderRadius: "12px",
              fontWeight: 700,
            }}
          >
            تقديم سريع ⚡
          </span>
        </div>

        <button
          type="button"
          className="view-all-link-btn"
          onClick={onViewAll}
        >
          <span>عرض منيو الطاولة</span>
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

                {/* Table Mini Badge */}
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    left: "8px",
                    background: "rgba(43, 33, 27, 0.85)",
                    color: "#FFFFFF",
                    fontSize: "0.65rem",
                    padding: "2px 6px",
                    borderRadius: "6px",
                    fontWeight: 700,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  طاولة #{tableNumber}
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
                  aria-label={`إضافة ${product.name} إلى سلة طاولة ${tableNumber}`}
                  title={`إضافة لطاولة ${tableNumber}`}
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
