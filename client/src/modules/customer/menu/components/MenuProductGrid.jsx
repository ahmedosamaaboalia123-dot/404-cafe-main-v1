import React from "react";
import { Star, Coffee, SlidersHorizontal } from "lucide-react";
import MenuProductCard from "./MenuProductCard";

export default function MenuProductGrid({
  categoryTitle = "القهوة",
  products = [],
  cartItems = [],
  favorites = [],
  onToggleFavorite,
  onAddToCart,
  onSelectProduct,
  onlyBestSellers,
  onToggleBestSellers,
  onOpenMobileFilter,
}) {
  return (
    <section className="menu-product-grid-section" aria-label="قائمة المشروبات والمنتجات">
      {/* Category Section Header bar */}
      <div className="menu-grid-top-bar">
        {/* Mobile filter button */}
        <button
          type="button"
          className="mobile-filter-trigger-btn"
          onClick={onOpenMobileFilter}
        >
          <SlidersHorizontal size={16} />
          <span>تصفية</span>
        </button>

        {/* Right side in RTL: Category title with total count */}
        <div className="grid-category-title-group">
          <h2 className="grid-category-title">
            {categoryTitle} <span className="products-count-tag">({products.length} منتج)</span>
          </h2>
        </div>

        {/* Left side in RTL: Best Seller Quick Toggle / Indicator */}
        <button
          type="button"
          className={`grid-bestseller-badge-btn ${onlyBestSellers ? "active" : ""}`}
          onClick={() => onToggleBestSellers(!onlyBestSellers)}
        >
          <Star size={15} fill={onlyBestSellers ? "#B38E5D" : "none"} color="#B38E5D" />
          <span>الأكثر طلباً</span>
        </button>
      </div>

      {/* Product Cards Grid (3 columns on Desktop & Mobile) */}
      {products.length > 0 ? (
        <div className="menu-products-cards-grid">
          {products.map((product) => (
            <MenuProductCard
              key={product.id}
              product={product}
              isFavorite={favorites.includes(product.id)}
              onToggleFavorite={onToggleFavorite}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      ) : (
        <div className="menu-empty-results-card">
          <div className="empty-results-icon-wrap">
            <Coffee size={36} />
          </div>
          <h3 className="empty-results-title">لم يتم العثور على منتجات مطابقة للفلاتر</h3>
          <p className="empty-results-desc">
            جرب تعديل خيارات التصفية أو مسح الفلاتر لعرض جميع المشروبات المتاحة في 404 كافيه.
          </p>
        </div>
      )}
    </section>
  );
}

