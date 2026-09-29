import React from "react";
import { Bot, Sparkles, MessageSquare } from "lucide-react";

export default function MenuAiAssistantBanner({ onOpenAiBot }) {
  return (
    <section className="menu-ai-assistant-banner" aria-label="المساعد الذكي">
      <div className="ai-assistant-banner-card">
        {/* Coffee beans decorative image backdrop */}
        <div className="ai-beans-backdrop">
          <img
            src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80"
            alt="Roasted coffee beans"
            className="ai-beans-img"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Text & Action CTA */}
        <div className="ai-banner-content">
          <div className="ai-banner-text-group">
            <h3 className="ai-banner-title">لا تعرف ماذا تختار؟</h3>
            <p className="ai-banner-subtitle">
              دريب ويتر 404 الذكي وسيساعدك باختيار المشروب المناسب لك
            </p>
          </div>

          <button
            type="button"
            className="ai-start-chat-btn"
            onClick={onOpenAiBot}
          >
            <span>ابدأ المحادثة</span>
            <div className="btn-robot-icon-wrap">
              <Bot size={18} />
            </div>
          </button>
        </div>

        {/* Right Mascot with Speech Bubble */}
        <div className="ai-mascot-side">
          <div className="ai-speech-bubble">
            <p className="speech-text">
              مساعدك الذكي في اختيار
              <br />
              <strong>المشروب المثالي لك</strong>
            </p>
            <div className="speech-arrow" />
          </div>

          <div className="ai-robot-avatar-container" onClick={onOpenAiBot}>
            <div className="robot-head-shape">
              <div className="robot-antenna">
                <span className="antenna-ball" />
              </div>
              <div className="robot-eyes-row">
                <span className="robot-eye" />
                <span className="robot-eye" />
              </div>
              <div className="robot-smile" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
