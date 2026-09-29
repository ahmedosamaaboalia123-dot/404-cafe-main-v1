import React, { useState } from "react";
import { X, Sparkles, Trophy, RotateCw, Check } from "lucide-react";

export default function FortuneWheelModal({ isOpen, onClose, onWinPrize }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState(null);
  const [hasSpun, setHasSpun] = useState(false);

  const prizes = [
    { label: "قهوة مجانية ☕", code: "FREECOFFEE" },
    { label: "خصم 25% 🔥", code: "LUCKY25" },
    { label: "كوكيز مجاني 🍪", code: "FREECOOKIE" },
    { label: "خصم 15% ✨", code: "LUCKY15" },
    { label: "دبل شوت مجاني 🎯", code: "FREESHOT" },
    { label: "+100 نقطة ولاء 🌟", code: "POINTS100" },
  ];

  if (!isOpen) return null;

  const handleSpinWheel = () => {
    if (isSpinning || hasSpun) return;

    setIsSpinning(true);
    setWonPrize(null);

    // Random rotations between 5 to 8 full spins + random slice
    const randomPrizeIndex = Math.floor(Math.random() * prizes.length);
    const sliceAngle = 360 / prizes.length;
    const totalSpins = 360 * 5;
    const finalAngle = totalSpins + (randomPrizeIndex * sliceAngle) + (sliceAngle / 2);

    setRotation(finalAngle);

    setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      const prize = prizes[randomPrizeIndex];
      setWonPrize(prize);
      if (onWinPrize) onWinPrize(prize);
    }, 3800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="game-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="game-modal-header">
          <div className="game-title-row">
            <Sparkles size={22} className="game-sparkle-icon" />
            <h3 className="game-main-title">لعبة الحظ - 404 COFFEE</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        <div className="game-modal-body">
          <p className="game-intro-text">
            دوّر العجلة واربح كوب قهوة مجاني، كود خصم فوري، أو نقاط تضاف لحسابك!
          </p>

          {/* Wheel Graphic Container */}
          <div className="wheel-graphic-stage">
            <div className="wheel-pointer-arrow">▼</div>
            <div
              className="wheel-circle-disc"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? "transform 3.8s cubic-bezier(0.15, 0.9, 0.2, 1)" : "none",
              }}
            >
              {prizes.map((p, idx) => {
                const angle = (360 / prizes.length) * idx;
                return (
                  <div
                    key={idx}
                    className="wheel-segment-slice"
                    style={{
                      transform: `rotate(${angle}deg)`,
                      backgroundColor: idx % 2 === 0 ? "#593215" : "#8B5A32",
                      color: idx % 2 === 0 ? "#FFF" : "#FDF8F3",
                    }}
                  >
                    <span className="segment-text-label">{p.label}</span>
                  </div>
                );
              })}
              <div className="wheel-center-pin">
                <span>404</span>
              </div>
            </div>
          </div>

          {/* Result Card if Won */}
          {wonPrize && (
            <div className="prize-won-card">
              <Trophy size={28} className="trophy-gold" />
              <div className="prize-info-box">
                <span className="prize-congrats">مبروك! ربحت:</span>
                <h4 className="prize-name">{wonPrize.label}</h4>
                <span className="prize-code-badge">كود الهدية: {wonPrize.code}</span>
              </div>
            </div>
          )}

          {/* Spin Button */}
          <button
            type="button"
            className="spin-action-btn"
            onClick={handleSpinWheel}
            disabled={isSpinning}
          >
            <RotateCw size={20} className={isSpinning ? "spin-icon-anim" : ""} />
            <span>{isSpinning ? "جاري تدوير العجلة..." : hasSpun ? "تدوير مرة أخرى" : "دوّر العجلة الآن!"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
