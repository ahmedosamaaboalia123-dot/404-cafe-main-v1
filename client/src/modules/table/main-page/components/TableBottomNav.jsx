import React from "react";
import { Home, Coffee, ClipboardList, ShoppingCart, Bell } from "lucide-react";
import { useTable } from "../../context/TableContext";

export default function TableBottomNav({
  activeTab = "home",
  onTabChange,
}) {
  const { tableNumber, tableCartCount, activeOrder, setIsWaiterModalOpen } = useTable();

  const tabs = [
    { id: "home", label: "الرئيسية", icon: Home },
    { id: "menu", label: "المينيو", icon: Coffee },
    { id: "cart", label: "سلة الطاولة", icon: ShoppingCart, badge: tableCartCount },
    { id: "orders", label: "تتبع الطلبات", icon: ClipboardList, badge: activeOrder ? "!" : null },
    { id: "waiter", label: "الويتر", icon: Bell },
  ];

  return (
    <nav className="customer-bottom-nav" aria-label="شريط التنقل السفلي للطاولة">
      <div className="bottom-nav-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`bottom-nav-btn ${isActive ? "active" : ""}`}
              onClick={() => {
                if (tab.id === "waiter") {
                  setIsWaiterModalOpen(true);
                } else if (onTabChange) {
                  onTabChange(tab.id);
                }
              }}
            >
              <div className="nav-btn-content" style={{ position: "relative" }}>
                <Icon size={20} className="nav-icon" />
                {tab.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-8px",
                      background: "#E07A5F",
                      color: "#FFFFFF",
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid #FAF6F0",
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
                <span className="nav-label">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
