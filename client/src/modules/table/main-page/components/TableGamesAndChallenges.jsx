import React from "react";
import { ChevronLeft, ArrowLeft, Trophy, Users, Sparkles } from "lucide-react";
import { useTable } from "../../context/TableContext";

export default function TableGamesAndChallenges({
  onOpenWheel,
  onOpenPersonalityQuiz,
  onOpenInviteFriends,
  onViewAllGames,
}) {
  const { tableNumber } = useTable();

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

  const games = [
    {
      id: "wheel",
      title: "عجلة الحظ لضيوف الطاولة",
      subtext: `لف العجلة واربح خصومات وهدايا لطاولة ${tableNumber}`,
      iconType: "wheel",
      onClick: onOpenWheel,
    },
    {
      id: "quiz",
      title: "اختبر ذوقك في القهوة",
      subtext: "جاوب على 3 أسئلة ونقترح أفضل مشروب لمزاجك الآن",
      iconType: "trophy",
      onClick: onOpenPersonalityQuiz,
    },
    {
      id: "table_games",
      title: "ألعاب الطاولة وتحدي الصحاب",
      subtext: "اطلب شطرنج، أونو، أو دومينو لطاولتك مجاناً",
      iconType: "team",
      onClick: onOpenInviteFriends,
    },
  ];

  return (
    <section className="games-challenges-section" aria-label="ألعاب وتحديات طاولة 404" id="games-anchor">
      {/* Section Header */}
      <div className="section-title-bar">
        <h2 className="section-title-text">ألعاب وتحديات 404 لطاولة {tableNumber}</h2>
        <button
          type="button"
          className="view-all-link-btn"
          onClick={onViewAllGames}
        >
          <span>عرض الكل</span>
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Grid of 3 Game Cards matching 100% Mockup Line Style */}
      <div className="games-cards-grid">
        {games.map((game) => (
          <div
            key={game.id}
            className="game-challenge-card"
            onClick={game.onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                game.onClick && game.onClick();
              }
            }}
          >
            <div className="game-card-icon-area">
              {getGameIcon(game.iconType)}
            </div>

            <div className="game-card-text-area">
              <h3 className="game-title-text">{game.title}</h3>
              <p className="game-sub-text">{game.subtext}</p>
            </div>

            <button
              type="button"
              className="game-action-circle-btn"
              aria-label={`بدء ${game.title}`}
              title="ابدأ الآن"
              onClick={(e) => {
                e.stopPropagation();
                game.onClick && game.onClick();
              }}
            >
              <ArrowLeft size={18} className="arrow-flip-rtl" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
