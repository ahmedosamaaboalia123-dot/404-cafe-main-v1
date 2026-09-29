import React from "react";
import { Link } from "react-router-dom";
import { Coffee, MapPin, Clock, Phone, LayoutDashboard, Heart } from "lucide-react";
import { useTable } from "../../context/TableContext";

export default function TableFooter({ footerData }) {
  const { tableNumber } = useTable();
  const brandName = footerData?.brandName || "404 COFFEE";
  const location = footerData?.location || "إيتاي البارود - البحيرة (شارع الجمهورية - أمام المحطة)";
  const hours = footerData?.hours || "يومياً من 8:00 صباحاً حتى 12:00 منتصف الليل";
  const phone = footerData?.phone || "0100 000 0404";

  return (
    <footer className="customer-page-footer">
      <div className="footer-content-inner">
        {/* Desktop Columns Grid */}
        <div className="footer-grid-wrapper">
          {/* Col 1: Brand & Table Bio */}
          <div className="footer-col brand-col">
            <div className="footer-brand-title">
              <div className="footer-logo-badge">
                <Coffee size={20} className="footer-coffee-icon" />
              </div>
              <div className="footer-brand-name-group">
                <span className="brand-primary-name">{brandName}</span>
                <span className="brand-tagline">خدمة الضيافة المباشرة - طاولة #{tableNumber}</span>
              </div>
            </div>
            <p className="footer-brand-description">
              استمتع بأفضل قهوة مختصة وحلويات طازجة في صالة 404 مع خدمة سريعة لطاولتك دون الحاجة للانتظار في الطابور.
            </p>
          </div>

          {/* Col 2: Info & Hours */}
          <div className="footer-col info-col">
            <h4 className="footer-col-heading">معلومات والتواصل</h4>
            <div className="footer-meta-info">
              <p className="footer-meta-item">
                <MapPin size={16} className="meta-icon" />
                <span>{location}</span>
              </p>
              <p className="footer-meta-item">
                <Clock size={16} className="meta-icon" />
                <span>{hours}</span>
              </p>
              <p className="footer-meta-item">
                <Phone size={16} className="meta-icon" />
                <span>خدمة الكابتن والويتر: {phone}</span>
              </p>
            </div>
          </div>

          {/* Col 3: Quick Navigation */}
          <div className="footer-col nav-col">
            <h4 className="footer-col-heading">روابط الطاولة السريعة</h4>
            <ul className="footer-nav-list">
              <li>
                <Link to={`/table/${tableNumber}/menu`} className="footer-nav-link">
                  منيو طاولة #{tableNumber}
                </Link>
              </li>
              <li>
                <Link to={`/table/${tableNumber}/orders`} className="footer-nav-link">
                  طلبات وفواتير الطاولة
                </Link>
              </li>
              <li>
                <Link to={`/table/${tableNumber}/chatbot`} className="footer-nav-link">
                  باريستا 404 الذكي
                </Link>
              </li>
              <li>
                <Link to="/customer" className="footer-nav-link">
                  الانتقال لطلب الأونلاين (دليفري/استلام)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Admin Portal */}
        <div className="footer-bottom-bar">
          <p className="footer-copyright-text">
            جميع الحقوق محفوظة © {new Date().getFullYear()} كافيه 404 COFFEE (EST. 2025). صُنع بـ{" "}
            <Heart size={14} className="heart-icon inline-block text-red-500" /> لضيوف الصالة.
          </p>

          <Link to="/admin/dashboard" className="footer-admin-link">
            <LayoutDashboard size={14} />
            <span>لوحة تحكم الإدارة</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
