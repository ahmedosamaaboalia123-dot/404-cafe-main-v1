import React from "react";
import { Coffee, CupSoda, Cake, Sandwich } from "lucide-react";

export default function CategorySection({
  categories = [],
  selectedCategory,
  onSelectCategory,
}) {
  const getIcon = (iconName) => {
    switch (iconName) {
      case "Coffee":
        return <Coffee size={24} />;
      case "CupSoda":
        return <CupSoda size={24} />;
      case "Cake":
        return <Cake size={24} />;
      case "Sandwich":
        return <Sandwich size={24} />;
      default:
        return <Coffee size={24} />;
    }
  };

  return (
    <section className="customer-categories-section" aria-label="أقسام المنيو">
      <div className="section-header">
        <h2 className="section-title">الأقسام</h2>
      </div>

      <div className="categories-grid-container">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`category-item-btn ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectCategory && onSelectCategory(cat.id)}
            >
              <div className="category-circle-icon">
                {getIcon(cat.icon)}
              </div>
              <span className="category-item-label">{cat.title}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
