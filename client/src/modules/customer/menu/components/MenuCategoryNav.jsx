import React from "react";
import { Coffee, CupSoda, Flame, CakeSlice, Sandwich, Sparkles } from "lucide-react";

export default function MenuCategoryNav({
  categories = [],
  activeCategory = "all",
  onSelectCategory,
}) {
  const getCategoryIcon = (iconName) => {
    switch (iconName) {
      case "Coffee":
        return <Coffee size={20} className="cat-icon" />;
      case "CupSoda":
        return <CupSoda size={20} className="cat-icon" />;
      case "Flame":
        return <Flame size={20} className="cat-icon" />;
      case "CakeSlice":
        return <CakeSlice size={20} className="cat-icon" />;
      case "Sandwich":
        return <Sandwich size={20} className="cat-icon" />;
      case "Sparkles":
        return <Sparkles size={20} className="cat-icon" />;
      default:
        return <Coffee size={20} className="cat-icon" />;
    }
  };

  return (
    <nav className="menu-categories-navbar" aria-label="أقسام المينيو">
      <div className="menu-categories-scroll-wrapper">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`menu-category-pill-btn ${isActive ? "active-pill" : ""}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <div className="pill-icon-container">
                {getCategoryIcon(cat.icon)}
              </div>
              <span className="pill-title-text">{cat.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
