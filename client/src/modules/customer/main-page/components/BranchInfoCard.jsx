import React from "react";
import { MapPin, Clock, Phone, ExternalLink } from "lucide-react";

export default function BranchInfoCard({ branchData, onOpenLocationDetails }) {
  const branch = branchData || {
    name: "فرع إيتاي البارود - البحيرة",
    address: "العنوان: إيتاي البارود - البحيرة",
    reception: "نستقبلك يومياً",
    hours: "من 8 صباحاً - 12 منتصف الليل",
    singleBranchText: "فرع واحد فقط",
    tagline: "أقرب إليك دائماً",
    phone: "0100 000 0404",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
  };

  return (
    <section className="branch-info-section" aria-label="معلومات الفرع" id="branch-anchor">
      <div className="branch-card-container">
        {/* Right side in RTL: Cozy Interior Photo */}
        <div className="branch-photo-wrapper">
          <img
            src={branch.image}
            alt="404 Coffee Itay El Baroud Branch"
            className="branch-interior-img"
            loading="lazy"
          />
        </div>

        {/* Center in RTL: Branch name, address & operating hours */}
        <div className="branch-details-center">
          <h3 className="branch-name-title">{branch.name}</h3>
          <p className="branch-address-text">{branch.address}</p>
          <div className="branch-hours-status">
            <span className="reception-label">{branch.reception}</span>
            <div className="hours-with-indicator">
              <span className="live-status-dot" title="الفرع مفتوح حالياً" />
              <span className="hours-time-text">{branch.hours}</span>
            </div>
          </div>
        </div>

        {/* Left side in RTL: Location Pin & Badge */}
        <div className="branch-badge-left" onClick={onOpenLocationDetails} role="button" tabIndex={0}>
          <div className="branch-pin-icon-wrap">
            <MapPin size={22} className="branch-map-pin" />
          </div>
          <span className="single-branch-pill">{branch.singleBranchText}</span>
          <span className="branch-tagline-text">{branch.tagline}</span>
        </div>
      </div>
    </section>
  );
}
