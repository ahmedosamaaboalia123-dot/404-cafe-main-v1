import React from "react";
import { X, Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Pencil } from "lucide-react";

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  checkoutLabel = "إتمام الطلب",
  onEditItem,
}) {
  if (!isOpen) return null;

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="customer-modal-backdrop" onClick={onClose}>
      <div
        className="customer-drawer-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer-header">
          <div className="drawer-title-group">
            <ShoppingBag size={22} />
            <h3 className="drawer-title">سلة الطلبات</h3>
            <span className="items-count-tag">
              ({cartItems.reduce((acc, it) => acc + it.quantity, 0)} عناصر)
            </span>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {cartItems.length === 0 ? (
            <div className="empty-cart-state">
              <ShoppingBag size={48} className="empty-cart-icon" />
              <p>سلتك فارغة حالياً</p>
              <span>تصفح المينيو وأضف أشهى المشروبات والحلويات</span>
            </div>
          ) : (
            <div className="cart-items-list">
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item-row">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="cart-item-thumb"
                  />
                  <div className="cart-item-info">
                    <h4 className="cart-item-name">{item.name}</h4>
                    <span className="cart-item-price">
                      {item.price * item.quantity} ج.م
                    </span>
                    {onEditItem && <button type="button" className="cart-edit-item-btn" onClick={() => onEditItem(item)}><Pencil size={13}/>تعديل</button>}
                  </div>

                  <div className="cart-quantity-controls">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() =>
                        onUpdateQuantity(item.id, item.quantity + 1)
                      }
                    >
                      <Plus size={14} />
                    </button>
                    <span className="qty-number">{item.quantity}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() =>
                        item.quantity > 1
                          ? onUpdateQuantity(item.id, item.quantity - 1)
                          : onRemoveItem(item.id)
                      }
                    >
                      {item.quantity === 1 ? (
                        <Trash2 size={13} className="trash-icon" />
                      ) : (
                        <Minus size={14} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="drawer-footer">
            <div className="total-breakdown-row">
              <span>الإجمالي:</span>
              <span className="total-price-val">{total} ج.م</span>
            </div>
            <button
              type="button"
              className="checkout-action-btn"
              onClick={onCheckout}
            >
              <span>{checkoutLabel}</span>
              <ArrowLeft size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
