import React from "react";
import { MapPin, Wifi, Zap, Music, CheckCircle } from "lucide-react";
import { useTable } from "../../context/TableContext";

export default function TableBranchAndAmenitiesCard({ branchData, onOpenLocationDetails }) {
  const { tableNumber } = useTable();

  const branch = branchData || {
    name: "فرع إيتاي البارود - البحيرة",
    address: "العنوان: إيتاي البارود - البحيرة (شارع الجمهورية)",
    reception: "خدمة الصالة والطاولات",
    hours: "من 8 صباحاً - 12 منتصف الليل",
    singleBranchText: `طاولة رقم #${tableNumber}`,
    tagline: "خدمة ضيافة 5 نجوم",
    phone: "0100 000 0404",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
  };

  return (
    <section className="branch-info-section" aria-label="خدمات وضيافة الطاولة" id="branch-anchor">
      <div className="branch-card-container">
        {/* Right side in RTL: Cozy Interior Photo */}
        <div className="branch-photo-wrapper">
          <img
            src={branch.image}
            alt="404 Coffee Table Dining"
            className="branch-interior-img"
            loading="lazy"
          />
        </div>

        {/* Center in RTL: Branch name, address & operating hours */}
        <div className="branch-details-center">
          <h3 className="branch-name-title">{branch.name}</h3>
          <p className="branch-address-text">{branch.address}</p>

          {/* Table Amenities Chips */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "8px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                background: "#EFE4D8",
                color: "#593215",
                padding: "3px 8px",
                borderRadius: "10px",
                fontWeight: 700,
              }}
            >
              <Wifi size={13} /> واي فاي مجاني: 404_GUEST
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                background: "#EFE4D8",
                color: "#593215",
                padding: "3px 8px",
                borderRadius: "10px",
                fontWeight: 700,
              }}
            >
              <Zap size={13} /> منافذ شحن سريعة
            </span>
          </div>
        </div>

        {/* Left side in RTL: Table Badge */}
        <div className="branch-badge-left" onClick={onOpenLocationDetails} role="button" tabIndex={0}>
          <div className="branch-pin-icon-wrap" style={{ background: "#593215", color: "#FFFFFF" }}>
            <span style={{ fontSize: "1.1rem" }}>🪑</span>
          </div>
          <span className="single-branch-pill">{branch.singleBranchText}</span>
          <span className="branch-tagline-text">{branch.tagline}</span>
        </div>
      </div>
    </section>
  );
}
