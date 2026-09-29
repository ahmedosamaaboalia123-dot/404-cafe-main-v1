import React, { useState, useRef, useEffect } from "react";
import { X, Send, Bot, Sparkles, Coffee, ThumbsUp } from "lucide-react";
import { sendChatMessage } from "@/services/chatService";

export default function AiBotModal({ isOpen, onClose, onSelectSuggestedDrink }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: "أهلاً بك في 404 كافيه! ☕ أنا الباريستا الذكي الخاص بك. كيف يمكنني مساعدتك اليوم؟",
      time: "الآن",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const quickQuestions = [
    "رشحلي مشروب بارد منعش 🧊",
    "عايز قهوة تقيلة للتركيز 🎯",
    "أفضل حلى مع السبانش لاتيه 🍰",
    "إيه العروض المتاحة اليوم؟ 🎁",
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: text.trim(),
      time: "الآن",
    };

    const history = [...messages, userMsg].map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    let botReply = "";
    try {
      const res = await sendChatMessage(history);
      botReply = res.reply || "عذرًا، لم أستطع الرد الآن. جرب سؤالًا آخر.";
    } catch (err) {
      botReply = err?.message || "حدث خطأ، حاول مرة أخرى.";
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        sender: "bot",
        text: botReply,
        time: "الآن",
      },
    ]);
    setIsTyping(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ai-bot-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-bot-header">
          <div className="ai-bot-info">
            <div className="ai-bot-avatar">
              <Bot size={22} />
              <span className="bot-online-pulse" />
            </div>
            <div>
              <h3 className="ai-bot-title">روبوت 404 الذكي</h3>
              <span className="ai-bot-status">باريستا ذكاء اصطناعي • متصل الآن</span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="إغلاق المحادثة"
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="ai-bot-chat-body">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`ai-message-row ${msg.sender === "user" ? "user-msg-row" : "bot-msg-row"}`}
            >
              {msg.sender === "bot" && (
                <div className="msg-bot-icon">
                  <Coffee size={14} />
                </div>
              )}
              <div className={`ai-message-bubble ${msg.sender === "user" ? "user-bubble" : "bot-bubble"}`}>
                <p className="ai-msg-text">{msg.text}</p>
                <span className="ai-msg-time">{msg.time}</span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="ai-message-row bot-msg-row">
              <div className="msg-bot-icon">
                <Coffee size={14} />
              </div>
              <div className="ai-typing-indicator">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestions */}
        <div className="quick-suggestions-bar">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              className="quick-suggestion-chip"
              onClick={() => handleSendMessage(q)}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          className="ai-bot-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            type="text"
            className="ai-chat-input"
            placeholder="اسأل الباريستا عن المشروبات، المكونات، أو العروض..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button
            type="submit"
            className="ai-chat-send-btn"
            disabled={!inputText.trim()}
            aria-label="إرسال الرسالة"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
