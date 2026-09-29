import React from "react";
import { Home, Coffee, ClipboardList, User } from "lucide-react";

export default function CustomerBottomNav({
  activeTab = "home",
  onChangeTab,
}) {
  const tabs = [
    { id: "home", label: "الرئيسية", icon: Home },
    { id: "menu", label: "القائمة", icon: Coffee },
    { id: "orders", label: "تتبع الطلبات", icon: ClipboardList },
    { id: "profile", label: "حسابي", icon: User },
  ];

  return (
    <nav className="customer-bottom-nav" aria-label="شريط التنقل السفلي">
      <div className="bottom-nav-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`bottom-nav-btn ${isActive ? "active" : ""}`}
              onClick={() => onChangeTab && onChangeTab(tab.id)}
            >
              <div className="nav-btn-content">
                <Icon size={20} className="nav-icon" />
                <span className="nav-label">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
