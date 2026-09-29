import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapPin,
  Bell,
  ShoppingCart,
  Menu,
  Receipt,
  LayoutDashboard,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useTable } from "../../context/TableContext";

export default function TableMainHeader({
  onOpenCart,
  onOpenDrawer,
  onOpenNotifications,
  onOpenWaiterModal,
  onOpenTableSelector,
  onOpenInvoice,
  onNavigateSection,
}) {
  const navigate = useNavigate();
  const {
    tableNumber,
    activeOrder,
    tableCart,
    tableCartCount,
    unreadNotificationsCount,
  } = useTable();

  return (
    <header className="customer-header" aria-label="رأس صفحة الطاولة">
      <div className="customer-header-inner">
        {/* Right side in RTL: Brand Logo with EST. 2025 + Mobile Menu Toggle */}
        <div className="header-brand-group">
          <button
            type="button"
            className="header-icon-btn menu-btn mobile-only"
            onClick={onOpenDrawer}
            aria-label="القائمة الجانبية"
            title="القائمة"
          >
            <Menu size={22} />
          </button>

          <Link to={`/table/${tableNumber}`} className="header-brand-link">
            <div className="header-brand-container">
              <div className="brand-number">404</div>
              <div className="brand-text">COFFEE</div>
              <div className="brand-est">EST. 2025</div>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="header-desktop-nav" aria-label="التنقل الرئيسي">
          <button
            type="button"
            className="desktop-nav-link active"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            الرئيسية
          </button>
          <button
            type="button"
            className="desktop-nav-link"
            onClick={() => navigate(`/table/${tableNumber}/menu`)}
          >
            قائمة المينيو
          </button>
          <button
            type="button"
            className="desktop-nav-link"
            onClick={() => navigate(`/table/${tableNumber}/orders`)}
          >
            طلبات الطاولة
            {activeOrder && (
              <span
                style={{
                  marginRight: "6px",
                  fontSize: "0.7rem",
                  background: "#E07A5F",
                  color: "#fff",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  fontWeight: 800,
                }}
              >
                #{activeOrder.orderNumber}
              </span>
            )}
          </button>
          <button
            type="button"
            className="desktop-nav-link"
            onClick={() => onNavigateSection && onNavigateSection("offers")}
          >
            عروض الطاولات
          </button>
          <button
            type="button"
            className="desktop-nav-link"
            onClick={() => onNavigateSection && onNavigateSection("games")}
          >
            الألعاب والتحديات
          </button>
          <button
            type="button"
            className="desktop-nav-link"
            onClick={() => onOpenWaiterModal && onOpenWaiterModal()}
          >
            استدعاء الويتر
          </button>
        </nav>

        {/* Left side in RTL: Table Badge Pill + Notifications + Cart + Admin Link */}
        <div className="header-actions-group">
          {/* Table Pill matching mockup with table number and switch option */}
          <button
            type="button"
            className="header-location-pill"
            onClick={onOpenTableSelector}
            title="تبديل رقم الطاولة"
            style={{
              borderColor: "#E5832E",
              background: "rgba(229, 131, 46, 0.08)",
            }}
          >
            <div className="location-text-group">
              <span className="location-main-label" style={{ color: "#593215", fontWeight: 800 }}>
                طاولة رقم {tableNumber}
              </span>
              <span className="location-sub-label">صالة كافيه 404 (اضغط للتبديل)</span>
            </div>
            <div
              className="location-icon-circle"
              style={{
                background: "#593215",
                color: "#F5EEE6",
                fontSize: "0.95rem",
              }}
            >
              🪑
            </div>
          </button>

          {/* Quick Call Waiter Bell (Desktop/Tablet) */}
          <button
            type="button"
            className="header-icon-btn"
            onClick={onOpenWaiterModal}
            title="استدعاء الويتر للطاولة"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#F5EEE6",
              color: "#593215",
              border: "1px solid #E8DED3",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
            }}
          >
            <Bell size={19} />
          </button>

          {/* Notification Button with indicator */}
          <button
            type="button"
            className="header-notification-btn"
            onClick={onOpenNotifications}
            aria-label="التنبيهات"
            title="الإشعارات"
          >
            <Bell size={20} />
            <span className="notification-dot-indicator" />
          </button>

          {/* Table Cart Button */}
          <button
            type="button"
            className="header-icon-btn cart-btn"
            onClick={onOpenCart}
            aria-label="سلة طلبات الطاولة"
            title="سلة طلبات الطاولة"
          >
            <ShoppingCart size={20} />
            {tableCartCount > 0 && (
              <span className="cart-badge-count">{tableCartCount}</span>
            )}
          </button>

          {/* Quick Admin Access */}
          <Link
            to="/admin/dashboard"
            className="desktop-admin-badge"
            title="لوحة تحكم الإدارة"
          >
            <LayoutDashboard size={15} />
            <span className="admin-badge-text">الأدمن</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
