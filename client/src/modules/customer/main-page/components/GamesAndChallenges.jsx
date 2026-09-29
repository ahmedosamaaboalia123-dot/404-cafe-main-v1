import React from "react";
import { ChevronLeft, ArrowLeft, Disc3, Trophy, Users } from "lucide-react";

export default function GamesAndChallenges({
  onOpenWheel,
  onOpenPersonalityQuiz,
  onOpenInviteFriends,
  onViewAllGames,
}) {
  const getGameIcon = (type) => {
    switch (type) {
      case "wheel":
        return (
          <div className="game-line-icon wheel-icon-wrap">
            <svg viewBox="0 0 48 48" className="line-art-svg">
              <circle cx="24" cy="24" r="18" fill="none" stroke="#9A7B56" strokeWidth="2" />
              <circle cx="24" cy="24" r="4" fill="#9A7B56" />
              <line x1="24" y1="6" x2="24" y2="42" stroke="#9A7B56" strokeWidth="1.5" />
              <line x1="6" y1="24" x2="42" y2="24" stroke="#9A7B56" strokeWidth="1.5" />
              <line x1="11" y1="11" x2="37" y2="37" stroke="#9A7B56" strokeWidth="1.5" />
              <line x1="37" y1="11" x2="11" y2="37" stroke="#9A7B56" strokeWidth="1.5" />
              <path d="M16,42 L24,47 L32,42" fill="none" stroke="#9A7B56" strokeWidth="2" />
            </svg>
          </div>
        );
      case "trophy":
        return (
          <div className="game-line-icon trophy-icon-wrap">
            <svg viewBox="0 0 48 48" className="line-art-svg">
              <path d="M14,10 L34,10 L31,24 C31,29 27,33 24,33 C21,33 17,29 17,24 Z" fill="none" stroke="#9A7B56" strokeWidth="2" />
              <path d="M14,14 L8,14 C6,14 6,22 10,24 L15,24" fill="none" stroke="#9A7B56" strokeWidth="1.5" />
              <path d="M34,14 L40,14 C42,14 42,22 38,24 L33,24" fill="none" stroke="#9A7B56" strokeWidth="1.5" />
              <line x1="24" y1="33" x2="24" y2="40" stroke="#9A7B56" strokeWidth="2" />
              <line x1="16" y1="40" x2="32" y2="40" stroke="#9A7B56" strokeWidth="2" />
              <circle cx="24" cy="20" r="3" fill="#9A7B56" />
            </svg>
          </div>
        );
      case "team":
        return (
          <div className="game-line-icon team-icon-wrap">
            <svg viewBox="0 0 48 48" className="line-art-svg">
              <circle cx="16" cy="14" r="5" fill="none" stroke="#9A7B56" strokeWidth="2" />
              <path d="M8,34 C8,27 12,23 16,23 C20,23 24,27 24,34" fill="none" stroke="#9A7B56" strokeWidth="2" />
              <circle cx="32" cy="14" r="5" fill="none" stroke="#9A7B56" strokeWidth="2" />
              <path d="M24,34 C24,27 28,23 32,23 C36,23 40,27 40,34" fill="none" stroke="#9A7B56" strokeWidth="2" />
              <circle cx="24" cy="10" r="2" fill="#9A7B56" />
            </svg>
          </div>
        );
      default:
        return <Trophy size={28} className="fallback-game-icon" />;
    }
  };

  return (
    <section className="games-challenges-section" aria-label="ألعاب وتحديات 404" id="games-anchor">
      {/* Section Header */}
      <div className="section-title-bar">
        <h2 className="section-title-text">ألعاب وتحديات 404</h2>
        <button
          type="button"
          className="view-all-link-btn"
          onClick={onViewAllGames}
        >
          <span>عرض الكل</span>
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* 3 Challenge Cards Grid */}
      <div className="games-cards-grid">
        {/* Card 1: لعبة الحظ */}
        <div
          className="challenge-interactive-card"
          onClick={onOpenWheel}
          role="button"
          tabIndex={0}
        >
          <div className="challenge-card-right">
            {getGameIcon("wheel")}
          </div>
          <div className="challenge-card-center">
            <h3 className="challenge-title">لعبة الحظ</h3>
            <p className="challenge-subtitle">جرب حظك واربح قهوة مجانية</p>
          </div>
          <div className="challenge-card-arrow">
            <div className="arrow-circle-badge">
              <ArrowLeft size={16} />
            </div>
          </div>
        </div>

        {/* Card 2: مشروبك شخصيتك */}
        <div
          className="challenge-interactive-card"
          onClick={onOpenPersonalityQuiz}
          role="button"
          tabIndex={0}
        >
          <div className="challenge-card-right">
            {getGameIcon("trophy")}
          </div>
          <div className="challenge-card-center">
            <h3 className="challenge-title">مشروبك شخصيتك</h3>
            <p className="challenge-subtitle">اختر مشروب واحصل على نقاط</p>
          </div>
          <div className="challenge-card-arrow">
            <div className="arrow-circle-badge">
              <ArrowLeft size={16} />
            </div>
          </div>
        </div>

        {/* Card 3: فريق القهوة */}
        <div
          className="challenge-interactive-card"
          onClick={onOpenInviteFriends}
          role="button"
          tabIndex={0}
        >
          <div className="challenge-card-right">
            {getGameIcon("team")}
          </div>
          <div className="challenge-card-center">
            <h3 className="challenge-title">فريق القهوة</h3>
            <p className="challenge-subtitle">ادعُ أصدقاءك واكسب مكافآت</p>
          </div>
          <div className="challenge-card-arrow">
            <div className="arrow-circle-badge">
              <ArrowLeft size={16} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
