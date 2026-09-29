import React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useTable } from "../../context/TableContext";

export default function TableSearchBar({
  searchQuery,
  onSearchChange,
  onToggleCategoryFilter,
}) {
  const { tableNumber } = useTable();

  return (
    <section className="search-bar-section" aria-label="شريط البحث عن المشروبات والحلويات">
      <div className="search-bar-inner">
        {/* Search Input Container */}
        <div className="search-input-field-wrapper">
          <Search size={20} className="search-lead-icon" />

          <input
            type="text"
            className="search-text-input"
            placeholder={`ابحث عن مشروبك أو تحليتك لطاولة ${tableNumber}...`}
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            aria-label="البحث عن منتج"
          />

          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange && onSearchChange("")}
              aria-label="مسح البحث"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <button
          type="button"
          className="search-filter-action-btn"
          onClick={onToggleCategoryFilter}
          aria-label="تصفية حسب الأقسام"
          title="تصفية الأقسام"
        >
          <SlidersHorizontal size={20} />
        </button>
      </div>
    </section>
  );
}
