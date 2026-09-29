import React from "react";
import { ShoppingCart, ArrowLeft, ChevronUp, X } from "lucide-react";

export default function MenuFloatingCartBar({
  cartItems = [],
  totalPrice = 0,
  totalCount = 0,
  onOpenCart,
  onRemoveItem,
  onConfirmOrder,
}) {
  if (cartItems.length === 0) return null;

  return (
    <div className="menu-floating-cart-wrapper" aria-label="شريط الطلب السريع">
      <div className="menu-floating-cart-card">
        {/* Right in RTL: Cart Icon with item badge */}
        <button
          type="button"
          className="floating-cart-icon-btn"
          onClick={onOpenCart}
          title="عرض السلة بالكامل"
        >
          <div className="cart-icon-circle">
            <ShoppingCart size={22} className="cart-svg-icon" />
            <span className="cart-badge-number">{totalCount}</span>
          </div>
        </button>

        {/* Center: Added items thumbnails preview */}
        <div className="floating-cart-thumbnails-list">
          {cartItems.slice(0, 3).map((item) => (
            <div key={item.id} className="cart-thumb-item">
              <img
                src={item.image}
                alt={item.name}
                className="cart-thumb-img"
                referrerPolicy="no-referrer"
              />
              <span className="cart-thumb-qty">{item.quantity}</span>
              <button
                type="button"
                className="cart-thumb-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveItem(item.id);
                }}
                title="حذف من السلة"
                aria-label={`حذف ${item.name}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {cartItems.length > 3 && (
            <div className="cart-more-items-chip">
              +{cartItems.length - 3}
            </div>
          )}
        </div>

        {/* Price & Items Count */}
        <div className="floating-cart-price-info" onClick={onOpenCart}>
          <div className="price-top-row">
            <span className="cart-total-amount">{totalPrice} EGP</span>
            <ChevronUp size={16} className="price-chevron-icon" />
          </div>
          <span className="cart-items-count-text">{totalCount} منتجات</span>
        </div>

        {/* Left in RTL: Confirm Order CTA Button */}
        <button
          type="button"
          className="floating-confirm-order-btn"
          onClick={onConfirmOrder || onOpenCart}
        >
          <span className="btn-label-text">تأكيد الطلب</span>
          <div className="btn-arrow-circle">
            <ArrowLeft size={16} />
          </div>
        </button>
      </div>
    </div>
  );
}
