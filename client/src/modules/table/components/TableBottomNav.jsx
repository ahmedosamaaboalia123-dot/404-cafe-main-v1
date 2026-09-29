import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Coffee,
  ShoppingBag,
  Bell,
  Receipt,
} from "lucide-react";
import { useTable } from "../context/TableContext";

export default function TableBottomNav() {
  const location = useLocation();
  const { tableNumber, activeOrder, setIsWaiterModalOpen, setIsCartOpen, totalCartItemsCount } = useTable();

  const isHome = location.pathname === `/table/${tableNumber}` || location.pathname === "/table" || location.pathname === `/table/${tableNumber}/`;
  const isMenu = location.pathname.includes("/menu");
  const isOrders = location.pathname.includes("/orders");

  return (
    <nav className="tbl-bottom-nav">
      <Link
        to={`/table/${tableNumber}`}
        className={`tbl-bottom-nav-item ${isHome ? "active" : ""}`}
      >
        <Home size={20} />
        <span>طاولة #{tableNumber}</span>
      </Link>

      <Link
        to={`/table/${tableNumber}/menu`}
        className={`tbl-bottom-nav-item ${isMenu ? "active" : ""}`}
      >
        <Coffee size={20} />
        <span>المينيو</span>
      </Link>

      <button
        type="button"
        className="tbl-bottom-nav-item"
        onClick={() => setIsCartOpen(true)}
      >
        <ShoppingBag size={20} />
        <span>السلة</span>
        {totalCartItemsCount > 0 && (
          <span className="tbl-nav-badge-dot" />
        )}
      </button>

      <Link
        to={`/table/${tableNumber}/orders`}
        className={`tbl-bottom-nav-item ${isOrders ? "active" : ""}`}
      >
        <Receipt size={20} />
        <span>طلباتي</span>
        {activeOrder && <span className="tbl-nav-badge-dot" />}
      </Link>

      <button
        type="button"
        className="tbl-bottom-nav-item"
        onClick={() => setIsWaiterModalOpen(true)}
      >
        <Bell size={20} />
        <span>الويتر</span>
      </button>
    </nav>
  );
}
