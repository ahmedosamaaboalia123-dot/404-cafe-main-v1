import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { reviewsApi } from "@/modules/admin/reviews/api/reviews.api";
import RateCafeModal from "@/modules/customer/main-page/components/RateCafeModal";
import { useTable } from "@/modules/table/context/TableContext";
import { getActiveTableOrder, submitV1TableReview } from "@/modules/table/services/tableGateway";
import { reviewSubmitErrorMessage, toReviewCard } from "@/modules/customer/feedback/services/reviewFlow";
import "../../styles/TableExperience.css";

const REAL_ID = /^[a-f\d]{24}$/i;

export default function TableFeedbackPage() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const { activeOrder, tableNumber, tableToken, refreshTableData } = useTable();
  const [open, setOpen] = useState(false);
  const [gateNotice, setGateNotice] = useState("");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refreshReviews = useCallback(async () => {
    try {
      const res = await reviewsApi.publicList({ page: 1, limit: 10 });
      const items = res?.items || res?.data || [];
      return Array.isArray(items) ? items.map(toReviewCard) : [];
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    refreshReviews().then((list) => {
      if (cancelled) return;
      if (list === null) {
        setLoadError("تعذر تحميل التقييمات. تأكد من الاتصال وحاول مجددًا.");
      } else {
        setReviews(list);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [refreshReviews]);

  const reviewableOrder =
    activeOrder && REAL_ID.test(String(activeOrder.id || "")) ? activeOrder : null;

  const handleRateClick = () => {
    if (!reviewableOrder) {
      setGateNotice("التقييم متاح عند وجود طلب شغال على هذه الطاولة.");
      return;
    }
    setGateNotice("");
    setOpen(true);
  };

  const handleSubmit = async ({ rating, displayName, comment }) => {
    if (!reviewableOrder) throw new Error("لا يوجد طلب شغال على هذه الطاولة");
    const body = {
      rating,
      comment,
      ...(displayName ? { displayName } : {}),
      expectedOrderVersion: Number(reviewableOrder.version ?? 0),
    };
    try {
      await submitV1TableReview(reviewableOrder.id, tableToken, body);
    } catch (error) {
      if (error?.code === "ORDER_VERSION_CONFLICT" && tableNumber) {
        const fresh = await getActiveTableOrder(tableNumber, tableToken).catch(() => null);
        if (fresh?.id) {
          await submitV1TableReview(fresh.id, tableToken, {
            ...body,
            expectedOrderVersion: Number(fresh.version ?? 0),
          });
          await refreshTableData?.();
          const list = await refreshReviews();
          if (list !== null) setReviews(list);
          return;
        }
      }
      throw new Error(reviewSubmitErrorMessage(error));
    }
    await refreshTableData?.();
    const list = await refreshReviews();
    if (list !== null) setReviews(list);
  };

  return (
    <div className="table-experience-page" dir="rtl">
      <header>
        <button type="button" onClick={() => navigate(`/table/${tableId}`)} aria-label="الرئيسية">
          <ArrowRight />
          الرئيسية
        </button>
        <div>
          <span>404 COFFEE</span>
          <strong>آراء ضيوفنا</strong>
        </div>
        <button type="button" className="primary" onClick={handleRateClick}>اترك تقييمك</button>
      </header>
      <main>
        <div className="experience-hero">
          <span>تقييمات حقيقية</span>
          <h1>رأيك يصنع تجربة أفضل</h1>
          <p>شاهد آراء ضيوف 404 وشاركنا تجربتك.</p>
        </div>
        {gateNotice && <p className="table-feedback-notice" role="status">{gateNotice}</p>}
        {loading ? (
          <p className="table-feedback-state">جاري تحميل التقييمات...</p>
        ) : loadError ? (
          <p className="table-feedback-state table-feedback-state--error" role="alert">
            {loadError}{" "}
            <button type="button" onClick={() => window.location.reload()}>إعادة المحاولة</button>
          </p>
        ) : reviews.length ? (
          <div className="feedback-cards">
            {reviews.map((r) => (
              <article key={r.id}>
                <div aria-label={`تقييم ${r.rating} من 5`}>
                  {Array.from({ length: 5 }).map((_, n) => (
                    <Star key={n} size={15} fill={n < r.rating ? "currentColor" : "none"} />
                  ))}
                </div>
                <p>“{r.comment}”</p>
                <strong>{r.name}</strong>
              </article>
            ))}
          </div>
        ) : (
          <p className="table-feedback-state">لا توجد تقييمات بعد</p>
        )}
      </main>
      <RateCafeModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        onSubmitted={() => {}}
        orderHint={reviewableOrder ? `طلب رقم ${reviewableOrder.orderNumber || ""}` : ""}
      />
    </div>
  );
}
