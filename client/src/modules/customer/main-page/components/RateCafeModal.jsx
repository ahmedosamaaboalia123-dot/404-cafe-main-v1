import React, { useEffect, useState } from "react";
import { X, Star, Heart } from "lucide-react";
import "./RateCafeModal.css";

export default function RateCafeModal({
  isOpen,
  onClose,
  onSubmit,
  onSubmitted,
  orderHint = "",
  orders = [],
  selectedOrderId = "",
  onSelectOrder,
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRating(5);
      setHoverRating(0);
      setName("");
      setComment("");
      setSubmitting(false);
      setSubmitError("");
      setSubmitted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await onSubmit?.({
        rating,
        displayName: name.trim() || undefined,
        comment: comment.trim(),
      });
      setSubmitted(true);
      onSubmitted?.();
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (error) {
      setSubmitError(error?.message || "تعذر إرسال التقييم");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="customer-modal-backdrop" onClick={onClose}>
      <div
        className="customer-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="تقييم الكافيه"
      >
        <div className="modal-sheet-header">
          <div className="modal-handle-bar" />
          <div className="modal-title-row">
            <h3 className="modal-title">تقييم الكافيه</h3>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-sheet-body">
          {submitted ? (
            <div className="review-success-state">
              <div className="heart-icon-wrapper">
                <Heart size={44} className="heart-icon" />
              </div>
              <h4>شكراً لمشاركتك رأيك!</h4>
              <p>رأيك يهمنا دائماً ويساعدنا على تقديم أفضل تجربة في 404 كافيه.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rate-cafe-form">
              <p className="rate-intro-text">
                كيف كانت تجربتك معنا في 404 Coffee؟
              </p>

              {orderHint && <p className="rate-order-hint">{orderHint}</p>}

              {Array.isArray(orders) && orders.length > 1 && (
                <div className="form-field-group">
                  <label className="field-label" htmlFor="rate-order-select">الطلب الذي تقيّمه</label>
                  <select
                    id="rate-order-select"
                    className="customer-text-input"
                    value={selectedOrderId}
                    onChange={(e) => onSelectOrder?.(e.target.value)}
                  >
                    {orders.map((order) => (
                      <option key={String(order.id)} value={String(order.id)}>
                        {order.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rating-stars-interactive" role="radiogroup" aria-label="التقييم بالنجوم">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="star-rate-btn"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`تقييم ${star} من 5`}
                  >
                    <Star
                      size={32}
                      className={`star-svg ${
                        (hoverRating || rating) >= star ? "filled" : "empty"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="form-field-group">
                <label className="field-label" htmlFor="rate-name">اسمك (اختياري)</label>
                <input
                  id="rate-name"
                  type="text"
                  className="customer-text-input"
                  placeholder="مثال: أحمد محمد"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="form-field-group">
                <label className="field-label" htmlFor="rate-comment">رأيك بالتفصيل</label>
                <textarea
                  id="rate-comment"
                  rows={4}
                  className="customer-textarea-input"
                  placeholder="أخبرنا عن جودة القهوة، الخدمة، أو الجو العام..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  maxLength={1000}
                />
              </div>

              {submitError && <p className="rate-submit-error" role="alert">{submitError}</p>}

              <button
                type="submit"
                className="submit-review-btn"
                disabled={!comment.trim() || submitting}
              >
                {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
