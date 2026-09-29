import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import Button from "@/shared/components/Button/Button";
import Input from "@/shared/components/Input/Input";
import Select from "@/shared/components/Select/Select";
import { AsyncState, ConflictDialog, DateTime, ServerPagination } from "@/shared/components";
import { isConflict } from "@/api/apiError";
import { can } from "@/modules/auth/permissions/permission";
import { useAuthStore } from "@/store/authStore";
import { REVIEW_STATUSES } from "../adapters/review.adapter";
import { useReviewsList } from "../hooks/review.queries";
import { useModerateReview, useUpdateReview } from "../hooks/review.mutations";
import {
  firstReviewFormError,
  reviewModerationSchema,
  reviewUpdateSchema,
} from "../schemas/review.schema";
import "./ReviewsPage.css";

const PAGE_LIMIT = 10;
const STATUS_OPTIONS = Object.entries(REVIEW_STATUSES).map(([value, label]) => ({ value, label }));
const RATING_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: `${value} من 5` }));

const stars = (rating) => {
  const full = Math.max(0, Math.min(5, Number(rating) || 0));
  return "★".repeat(full) + "☆".repeat(5 - full);
};

function ReviewRow({ review, canModerate, onChanged }) {
  const [open, setOpen] = useState(false);
  const [modStatus, setModStatus] = useState(review.status || "VISIBLE");
  const [modReason, setModReason] = useState("");
  const [modError, setModError] = useState("");
  const [editRating, setEditRating] = useState(String(review.rating || 5));
  const [editComment, setEditComment] = useState(review.comment ?? "");
  const [editError, setEditError] = useState("");
  const moderate = useModerateReview(review.id);
  const update = useUpdateReview(review.id);

  const submitModeration = (event) => {
    event.preventDefault();
    const parsed = reviewModerationSchema.safeParse({
      status: modStatus,
      reason: modReason.trim(),
      expectedVersion: Number(review.version ?? 0),
    });
    if (!parsed.success) { setModError(firstReviewFormError(parsed)); return; }
    setModError("");
    moderate.mutate(parsed.data, { onSuccess: () => { setModReason(""); onChanged?.(); } });
  };

  const submitUpdate = (event) => {
    event.preventDefault();
    const parsed = reviewUpdateSchema.safeParse({
      rating: Number(editRating),
      comment: editComment.trim() ? editComment.trim() : null,
      expectedVersion: Number(review.version ?? 0),
    });
    if (!parsed.success) { setEditError(firstReviewFormError(parsed)); return; }
    setEditError("");
    update.mutate(parsed.data, { onSuccess: () => onChanged?.() });
  };

  return (
    <>
      <tr>
        <td title={review.id}>{review.id ? review.id.slice(-6) : "—"}</td>
        <td title={review.orderId || ""}>{review.orderId ? review.orderId.slice(-6) : "—"}</td>
        <td>{review.displayName || "ضيف"}</td>
        <td><span className="reviews-stars" aria-label={`التقييم ${review.rating} من 5`}>{stars(review.rating)}</span></td>
        <td className="reviews-comment">{review.comment || "—"}</td>
        <td>{review.statusLabel}</td>
        <td><DateTime value={review.submittedAt} /></td>
        <td>
          {canModerate ? (
            <button type="button" className="reviews-expand-btn" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
              {open ? "إغلاق" : "إدارة"}
            </button>
          ) : "—"}
        </td>
      </tr>
      {canModerate && open && (
        <tr className="reviews-row reviews-row--expanded">
          <td colSpan={8}>
            <div className="review-manage">
              <form className="review-form" onSubmit={submitModeration}>
                <h3>إشراف</h3>
                <Select label="الحالة" value={modStatus} onChange={(e) => { moderate.resetAttempt(); setModError(""); setModStatus(e.target.value); }} options={STATUS_OPTIONS} />
                <Input label="السبب" placeholder="اكتب سبب الإجراء (3 أحرف على الأقل)" value={modReason} onChange={(e) => { moderate.resetAttempt(); setModError(""); setModReason(e.target.value); }} />
                {(modError || (moderate.isError && !isConflict(moderate.error))) && (
                  <p className="reviews-error" role="alert">{modError || moderate.error?.message}</p>
                )}
                <Button type="submit" loading={moderate.isPending}>حفظ الإشراف</Button>
              </form>
              <form className="review-form" onSubmit={submitUpdate}>
                <h3>تعديل التقييم</h3>
                <Select label="التقييم" value={editRating} onChange={(e) => { update.resetAttempt(); setEditError(""); setEditRating(e.target.value); }} options={RATING_OPTIONS} />
                <Input label="التعليق" placeholder="نص التعليق (اتركه فارغًا للمسح)" value={editComment} onChange={(e) => { update.resetAttempt(); setEditError(""); setEditComment(e.target.value); }} />
                {(editError || (update.isError && !isConflict(update.error))) && (
                  <p className="reviews-error" role="alert">{editError || update.error?.message}</p>
                )}
                <Button type="submit" loading={update.isPending}>حفظ التعديل</Button>
              </form>
            </div>
            <ConflictDialog open={isConflict(moderate.error)} onClose={moderate.resetAttempt} onReload={async () => { moderate.resetAttempt(); await onChanged?.(); }} pending={false} />
            <ConflictDialog open={isConflict(update.error)} onClose={update.resetAttempt} onReload={async () => { update.resetAttempt(); await onChanged?.(); }} pending={false} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function ReviewsPage() {
  const permissions = useAuthStore((state) => state.permissions);
  const canRead = can(permissions, "reviews.read");
  const canModerate = can(permissions, "reviews.moderate");

  const [status, setStatus] = useState("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);

  const params = useMemo(() => ({
    page,
    limit: PAGE_LIMIT,
    ...(status ? { status } : {}),
    ...(rating ? { rating: Number(rating) } : {}),
  }), [page, status, rating]);
  const list = useReviewsList(params);

  if (!canRead) {
    return (
      <div className="reviews-page" dir="rtl">
        <PageHeader title="التقييمات" breadcrumbs={["الإدارة", "التقييمات"]} icon={Star} />
        <p className="reviews-error" role="alert">ليس لديك صلاحية لعرض التقييمات.</p>
      </div>
    );
  }

  const items = list.data?.items || [];
  const summary = list.data?.summary;

  const resetFilters = () => { setStatus(""); setRating(""); setPage(1); };

  return (
    <div className="reviews-page" dir="rtl">
      <PageHeader title="التقييمات" breadcrumbs={["الإدارة", "التقييمات"]} icon={Star} />

      <div className="reviews-filters">
        <Select label="الحالة" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="كل الحالات" options={STATUS_OPTIONS} />
        <Select label="التقييم" value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }} placeholder="كل التقييمات" options={RATING_OPTIONS} />
        <div className="reviews-filters__actions">
          <Button type="button" variant="secondary" onClick={resetFilters}>إعادة تعيين</Button>
        </div>
      </div>

      <div className="reviews-chips" aria-label="ملخص التقييمات">
        <article className="reviews-chip"><span>الإجمالي</span><strong>{summary?.total ?? 0}</strong></article>
        <article className="reviews-chip"><span>ظاهر</span><strong>{summary?.visible ?? 0}</strong></article>
        <article className="reviews-chip"><span>مخفي</span><strong>{summary?.hidden ?? 0}</strong></article>
      </div>

      <section className="reviews-card" aria-label="قائمة التقييمات">
        <h2>التقييمات</h2>
        <AsyncState loading={list.isLoading} error={list.error} onRetry={list.refetch} empty={false}>
          {items.length === 0 ? (
            <p className="reviews-muted">لا توجد تقييمات مطابقة للفلاتر الحالية.</p>
          ) : (
            <div className="reviews-table-wrap">
              <table className="reviews-table">
                <thead>
                  <tr><th>التقييم</th><th>الطلب</th><th>الاسم</th><th>النجوم</th><th>التعليق</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th></tr>
                </thead>
                <tbody>
                  {items.map((review) => (
                    <ReviewRow key={review.id} review={review} canModerate={canModerate} onChanged={list.refetch} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ServerPagination meta={list.data?.pageMeta} onPageChange={setPage} disabled={list.isFetching} label="تقييم" />
        </AsyncState>
      </section>
    </div>
  );
}
