import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CustomerHeader from "../components/CustomerHeader";
import HeroBanner from "../components/HeroBanner";
import SearchBar from "../components/SearchBar";
import CategoryCards from "../components/CategoryCards";
import BestSellersSection from "../components/BestSellersSection";
import CustomerReviews from "../components/CustomerReviews";
import BranchInfoCard from "../components/BranchInfoCard";
import CustomerFooter from "../components/CustomerFooter";
import CustomerBottomNav from "../components/CustomerBottomNav";

// Modals and Drawers
import AiBotModal from "../components/AiBotModal";
import FortuneWheelModal from "../components/FortuneWheelModal";
import PersonalityQuizModal from "../components/PersonalityQuizModal";
import InviteFriendsModal from "../components/InviteFriendsModal";
import NotificationsModal from "../components/NotificationsModal";
import CartDrawer from "../components/CartDrawer";
import CustomerNavDrawer from "../components/CustomerNavDrawer";
import TrackOrdersModal from "../components/TrackOrdersModal";
import OrderCheckoutModal from "../../checkout/components/OrderCheckoutModal";
import OrderSuccessModal from "../../checkout/components/OrderSuccessModal";
import { useCreatePublicOrder } from "../../checkout/hooks/useCreatePublicOrder";

import { MAIN_PAGE_DATA } from "../data/mainPageData";
import { getTopProducts, getPublicMenu, getPublicCategories } from "@/services/catalogService";
import { reviewsApi } from "@/modules/admin/reviews/api/reviews.api";
import { toReviewCard } from "@/modules/customer/feedback/services/reviewFlow";
import "../styles/CustomerMainPage.css";

export default function CustomerMainPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("coffee");
  const [activeBottomTab, setActiveBottomTab] = useState("home");
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals & Drawers states
  const [isAiBotOpen, setIsAiBotOpen] = useState(false);
  const [isWheelOpen, setIsWheelOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isTrackOrdersOpen, setIsTrackOrdersOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const createOrder = useCreatePublicOrder();

  // Cart items state (persisted locally so refresh before checkout keeps the cart)
  const [cartItems, setCartItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("404_customer_cart_v1") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("404_customer_cart_v1", JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  // Real data from backend
  const [topProducts, setTopProducts] = useState(null);
  const [realCategories, setRealCategories] = useState([]);
  const [latestReviews, setLatestReviews] = useState([]);
  const CAFE_BRANCH = {
    name: "فرع ايتاي البارود",
    address: "محافظة البحيرة - مركز ايتاي البارود - شارع ابو بكر الصديق متفرع من شارع مجلس المدينة بجوار كنيسة العذراء مريم",
    mapUrl: "https://www.google.com/maps?q=30.882471084594727,30.66588020324707&z=17&hl=en",
    hours: "يوميا 8ص - 12ص",
    phone: "01000000404",
    image: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=800&q=80",
    reception: "نستقبلك يومياً",
    singleBranchText: "فرع واحد فقط",
    tagline: "أقرب إليك دائماً",
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([getTopProducts({ limit: 4 }), getPublicMenu()]).then(([tops, menu]) => {
      if (cancelled) return;
      const items = Array.isArray(menu?.items) ? menu.items : [];
      const catalogById = new Map(items.map((p) => [String(p.id), p]));
      const joined = (Array.isArray(tops) ? tops : [])
        .map((t) => catalogById.get(String(t.productId)))
        .filter(Boolean);
      setTopProducts(joined);
    });
    getPublicCategories().then((cats) => { if (!cancelled) setRealCategories(Array.isArray(cats) ? cats.filter((c) => c.isActive !== false) : []); });
    reviewsApi.publicList({ page: 1, limit: 3 }).then((res) => { if (cancelled) return; const items = res?.items || res?.data || []; setLatestReviews(Array.isArray(items) ? items.slice(0,3).map(toReviewCard) : []); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const cartCount = useMemo(
    () => cartItems.reduce((acc, it) => acc + it.quantity, 0),
    [cartItems]
  );

  // Filter: top products filtered by search (name + category)
  const bestSellers = topProducts ?? [];
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bestSellers;
    return bestSellers.filter((prod) => {
      const name = String(prod.name || "").toLowerCase();
      const cat = String(prod.categoryName || prod.category || "").toLowerCase();
      return name.includes(q) || cat.includes(q);
    });
  }, [searchQuery, bestSellers]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddToCart = (product) => {
    const existing = cartItems.find((it) => it.id === product.id);
    if (existing) {
      setCartItems(
        cartItems.map((it) =>
          it.id === product.id ? { ...it, quantity: it.quantity + 1 } : it
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
        },
      ]);
    }

    setRecentlyAddedId(product.id);
    showToast(`تمت إضافة ${product.name} إلى سلة الطلبات ☕`);
    setTimeout(() => setRecentlyAddedId(null), 1800);
  };

  const handleUpdateQuantity = (id, newQty) => {
    if (newQty <= 0) {
      setCartItems(cartItems.filter((it) => it.id !== id));
    } else {
      setCartItems(
        cartItems.map((it) =>
          it.id === id ? { ...it, quantity: newQty } : it
        )
      );
    }
  };

  const handleRemoveCartItem = (id) => {
    setCartItems(cartItems.filter((it) => it.id !== id));
  };

  const handleNavDrawerAction = (action) => {
    setIsNavDrawerOpen(false);
    if (action === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (action === "menu") {
      navigate("/menu");
    } else if (action === "orders" || action === "track") {
      navigate("/customer/orders");
    } else if (action === "table") {
      navigate("/table/4");
    } else if (action === "chatbot" || action === "bot") {
      navigate("/customer/chatbot");
    } else if (action === "reviews") {
      document.getElementById("reviews-anchor")?.scrollIntoView({ behavior: "smooth" });
    } else if (action === "branch") {
      document.getElementById("branch-anchor")?.scrollIntoView({ behavior: "smooth" });
    } else if (action === "rate") {
      navigate("/customer/feedback");
    }
  };

  const handleBottomTabChange = (tabId) => {
    setActiveBottomTab(tabId);
    if (tabId === "orders") {
      navigate("/customer/orders");
    } else if (tabId === "menu") {
      navigate("/menu");
    } else if (tabId === "profile") {
      navigate("/customer/feedback");
    } else if (tabId === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="customer-app-wrapper" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-float-pill">
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="customer-mobile-viewport">
        {/* 1. Header with 404 COFFEE EST. 2025, Location, and Notifications */}
        <CustomerHeader
          cartCount={cartCount}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenProfile={() => navigate("/customer/feedback")}
          onOpenMenu={() => setIsNavDrawerOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenLocationModal={() => {
            document.getElementById("branch-anchor")?.scrollIntoView({ behavior: "smooth" });
          }}
          onNavigateSection={handleNavDrawerAction}
        />

        {/* Main Content Flow */}
        <main className="customer-page-content">
          {/* 2. Hero Banner: المزاج مش موجود؟ القهوة موجودة. */}
          <HeroBanner
            onOrderNow={() => navigate("/menu")}
            onOpenAiBot={() => navigate("/customer/chatbot")}
            onOpenWaiter={() => navigate("/customer/chatbot")}
            onOpenOrders={() => navigate("/customer/orders")}
          />

          {/* 3. Search Bar & Filter Button */}
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onToggleCategoryFilter={() => {
              navigate("/menu");
            }}
            onSearchSubmit={() => navigate(`/menu?search=${encodeURIComponent(searchQuery)}`)}
          />

          {/* 4. Category Cards — real categories only */}
          <CategoryCards
            categories={realCategories.length ? realCategories : []}
            selectedCategory={selectedCategory}
            onSelectCategory={(id) => {
              setSelectedCategory(id);
              navigate(`/menu?category=${encodeURIComponent(id)}`);
            }}
          />

          {/* 5. Most Popular / Best Sellers Section (الأكثر طلباً) */}
          <BestSellersSection
            products={filteredProducts.slice(0, 4)}
            onAddToCart={handleAddToCart}
            onViewAll={() => navigate("/menu")}
            addedItemId={recentlyAddedId}
          />

          <CustomerReviews
            reviews={latestReviews.length ? latestReviews : []}
            onViewAllReviews={() => navigate("/customer/feedback")}
            onAddReview={() => navigate("/customer/feedback")}
          />

          {/* 8. Branch Info Card */}
          <BranchInfoCard
            branchData={CAFE_BRANCH}
            onOpenLocationDetails={() => window.open(CAFE_BRANCH.mapUrl, "_blank")}
          />

          {/* 9. Comprehensive Responsive Footer */}
          <CustomerFooter footerData={MAIN_PAGE_DATA.footer} />
        </main>

        {/* 10. Bottom Navigation Bar (Mobile / Tablet) */}
        <CustomerBottomNav
          activeTab={activeBottomTab}
          onChangeTab={handleBottomTabChange}
          cartCount={cartCount}
        />

        {/* Interactive Modals & Drawers */}
        <AiBotModal
          isOpen={isAiBotOpen}
          onClose={() => setIsAiBotOpen(false)}
        />

        <FortuneWheelModal
          isOpen={isWheelOpen}
          onClose={() => setIsWheelOpen(false)}
          onWinPrize={(prize) => {
            showToast(`مبروك! ربحت ${prize.label}`);
          }}
        />

        <PersonalityQuizModal
          isOpen={isQuizOpen}
          onClose={() => setIsQuizOpen(false)}
          onFinishQuiz={(drink) => {
            showToast(`تمت إضافة +${drink.points} نقطة لمشروب ${drink.name}!`);
          }}
        />

        <InviteFriendsModal
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
        />

        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={MAIN_PAGE_DATA.notifications}
        />

        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveCartItem}
          onCheckout={() => {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
          }}
          onEditItem={(item) => {
            setIsCartOpen(false);
            navigate(`/product/${item.productId || item.id}`);
          }}
        />

        <OrderCheckoutModal
          isOpen={isCheckoutOpen}
          items={cartItems}
          onClose={() => setIsCheckoutOpen(false)}
          onSubmit={async (checkoutData) => {
            const order = await createOrder.mutateAsync(checkoutData);
            setIsCheckoutOpen(false);
            setCompletedOrder(order);
            setCartItems([]);
          }}
        />

        <OrderSuccessModal
          order={completedOrder}
          onClose={() => setCompletedOrder(null)}
          onTrack={(order) => {
            const code = order.orderNumber || order.publicCode || order.id;
            const token = order.trackingToken ? `?token=${encodeURIComponent(order.trackingToken)}` : "";
            navigate(`/customer/orders/${code}/track${token}`);
          }}
        />

        <CustomerNavDrawer
          isOpen={isNavDrawerOpen}
          onClose={() => setIsNavDrawerOpen(false)}
          onNavigate={handleNavDrawerAction}
        />

        <TrackOrdersModal
          isOpen={isTrackOrdersOpen}
          onClose={() => setIsTrackOrdersOpen(false)}
          orders={MAIN_PAGE_DATA.sampleOrders}
        />
      </div>
    </div>
  );
}
