import React from "react";
import { Link } from "react-router-dom";
import { Menu, Search, ShoppingCart, ArrowLeft, FileText, Home } from "lucide-react";
import logo from "@/assets/images/new-logo.jpeg";

export default function MenuHeader({
  cartCount = 0,
  cartTotal = 0,
  onOpenCart,
  onOpenMenu,
  onOpenAiBot,
  onOpenSearch,
  onOpenLocationModal,
  onConfirmOrder,
  homePath = "/",
  ordersPath = "/customer/orders",
}) {
  return (
    <header className="menu-page-header">
      {/* Botanical branch background decoration illustration */}
      <div className="menu-botanical-bg" aria-hidden="true">
        <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="botanical-svg">
          <path d="M10 180 C40 130 90 90 180 50 C220 30 260 20 280 15" stroke="#C4B49E" strokeWidth="1.8" strokeLinecap="round" opacity="0.65" />
          <path d="M60 120 C50 95 30 85 20 90 C30 110 50 115 60 120Z" fill="#C4B49E" opacity="0.45" />
          <path d="M95 98 C90 70 70 60 60 68 C70 88 88 95 95 98Z" fill="#C4B49E" opacity="0.5" />
          <path d="M135 76 C135 48 115 38 105 45 C115 65 130 72 135 76Z" fill="#C4B49E" opacity="0.45" />
          <path d="M180 52 C185 25 168 15 158 20 C165 40 176 48 180 52Z" fill="#C4B49E" opacity="0.5" />
          <path d="M225 32 C235 8 220 0 210 5 C215 22 222 28 225 32Z" fill="#C4B49E" opacity="0.45" />
          {/* Subtle leaves on the other side */}
          <path d="M80 135 C100 130 115 145 110 155 C95 152 85 142 80 135Z" fill="#C4B49E" opacity="0.4" />
          <path d="M120 110 C140 105 155 120 150 130 C135 128 125 118 120 110Z" fill="#C4B49E" opacity="0.4" />
          <path d="M160 85 C180 80 195 95 190 105 C175 102 165 92 160 85Z" fill="#C4B49E" opacity="0.4" />
        </svg>
      </div>

      <div className="menu-header-container">
        {/* Right side in RTL: Menu drawer toggle + home shortcut */}
        <div className="menu-header-right">
          <button
            type="button"
            className="menu-icon-btn menu-nav-toggle"
            onClick={onOpenMenu}
            aria-label="القائمة الرئيسية"
            title="القائمة"
          >
            <Menu size={22} />
          </button>

          <Link to={homePath} className="menu-home-btn">
            <Home size={18} />
            <span>الصفحة الرئيسية</span>
          </Link>

        </div>

        {/* Center: 404 COFFEE Main Logo Branding */}
        <div className="menu-header-center">
          <Link to={homePath} className="menu-brand-link">
            <div className="menu-brand-content">
              <img className="menu-brand-logo" src={logo} alt="404 Caffee" />
            </div>
          </Link>
        </div>

        {/* Left side in RTL: Smart Waiter + Orders + Search + Cart */}
        <div className="menu-header-left">
          {/* My Orders Button */}
          <Link
            to={ordersPath}
            className="menu-icon-btn orders-nav-link"
            aria-label="طلباتي وفواتيري"
            title="طلباتي وفواتيري"
          >
            <FileText size={19} />
          </Link>

          {/* Search Button */}
          <button
            type="button"
            className="menu-icon-btn search-toggle-btn"
            onClick={onOpenSearch}
            aria-label="البحث في المينيو"
            title="البحث"
          >
            <Search size={20} />
          </button>

          {/* Cart Button */}
          <button
            type="button"
            className="menu-icon-btn cart-toggle-btn"
            onClick={onOpenCart}
            aria-label="سلة المشتريات"
            title="سلة الطلبات"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="menu-cart-count-badge">{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Top Mobile Sticky Confirmation Bar */}
      {cartCount > 0 && (
        <div className="menu-top-mobile-cart-bar">
          <div className="top-mobile-cart-inner">
            <div className="top-mobile-cart-info" onClick={onOpenCart}>
              <div className="top-mobile-cart-badge">
                <ShoppingCart size={15} />
                <span>{cartCount}</span>
              </div>
              <div className="top-mobile-cart-texts">
                <span className="top-mobile-total">{cartTotal} EGP</span>
                <span className="top-mobile-items-lbl">{cartCount} منتجات</span>
              </div>
            </div>

            <button
              type="button"
              className="top-mobile-confirm-btn"
              onClick={onOpenCart || onConfirmOrder}
            >
              <span>سلة المشتريات</span>
              <ArrowLeft size={15} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
