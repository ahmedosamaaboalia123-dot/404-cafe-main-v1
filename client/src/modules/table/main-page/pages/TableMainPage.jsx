import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTable } from "../../context/TableContext";

// Modular Main-Page Sub-Components
import TableActiveOrderHeroBar from "../components/TableActiveOrderHeroBar";
import TableNavDrawer from "../components/TableNavDrawer";
import CustomerHeader from "../../../customer/main-page/components/CustomerHeader";
import TableHeroBanner from "../components/TableHeroBanner";
import SearchBar from "../../../customer/main-page/components/SearchBar";
import CategoryCards from "../../../customer/main-page/components/CategoryCards";
import BestSellersSection from "../../../customer/main-page/components/BestSellersSection";
import TableReviewsSection from "../components/TableReviewsSection";
import BranchInfoCard from "../../../customer/main-page/components/BranchInfoCard";
import CustomerFooter from "../../../customer/main-page/components/CustomerFooter";
import CustomerBottomNav from "../../../customer/main-page/components/CustomerBottomNav";

// Shared Modals & Drawers
import CallWaiterModal from "../../components/CallWaiterModal";
import TableSelectorModal from "../../components/TableSelectorModal";
import TableCartDrawer from "../../components/TableCartDrawer";
import TableInvoiceModal from "../../components/TableInvoiceModal";
import AiBotModal from "../../../customer/main-page/components/AiBotModal";
import FortuneWheelModal from "../../../customer/main-page/components/FortuneWheelModal";
import PersonalityQuizModal from "../../../customer/main-page/components/PersonalityQuizModal";
import InviteFriendsModal from "../../../customer/main-page/components/InviteFriendsModal";
import NotificationsModal from "../../../customer/main-page/components/NotificationsModal";
import TrackOrdersModal from "../../../customer/main-page/components/TrackOrdersModal";

// Data & Styles
import { MAIN_PAGE_DATA } from "../../../customer/main-page/data/mainPageData";
import { getTopProducts, getPublicMenu, getPublicCategories } from "@/services/catalogService";
import { reviewsApi } from "@/modules/admin/reviews/api/reviews.api";
import "../../../customer/main-page/styles/CustomerMainPage.css";
import "../../styles/TableModule.css";

export default function TableMainPage() {
  const navigate = useNavigate();
  const {
    tableNumber,
    activeOrder,
    addToTableCart,
    tableCart,
    totalCartItemsCount,
    isWaiterModalOpen,
    setIsWaiterModalOpen,
    isTableSelectorOpen,
    setIsTableSelectorOpen,
    isCartOpen,
    setIsCartOpen,
    toastMessage,
    triggerRequestBill,
    accessError,
    hasTableAccess,
  } = useTable();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("coffee");
  const [activeBottomTab, setActiveBottomTab] = useState("home");
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);
  const [localToast, setLocalToast] = useState(null);
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
    reviewsApi.publicList({ page: 1, limit: 3 }).then((res) => { if (cancelled) return; const items = res?.items || res?.data || []; setLatestReviews(Array.isArray(items) ? items.slice(0,3) : []); }).catch(()=>{});
    return () => { cancelled = true; };
  }, []);

  // Modals state
  const [isAiBotOpen, setIsAiBotOpen] = useState(false);
  const [isWheelOpen, setIsWheelOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isTrackOrdersOpen, setIsTrackOrdersOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  const showToast = (msg) => {
    setLocalToast(msg);
    setTimeout(() => setLocalToast(null), 3000);
  };

  // Filter: top products by search (name + category)
  const bestSellers = topProducts ?? [];
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bestSellers;
    return bestSellers.filter((prod) => {
      const name = String(prod.name||"").toLowerCase();
      const cat = String(prod.categoryName||prod.category||"").toLowerCase();
      return name.includes(q) || cat.includes(q);
    });
  }, [searchQuery, bestSellers]);

  const handleAddToCart = (product) => {
    addToTableCart(product, 1, "طاولة #" + tableNumber);
    setRecentlyAddedId(product.id);
    showToast(`تمت إضافة ${product.name} إلى سلة طاولة ${tableNumber} ☕`);
    setTimeout(() => setRecentlyAddedId(null), 1800);
  };

  const handleNavDrawerAction = (action) => {
    setIsNavDrawerOpen(false);
    if (action === "home") {
      navigate(`/table/${tableNumber}`);
    } else if (action === "menu") {
      navigate(`/table/${tableNumber}/menu`);
    } else if (action === "orders" || action === "track") {
      navigate(`/table/${tableNumber}/orders`);
    } else if (action === "waiter") {
      setIsWaiterModalOpen(true);
    } else if (action === "table_switch") {
      setIsTableSelectorOpen(true);
    } else if (action === "games" || action === "reviews" || action === "rate") {
      navigate(`/table/${tableNumber}/feedback`);
    }
  };

  const handleBottomTabChange = (tabId) => {
    setActiveBottomTab(tabId);
    if (tabId === "orders") {
      navigate(`/table/${tableNumber}/orders`);
    } else if (tabId === "menu") {
      navigate(`/table/${tableNumber}/menu`);
    } else if (tabId === "cart") {
      setIsCartOpen(true);
    } else if (tabId === "profile") {
      navigate(`/table/${tableNumber}/feedback`);
    } else if (tabId === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const activeToast = toastMessage || localToast;

  if (!hasTableAccess) return <main className="customer-app-wrapper" dir="rtl" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}><section className="customer-mobile-viewport" style={{ padding: 24, textAlign: "center" }}><h1>جاري تجهيز الطاولة...</h1><p role={accessError ? "alert" : undefined}>{accessError || "لحظات ويتم تحميل القائمة."}</p></section></main>;

  return (
    <div className="customer-app-wrapper" dir="rtl">
      {/* Toast Notification */}
      {activeToast && (
        <div className="toast-float-pill">
          <span>{activeToast}</span>
        </div>
      )}

      <div className="customer-mobile-viewport">
        {/* 1. Header with 404 COFFEE EST. 2025, Table Badge, Notifications, and Cart */}
        <CustomerHeader
          tableNumber={tableNumber}
          cartCount={totalCartItemsCount}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenMenu={() => setIsNavDrawerOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onNavigateSection={handleNavDrawerAction}
        />

        {/* Main Content Flow */}
        <main className="customer-page-content">
          {/* Pinned Active Order Bar if table has an active order */}
          {activeOrder && (
            <TableActiveOrderHeroBar
              onOpenInvoice={(ord) => setSelectedInvoiceOrder(ord || activeOrder)}
            />
          )}

          {/* 2. Hero Banner — بدون روبوت */}
          <TableHeroBanner
            onOrderNow={() => navigate(`/table/${tableNumber}/menu`)}
            onCallWaiter={() => navigate(`/table/${tableNumber}/services`)}
            onTrackOrder={() => navigate(`/table/${tableNumber}/orders`)}
          />

          {/* 4. Search Bar & Filter Button */}
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchSubmit={() => navigate(`/table/${tableNumber}/menu?search=${encodeURIComponent(searchQuery)}`)}
            onToggleCategoryFilter={() => navigate(`/table/${tableNumber}/menu`)}
          />

          {/* 5. Category Cards — real only */}
          <CategoryCards
            categories={realCategories.length ? realCategories : []}
            selectedCategory={selectedCategory}
            onSelectCategory={(id) => {
              setSelectedCategory(id);
              navigate(`/table/${tableNumber}/menu?category=${encodeURIComponent(id)}`);
            }}
          />

          {/* 6. Most Popular / Best Sellers Section (الأكثر طلباً لطاولات 404) */}
          <BestSellersSection
            products={filteredProducts.slice(0, 4)}
            onAddToCart={handleAddToCart}
            onViewAll={() => navigate(`/table/${tableNumber}/menu`)}
            addedItemId={recentlyAddedId}
          />

          <TableReviewsSection reviews={latestReviews} onMore={() => navigate(`/table/${tableNumber}/feedback`)} onAdd={() => navigate(`/table/${tableNumber}/feedback`)} />

          {/* 9. Branch Info Card */}
          <BranchInfoCard
            branchData={CAFE_BRANCH}
            onOpenLocationDetails={() => window.open(CAFE_BRANCH.mapUrl, "_blank")}
          />

          {/* 10. Comprehensive Responsive Footer */}
          <CustomerFooter footerData={MAIN_PAGE_DATA.footer} />
        </main>

        {/* 11. Bottom Navigation Bar (Mobile / Tablet) */}
        <CustomerBottomNav
          activeTab={activeBottomTab}
          onChangeTab={handleBottomTabChange}
          cartCount={totalCartItemsCount}
        />

        {/* Interactive Modals & Drawers */}
        <CallWaiterModal
          isOpen={isWaiterModalOpen}
          onClose={() => setIsWaiterModalOpen(false)}
        />

        <TableSelectorModal
          isOpen={isTableSelectorOpen}
          onClose={() => setIsTableSelectorOpen(false)}
        />

        <TableCartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
        />

        <TableInvoiceModal
          isOpen={Boolean(selectedInvoiceOrder)}
          onClose={() => setSelectedInvoiceOrder(null)}
          order={selectedInvoiceOrder}
        />

        <AiBotModal
          isOpen={isAiBotOpen}
          onClose={() => setIsAiBotOpen(false)}
        />

        <FortuneWheelModal
          isOpen={isWheelOpen}
          onClose={() => setIsWheelOpen(false)}
          onWinPrize={(prize) => {
            showToast(`مبروك! ربحت ${prize.label} لطاولة ${tableNumber}`);
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

        <TrackOrdersModal
          isOpen={isTrackOrdersOpen}
          onClose={() => setIsTrackOrdersOpen(false)}
          orders={MAIN_PAGE_DATA.sampleOrders}
        />

        <TableNavDrawer
          isOpen={isNavDrawerOpen}
          onClose={() => setIsNavDrawerOpen(false)}
          onNavigate={handleNavDrawerAction}
        />

      </div>
    </div>
  );
}
