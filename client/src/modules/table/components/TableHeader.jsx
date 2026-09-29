import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  Coffee,
  Bell,
  ShoppingBag,
  Clock,
  Sparkles,
  ArrowRightLeft,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { useTable } from "../context/TableContext";

export default function TableHeader({ onOpenDrawer }) {
  const location = useLocation();
  const {
    tableNumber,
    activeOrder,
    setIsTableSelectorOpen,
    setIsWaiterModalOpen,
    setIsCartOpen,
    totalCartItemsCount,
  } = useTable();

  const isMenu = location.pathname.includes("/menu");
  const isOrders = location.pathname.includes("/orders");

  return (
    <header className="tbl-header-bar">
      <div className="tbl-header-inner">
        {/* Right Side: Drawer toggle & Brand Logo */}
        <div className="tbl-header-brand-side">
          <button
            type="button"
            className="tbl-drawer-trigger-btn"
            onClick={onOpenDrawer}
            aria-label="فتح القائمة الجانبية"
            title="القائمة"
          >
            <Menu size={22} />
          </button>

          <Link to={`/table/${tableNumber}`} className="tbl-logo-link">
            <div className="tbl-logo-icon-box">
              <Coffee size={22} />
            </div>
            <div className="tbl-brand-texts">
              <h1 className="tbl-brand-title">404 COFFEE</h1>
              <span className="tbl-brand-subtitle">خدمة الطاولات الحية</span>
            </div>
          </Link>
        </div>

        {/* Center: Table Badge & Active Order Pill */}
        <div className="tbl-meta-badges-cluster">
          {/* Table Number Pill (Click to Switch) */}
          <button
            type="button"
            className="tbl-table-badge-btn"
            onClick={() => setIsTableSelectorOpen(true)}
            title="انقر لتغيير رقم الطاولة"
          >
            <span className="tbl-table-badge-pulse" />
            <span>طاولة #{tableNumber}</span>
            <ArrowRightLeft size={13} className="text-coffee-gold opacity-80" />
          </button>

          {/* Active Table Order Pill if exists */}
          {activeOrder && (
            <Link
              to={`/table/${tableNumber}/orders/${activeOrder.id}/track`}
              className="tbl-active-order-pill"
              title="انقر لتتبع الطلب الحقيقي على طاولتك"
            >
              <Clock size={13} />
              <span>طلب #{activeOrder.orderNumber}</span>
            </Link>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <nav className="tbl-desktop-nav-links">
          <Link
            to={`/table/${tableNumber}`}
            className={`tbl-desktop-link ${
              !isMenu && !isOrders ? "active" : ""
            }`}
          >
            الرئيسية
          </Link>
          <Link
            to={`/table/${tableNumber}/menu`}
            className={`tbl-desktop-link ${isMenu ? "active" : ""}`}
          >
            قائمة المينيو
          </Link>
          <Link
            to={`/table/${tableNumber}/orders`}
            className={`tbl-desktop-link ${isOrders ? "active" : ""}`}
          >
            طلبات وفواتير الطاولة
          </Link>
        </nav>

        {/* Left Side: Call Waiter & Cart Buttons */}
        <div className="tbl-header-actions-side">
          <button
            type="button"
            className="tbl-call-waiter-btn"
            onClick={() => setIsWaiterModalOpen(true)}
            title="استدعاء الويتر إلى الطاولة"
          >
            <Bell size={16} className="text-coffee-gold" />
            <span className="hidden sm:inline">طلب الويتر</span>
          </button>

          <button
            type="button"
            className="tbl-cart-icon-btn"
            onClick={() => setIsCartOpen(true)}
            aria-label="سلة طلب الطاولة"
            title="سلة طلب الطاولة"
          >
            <ShoppingBag size={18} />
            {totalCartItemsCount > 0 && (
              <span className="tbl-cart-badge-count">{totalCartItemsCount}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
