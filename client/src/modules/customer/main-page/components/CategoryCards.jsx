import React from "react";
import { Coffee, CupSoda, CakeSlice, Sandwich, MoreHorizontal } from "lucide-react";

export default function CategoryCards({
  categories = [],
  selectedCategory,
  onSelectCategory,
}) {
  const getCategoryIcon = (iconName) => {
    switch (iconName) {
      case "Coffee":
        return <Coffee size={26} className="cat-icon-svg" />;
      case "CupSoda":
        return <CupSoda size={26} className="cat-icon-svg" />;
      case "CakeSlice":
        return <CakeSlice size={26} className="cat-icon-svg" />;
      case "Sandwich":
        return <Sandwich size={26} className="cat-icon-svg" />;
      case "MoreHorizontal":
        return <MoreHorizontal size={26} className="cat-icon-svg" />;
      default:
        return <Coffee size={26} className="cat-icon-svg" />;
    }
  };

  return (
    <section className="category-cards-section" aria-label="أقسام القائمة">
      <div className="category-cards-grid">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`category-pill-card ${isSelected ? "active-category" : ""}`}
              onClick={() => onSelectCategory && onSelectCategory(cat.id)}
            >
              <div className="category-card-icon-wrap">
                {getCategoryIcon(cat.icon)}
              </div>
              <span className="category-card-title">{cat.title}</span>
              <span className="category-card-subtitle">{cat.englishTitle}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
