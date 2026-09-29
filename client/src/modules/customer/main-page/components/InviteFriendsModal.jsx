import React, { useState } from "react";
import { X, Users, Copy, Check, Gift, Share2 } from "lucide-react";

export default function InviteFriendsModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const referralCode = "COFFEE404-FRIENDS";
  const referralLink = "https://404coffee.app/join?ref=FRIENDS404";

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="game-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="game-modal-header">
          <div className="game-title-row">
            <Users size={22} className="game-sparkle-icon" />
            <h3 className="game-main-title">فريق القهوة - ادعُ أصدقاءك</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="game-modal-body">
          <div className="team-intro-box">
            <Gift size={32} className="team-gift-icon" />
            <h4 className="team-promo-title">مشروب مجاني لكل 3 أصدقاء ينضمون!</h4>
            <p className="team-promo-desc">
              شارك رابط الدعوة الخاص بك مع أصدقائك، وعندما يطلبون أول كوب قهوة، ستحصل أنت وهم على قهوة مجانية أو نقاط ولاء فورية.
            </p>
          </div>

          <div className="referral-box-container">
            <span className="referral-label">كود الدعوة الخاص بك:</span>
            <div className="referral-code-display">
              <span className="code-text">{referralCode}</span>
              <button
                type="button"
                className="copy-btn-action"
                onClick={handleCopyLink}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? "تم النسخ!" : "نسخ الرابط"}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            className="spin-action-btn share-btn"
            onClick={handleCopyLink}
          >
            <Share2 size={18} />
            <span>مشاركة الرابط مع أصدقائك</span>
          </button>
        </div>
      </div>
    </div>
  );
}
