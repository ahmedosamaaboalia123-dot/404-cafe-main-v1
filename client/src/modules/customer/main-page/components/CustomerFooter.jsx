import React from "react";
import { Coffee, MapPin, Clock, Phone, Heart } from "lucide-react";

export default function CustomerFooter({ footerData }) {
  const brandName = footerData?.brandName || "Coffee 404";
  const location = footerData?.location || "محافظة البحيرة - مركز ايتاي البارود - شارع ابو بكر الصديق متفرع من شارع مجلس المدينة بجوار كنيسة العذراء مريم";
  const hours = footerData?.hours || "يومياً من 8:00 صباحاً حتى 12:00 منتصف الليل";
  const phone = footerData?.phone || "01000000404";

  return (
    <footer className="customer-page-footer">
      <div className="footer-content-inner">
        <div className="footer-grid-wrapper">
          <div className="footer-col brand-col">
            <div className="footer-brand-title">
              <div className="footer-logo-badge">
                <Coffee size={20} className="footer-coffee-icon" />
              </div>
              <div className="footer-brand-name-group">
                <span className="brand-primary-name">{brandName}</span>
                <span className="brand-tagline">مذاق القهوة المختصة</span>
              </div>
            </div>
            <p className="footer-brand-description">قهوة مختصة ومشروبات طازجة يومياً.</p>
          </div>
          <div className="footer-col info-col">
            <h4 className="footer-col-heading">العنوان وساعات العمل</h4>
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
                <span>{phone}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="footer-bottom-bar">
          <p className="footer-copyright">
            © {new Date().getFullYear()} 404 COFFEE <Heart size={13} className="heart-icon" />
          </p>
        </div>
      </div>
    </footer>
  );
}

