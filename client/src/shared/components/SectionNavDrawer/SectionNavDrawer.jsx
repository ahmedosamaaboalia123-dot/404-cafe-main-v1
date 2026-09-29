import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  X,
  Home,
  Coffee,
  ClipboardList,
  Star,
  Bot,
  LayoutDashboard,
  Globe,
} from "lucide-react";
import "./SectionNavDrawer.css";

// Single source of truth for the section navigation: the side drawer always
// mirrors the links exposed by the page header.
const NAV_ITEMS = [
  { id: "home", icon: Home },
  { id: "menu", icon: Coffee },
  { id: "orders", icon: ClipboardList },
  { id: "reviews", icon: Star },
  { id: "chatbot", icon: Bot, customerOnly: true },
];

const SECTION_PATHS = (mode, tableNumber) => ({
  home: mode === "table" ? `/table/${tableNumber}` : "/",
  menu: mode === "table" ? `/table/${tableNumber}/menu` : "/menu",
  orders: mode === "table" ? `/table/${tableNumber}/orders` : "/customer/orders",
  reviews: mode === "table" ? `/table/${tableNumber}/feedback` : "/customer/feedback",
});

const sectionLabels = (mode, tableNumber) => ({
  home: "الصفحة الرئيسية",
  menu: mode === "table" ? `منيو طاولة رقم ${tableNumber}` : "المنيو",
  orders: mode === "table" ? `تتبع طلبات طاولة ${tableNumber}` : "تتبع الطلبات",
  reviews: "التقييمات",
  chatbot: "باريستا 404 الذكي",
});

const sectionHints = (mode) => ({
  home: "ارجع لبداية القسم",
  menu: "تصفح كل المشروبات والمأكولات",
  orders: "طلباتك الجارية وفواتيرك",
  reviews: "شارك رأيك في الخدمة",
  chatbot: "مساعدك الذكي لاختيار المشروب",
});

export default function SectionNavDrawer({
  isOpen,
  onClose,
  onNavigate,
  mode = "customer",
  tableNumber = "",
}) {
  const { pathname } = useLocation();
  const closeRef = useRef(null);

  const paths = SECTION_PATHS(mode, tableNumber);
  const labels = sectionLabels(mode, tableNumber);
  const hints = sectionHints(mode);
  const links = NAV_ITEMS.filter((item) => !item.customerOnly || mode !== "table");

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose && onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isActive = (id) =>
    id === "home" ? pathname === paths.home : pathname.startsWith(paths[id]);

  const handleNavigate = (id) => {
    onNavigate && onNavigate(id);
    onClose && onClose();
  };

  return (
    <div className="section-nav-backdrop" onClick={onClose}>
      <aside
        className="section-nav-drawer"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="القائمة الجانبية"
      >
        <header className="section-nav-header">
          <div className="section-nav-brand">
            <span className="section-nav-logo">
              <Coffee size={22} />
            </span>
            <div className="section-nav-brand-texts">
              <strong>404 COFFEE</strong>
              <span>
                {mode === "table"
                  ? `طاولة رقم ${tableNumber} • صالة 404`
                  : "إيتاي البارود - البحيرة"}
              </span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="section-nav-close"
            onClick={onClose}
            aria-label="إغلاق القائمة"
          >
            <X size={20} />
          </button>
        </header>

        <nav className="section-nav-links" aria-label="أقسام الموقع">
          <span className="section-nav-group-title">التنقل</span>
          {links.map(({ id, icon: Icon }) => {
            const active = isActive(id);
            return (
              <button
                key={id}
                type="button"
                className={`section-nav-link${active ? " is-active" : ""}`}
                onClick={() => handleNavigate(id)}
                aria-current={active ? "page" : undefined}
              >
                <span className="section-nav-link-icon">
                  <Icon size={19} />
                </span>
                <span className="section-nav-link-texts">
                  <strong>{labels[id]}</strong>
                  <small>{hints[id]}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <footer className="section-nav-footer">
          {mode === "table" && (
            <a className="section-nav-footer-link" href="/customer" onClick={onClose}>
              <Globe size={16} />
              <span>الانتقال لموقع العميل</span>
            </a>
          )}
          <a className="section-nav-footer-link" href="/admin/dashboard" onClick={onClose}>
            <LayoutDashboard size={16} />
            <span>لوحة تحكم الإدارة</span>
          </a>
          <p className="section-nav-hours">مفتوح يومياً من 8 صباحاً حتى 12 منتصف الليل</p>
        </footer>
      </aside>
    </div>
  );
}
