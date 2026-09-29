import React from "react";
import { UtensilsCrossed, Truck, Star } from "lucide-react";

export default function QuickActions({
  onOpenMenu,
  onOpenTrackOrders,
  onOpenRating,
}) {
  return (
    <section className="customer-quick-actions" aria-label="الإجراءات السريعة">
      {/* 1. Main Action: Menu List (Dark Brown) */}
      <button
        type="button"
        className="quick-action-card primary-menu-action"
        onClick={onOpenMenu}
      >
        <div className="action-icon-wrapper">
          <UtensilsCrossed size={28} className="action-icon" />
        </div>
        <span className="action-label">قائمة المينيو</span>
      </button>

      {/* 2. Track Orders Action (Soft Cream) */}
      <button
        type="button"
        className="quick-action-card secondary-action"
        onClick={onOpenTrackOrders}
      >
        <div className="action-icon-wrapper">
          <Truck size={28} className="action-icon" />
        </div>
        <span className="action-label">متابعة طلباتي</span>
      </button>

      {/* 3. Rate Cafe Action (Soft Cream) */}
      <button
        type="button"
        className="quick-action-card secondary-action"
        onClick={onOpenRating}
      >
        <div className="action-icon-wrapper">
          <Star size={28} className="action-icon" />
        </div>
        <span className="action-label">تقييم الكافيه</span>
      </button>
    </section>
  );
}
