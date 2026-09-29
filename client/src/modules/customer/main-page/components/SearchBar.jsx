import React from "react";
import { Search, LayoutGrid } from "lucide-react";

export default function SearchBar({
  searchQuery,
  onSearchChange,
  onToggleCategoryFilter,
  onSearchSubmit,
}) {
  return (
    <form className="search-filter-container" role="search" onSubmit={(e) => { e.preventDefault(); onSearchSubmit?.(); }}>
      <div className="search-input-wrapper">
        <input
          type="text"
          className="main-search-input"
          placeholder="ابحث عن مشروبك المفضل..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="ابحث عن مشروبك المفضل"
        />
        <button type="submit" className="search-submit-btn" aria-label="بحث"><Search size={20}/></button>
      </div>

      <button
        type="button"
        className="filter-grid-btn"
        onClick={onToggleCategoryFilter}
        aria-label="عرض الفئات والفلترة"
        title="تصفية الأقسام"
      >
        <LayoutGrid size={22} />
      </button>
    </form>
  );
}
