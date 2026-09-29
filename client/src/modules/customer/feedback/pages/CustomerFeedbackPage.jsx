import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, MessageSquarePlus, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CustomerHeader from "../../main-page/components/CustomerHeader";
import CustomerNavDrawer from "../../main-page/components/CustomerNavDrawer";
import CustomerFooter from "../../main-page/components/CustomerFooter";
import RateCafeModal from "../../main-page/components/RateCafeModal";
import { reviewsApi } from "@/modules/admin/reviews/api/reviews.api";
import { customerStorage } from "@/modules/customer/services/customerStorage";
import { listV1CustomerHistory, submitV1PublicReview } from "@/modules/customer/checkout/services/orderGateway";
import { averageRating, isReviewableOrder, reviewSubmitErrorMessage, toReviewCard } from "../services/reviewFlow";
import "../styles/CustomerFeedbackPage.css";
import "../../main-page/styles/CustomerMainPage.css";

const orderLabel = (order) =>
  `طلب رقم ${order.publicOrderNumber || order.orderNumber || order.id}`;

export default function CustomerFeedbackPage() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [gateNotice, setGateNotice] = useState("");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState("");

  const loadReviews = useCallback(async () => {
    try {
      const res = await reviewsApi.publicList({ page: 1, limit: 10 });
      const items = res?.items || res?.data || [];
      return Array.isArray(items) ? items.map(toReviewCard) : [];
    } catch {
      return null;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const [list, history] = await Promise.all([
      loadReviews(),
      listV1CustomerHistory(1).catch(() => ({ items: [] })),
    ]);
    if (list === null) {
      setLoadError("تعذر تحميل التقييمات. تأكد من الاتصال وحاول مجددًا.");
    } else {
      setReviews(list);
    }
    const eligible = (history?.items || [])
      .filter((order) => isReviewableOrder(order))
      .map((order) => {
        const publicNumber = String(order.publicOrderNumber || order.orderNumber || order.id || "");
        const access = customerStorage.getOrderAccess(publicNumber);
        return {
          id: publicNumber,
          label: orderLabel(order),
          version: Number(order.version ?? 0),
          actionToken: access?.orderActionToken || "",
          readToken: access?.trackingReadToken || "",
        };
      })
      .filter((order) => order.id && order.actionToken);
    setEligibleOrders(eligible);
    setSelectedOrderNumber((current) =>
      eligible.some((order) => order.id === current) ? current : (eligible[0]?.id || "")
    );
    setLoading(false);
  }, [loadReviews]);

  useEffect(() => {
    let cancelled = false;
    refreshAll().catch(() => {
      if (!cancelled) {
        setLoadError("تعذر تحميل التقييمات. تأكد من الاتصال وحاول مجددًا.");
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [refreshAll]);

  const navigateTo = (action) => {
    setDrawerOpen(false);
    if (action === "home") navigate("/");
    if (action === "menu") navigate("/menu");
    if (action === "orders") navigate("/customer/orders");
    if (action === "chatbot") navigate("/customer/chatbot");
    if (action === "offers") navigate("/");
    if (action === "rate") handleRateClick();
  };

  const handleRateClick = () => {
    if (!eligibleOrders.length) {
      setGateNotice("التقييم متاح بعد استلام أول طلب من طلباتك.");
      return;
    }
    setGateNotice("");
    setFormOpen(true);
  };

  const selectedOrder = useMemo(
    () => eligibleOrders.find((order) => order.id === selectedOrderNumber) || eligibleOrders[0] || null,
    [eligibleOrders, selectedOrderNumber]
  );

  const handleSubmit = async ({ rating, displayName, comment }) => {
    if (!selectedOrder) throw new Error("اختر الطلب الذي تريد تقييمه أولًا");
    const body = {
      rating,
      comment,
      ...(displayName ? { displayName } : {}),
      expectedOrderVersion: Number(selectedOrder.version ?? 0),
    };
    try {
      await submitV1PublicReview(selectedOrder.id, selectedOrder.actionToken, body);
    } catch (error) {
      if (error?.code === "ORDER_VERSION_CONFLICT") {
        const history = await listV1CustomerHistory(1).catch(() => ({ items: [] }));
        const fresh = (history?.items || []).find(
          (order) => String(order.publicOrderNumber || order.orderNumber || order.id) === String(selectedOrder.id)
        );
        if (fresh) {
          await submitV1PublicReview(selectedOrder.id, selectedOrder.actionToken, {
            ...body,
            expectedOrderVersion: Number(fresh.version ?? 0),
          });
          await refreshAll();
          return;
        }
      }
      throw new Error(reviewSubmitErrorMessage(error));
    }
    await refreshAll();
  };

  const avg = averageRating(reviews);
  const fullStars = avg === null ? 0 : Math.round(avg);

  return (
    <div className="feedback-page" dir="rtl">
      <CustomerHeader cartCount={0} onOpenMenu={() => setDrawerOpen(true)} onOpenCart={() => navigate("/menu")} onNavigateSection={navigateTo} />
      <main className="feedback-shell">
        <header className="feedback-hero">
          <button type="button" onClick={() => navigate(-1)} aria-label="رجوع">
            <ArrowRight size={18} />
            رجوع
          </button>
          <div>
            <span>تجارب حقيقية من عملائنا</span>
            <h1>آراء وتقييمات 404</h1>
            <p>كل رأي يساعدنا نقدم قهوة وتجربة أحسن في كل مرة.</p>
          </div>
          <button type="button" className="feedback-add" onClick={handleRateClick}>
            <MessageSquarePlus size={18} />
            اترك تقييمك
          </button>
        </header>

        {gateNotice && <p className="feedback-notice" role="status">{gateNotice}</p>}

        <section className="feedback-summary" aria-label="متوسط التقييمات">
          <strong>{avg === null ? "—" : avg.toFixed(1)}</strong>
          <div>
            <div className="feedback-stars" aria-label={`متوسط ${fullStars} من 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={18} fill={n <= fullStars ? "currentColor" : "none"} />
              ))}
            </div>
            <span>بناءً على {reviews.length} تقييم {reviews.length ? "حقيقي" : ""}</span>
          </div>
        </section>

        <section className="feedback-grid" aria-label="آراء العملاء">
          {loading ? (
            <p className="feedback-state">جاري التحميل...</p>
          ) : loadError ? (
            <p className="feedback-state feedback-state--error" role="alert">
              {loadError}{" "}
              <button type="button" onClick={refreshAll}>إعادة المحاولة</button>
            </p>
          ) : reviews.length ? (
            reviews.map((review) => (
              <article key={review.id}>
                <div className="feedback-card-head">
                  <span className="feedback-avatar" aria-hidden="true">{review.initial}</span>
                  <div>
                    <strong>{review.name}</strong>
                    <small>{review.date}</small>
                  </div>
                  <div className="feedback-stars" aria-label={`تقييم ${review.rating} من 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={14} fill={n <= review.rating ? "currentColor" : "none"} />
                    ))}
                  </div>
                </div>
                <p>{review.comment}</p>
              </article>
            ))
          ) : (
            <p className="feedback-state">لا توجد تقييمات بعد — كن أول من يقيّم</p>
          )}
        </section>
      </main>
      <CustomerFooter />
      <CustomerNavDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onNavigate={navigateTo} />
      <RateCafeModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        onSubmitted={refreshAll}
        orderHint={selectedOrder ? orderLabel(selectedOrder) : ""}
        orders={eligibleOrders}
        selectedOrderId={selectedOrder?.id || ""}
        onSelectOrder={setSelectedOrderNumber}
      />
    </div>
  );
}
