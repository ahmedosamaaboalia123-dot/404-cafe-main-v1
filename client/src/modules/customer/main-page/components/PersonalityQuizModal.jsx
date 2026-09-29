import React, { useState } from "react";
import { X, Award, CheckCircle, Coffee, ArrowRight } from "lucide-react";

export default function PersonalityQuizModal({ isOpen, onClose, onFinishQuiz }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const questions = [
    {
      id: "mood",
      title: "إيه مودك اليوم؟",
      options: [
        { label: "محتاج طاقة وتركيز للشغل أو المذاكرة ⚡", type: "strong" },
        { label: "مسترخي وعايز روقان وهدوء 🍃", type: "calm" },
        { label: "منعش وعايز طاقة وحيوية للصيف 🧊", type: "cold" },
        { label: "حاجة حلوة تكافئ بيها نفسك 🍰", type: "sweet" },
      ],
    },
    {
      id: "taste",
      title: "بتفضل أي نكهة أكتر؟",
      options: [
        { label: "طعم القهوة الصريحة بدون إضافات", type: "strong" },
        { label: "الكراميل والفانيليا الغنية", type: "sweet" },
        { label: "الحليب المخفوق مع القهوة المتوازنة", type: "calm" },
        { label: "الشوكولاتة البلجيكية والفرابيه", type: "cold" },
      ],
    },
    {
      id: "time",
      title: "أنسب وقت للقهوة عندك؟",
      options: [
        { label: "أول ما أصحى الصبح 🌅", type: "strong" },
        { label: "بعد الظهر مع الأصحاب ☕", type: "calm" },
        { label: "بالليل جلسة هادية 🌙", type: "sweet" },
        { label: "في أي وقت وطول اليوم! 🔥", type: "cold" },
      ],
    },
  ];

  if (!isOpen) return null;

  const handleSelectOption = (option) => {
    const newAnswers = { ...answers, [questions[step].id]: option.type };
    setAnswers(newAnswers);

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      // Calculate result
      const types = Object.values(newAnswers);
      const counts = {};
      types.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
      const topType = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));

      let matchedDrink = {
        name: "سبانش لاتيه 404",
        desc: "أنت شخصية متوازنة تعشق المذاق الفاخر والأجواء الراقية!",
        points: 50,
      };

      if (topType === "strong") {
        matchedDrink = {
          name: "دبل إسبريسو كولومبي مختص",
          desc: "شخصية قيادية، عملية، وتبحث عن أقصى درجات التركيز والإنجاز!",
          points: 50,
        };
      } else if (topType === "cold") {
        matchedDrink = {
          name: "آيس كراميل ماكياتو منعش",
          desc: "شخصية مرحة، تحب الحيوية والانطلاق والتجديد المستمر!",
          points: 50,
        };
      } else if (topType === "sweet") {
        matchedDrink = {
          name: "موكا فرابيه مع الكريمة والشوكولاتة",
          desc: "شخصية دافئة ومبدعة، تقدّر اللحظات الجميلة وتدلل نفسها دائماً!",
          points: 50,
        };
      }

      setResult(matchedDrink);
      if (onFinishQuiz) onFinishQuiz(matchedDrink);
    }
  };

  const handleReset = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="game-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="game-modal-header">
          <div className="game-title-row">
            <Award size={22} className="game-sparkle-icon" />
            <h3 className="game-main-title">مشروبك شخصيتك - 404</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="game-modal-body">
          {!result ? (
            <div className="quiz-container">
              <div className="quiz-progress-bar">
                <div
                  className="quiz-progress-fill"
                  style={{ width: `${((step + 1) / questions.length) * 100}%` }}
                />
              </div>
              <span className="quiz-step-tag">السؤال {step + 1} من {questions.length}</span>

              <h4 className="quiz-question-title">{questions[step].title}</h4>

              <div className="quiz-options-list">
                {questions[step].options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="quiz-option-btn"
                    onClick={() => handleSelectOption(opt)}
                  >
                    <span>{opt.label}</span>
                    <ArrowRight size={16} className="opt-arrow-icon" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="quiz-result-container">
              <div className="quiz-trophy-badge">
                <Coffee size={36} />
              </div>
              <span className="result-congrats-tag">شخصية قهوتك هي:</span>
              <h3 className="result-drink-title">{result.name}</h3>
              <p className="result-drink-desc">{result.desc}</p>

              <div className="reward-points-pill">
                <CheckCircle size={18} />
                <span>تم إضافة <strong>+{result.points} نقطة</strong> لحسابك!</span>
              </div>

              <div className="quiz-actions-row">
                <button type="button" className="spin-action-btn" onClick={onClose}>
                  اطلب مشروبك الآن
                </button>
                <button type="button" className="quiz-retry-btn" onClick={handleReset}>
                  إعادة الاختبار
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
