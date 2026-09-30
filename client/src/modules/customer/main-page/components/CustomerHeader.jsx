import React from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Menu } from "lucide-react";
import logo from "@/assets/images/new-logo.jpeg";

export default function CustomerHeader({
  tableNumber,
  cartCount = 0,
  onOpenCart,
  onOpenProfile,
  onOpenMenu,
  onOpenNotifications,
  onOpenLocationModal,
  onNavigateSection,
}) {
  return (
    <header className="customer-header">
      <div className="customer-header-inner">
        {/* Right side in RTL: Brand Logo with EST. 2025 */}
        <div className="header-brand-group">
          <button
            type="button"
            className="header-icon-btn menu-btn mobile-only"
            onClick={onOpenMenu}
            aria-label="القائمة الجانبية"
            title="القائمة"
          >
            <Menu size={22} />
          </button>

          <Link to={tableNumber ? `/table/${tableNumber}` : "/"} className="header-brand-link">
            <img className="header-brand-logo" src={logo} alt="404 Caffee" />
          </Link>
        </div>

        {/* Center: Desktop Navigation Links (Visible on Tablet/Desktop) */}
        <nav className="header-desktop-nav" aria-label="التنقل الرئيسي">
          <button
            type="button"
            className="desktop-nav-link"
            onClick={() => onNavigateSection && onNavigateSection("menu")}
          >
            المينيو
          </button>
          <Link
            to={tableNumber ? `/table/${tableNumber}/orders` : "/customer/orders"}
            className="desktop-nav-link"
          >
            تتبع الطلبات
          </Link>
          {!tableNumber && (
            <Link to="/customer/chatbot" className="desktop-nav-link">
              باريستا الذكي
            </Link>
          )}
          <button
            type="button"
            className="desktop-nav-link"
            onClick={() => onNavigateSection && onNavigateSection(tableNumber ? "games" : "reviews")}
          >
            التقييمات
          </button>
        </nav>

        {/* Left side in RTL: Notification Button + Cart */}
        <div className="header-actions-group">
          {tableNumber && (
            <span className="header-table-pill" aria-label={`رقم الطاولة ${tableNumber}`}>
              طاولة {tableNumber}
            </span>
          )}
          {/* Desktop Cart Button */}
          <button
            type="button"
            className="header-icon-btn cart-btn"
            onClick={onOpenCart}
            aria-label="عربة التسوق"
            title="سلة الطلبات"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="cart-badge-count">{cartCount}</span>
            )}
          </button>

        </div>
      </div>
    </header>
  );
}
