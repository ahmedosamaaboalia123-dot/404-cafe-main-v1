import React from "react";
import { Star, ChevronLeft } from "lucide-react";

export default function CustomerReviews({
  reviews = [],
  onViewAllReviews,
  onAddReview,
}) {
  return (
    <section id="reviews-anchor" className="customer-reviews-section table-reviews-section" aria-label="آراء العملاء">
      <div className="section-header with-link">
        <h2 className="section-title">آراء العملاء</h2>
        <button
          type="button"
          className="section-link-btn"
          onClick={onViewAllReviews}
        >
          <span>عرض الكل</span>
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="reviews-list">
        {reviews.map((rev) => (
          <div key={rev.id} className="customer-review-card">
            {/* Top User Info & Rating */}
            <div className="review-card-header">
              <div className="review-user-info">
                <div className="review-avatar-circle">
                  <span>{rev.initial}</span>
                </div>
                <div className="review-user-meta">
                  <h4 className="review-user-name">{rev.name}</h4>
                  <span className="review-time-stamp">{rev.date}</span>
                </div>
              </div>

              <div className="review-stars-group">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={15}
                    className={`star-icon ${
                      i < rev.rating ? "filled" : "empty"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Comment body */}
            <p className="review-comment-text">{rev.comment}</p>
          </div>
        ))}
      </div>
      <div className="reviews-actions">
        <button type="button" onClick={onViewAllReviews}>عرض المزيد</button>
        <button type="button" className="reviews-primary" onClick={onAddReview}>اترك تقييمك</button>
      </div>
    </section>
  );
}
