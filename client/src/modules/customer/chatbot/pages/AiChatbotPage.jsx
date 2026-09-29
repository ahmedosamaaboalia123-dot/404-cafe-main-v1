import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Send,
  Bot,
  Sparkles,
  Coffee,
  ShoppingBag,
  RotateCcw,
  Check,
  ChevronLeft,
  Flame,
  CupSoda,
  CakeSlice,
  Tag,
  Star,
  ThumbsUp,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  Plus,
} from "lucide-react";
import CartDrawer from "../../main-page/components/CartDrawer";
import { saveCustomerOrder } from "../../orders/services/customerOrdersService";
import { saveTableOrder } from "../../../table/services/tableOrdersService";
import { sendChatMessage } from "@/services/chatService";
import { getPublicMenu } from "@/services/catalogService";
import { getCustomerProfile } from "../../checkout/services/checkoutCustomerService";
import "../styles/AiChatbotPage.css";

export default function AiChatbotPage({ tableMode = false }) {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const tableNumber = Number(tableId) || 4;
  const productBasePath = tableMode ? `/table/${tableNumber}/menu/product` : "/product";
  const trackingBasePath = tableMode
    ? `/table/${tableNumber}/orders`
    : "/customer/orders";
  const chatEndRef = useRef(null);

  // Cart state — the same persisted cart the menu page uses, so the count in
  // this header is always the real one (table carts live under a table key).
  const cartStorageKey = tableMode ? `404_table_cart_${tableNumber}` : "404_customer_cart_v1";
  const [cartItems, setCartItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Persist the cart and let the rest of the table UI (TableContext, the menu
  // page) know about the change. Customer carts have no table to notify.
  useEffect(() => {
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
    } catch {
      // The cart still works in memory when storage is unavailable.
    }
    if (!tableMode) return;
    window.dispatchEvent(new CustomEvent("table-cart-updated", { detail: { tableNumber, items: cartItems } }));
  }, [cartItems, cartStorageKey, tableMode, tableNumber]);

  // Adopt cart changes made by the menu page while this page is open.
  useEffect(() => {
    if (!tableMode) return undefined;
    const syncCart = (event) => {
      if (Number(event.detail?.tableNumber) === Number(tableNumber)) {
        setCartItems(event.detail.items || []);
      }
    };
    window.addEventListener("table-cart-updated", syncCart);
    return () => window.removeEventListener("table-cart-updated", syncCart);
  }, [tableNumber, tableMode]);

  // Chat conversation
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: tableMode
        ? `أهلاً بك على طاولة رقم ${tableNumber} في 404 كافيه! ☕ أنا الباريستا الذكي الخاص بطاولتك.`
        : "أهلاً بك في 404 كافيه! ☕ أنا الباريستا الذكي الخاص بك.\nأنا هنا لمساعدتك في اختيار المشروب والتحلية المثالية لمزاجك، أو الإجابة عن أي استفسار حول قائمتنا!",
      time: "الآن",
      suggestedProducts: [],
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddToCart = (product) => {
    if (!product) return;
    setCartItems((prev) => {
      const existing = prev.find((it) => it.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.id === product.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
        },
      ];
    });
    showToast(`تمت إضافة ${product.name} إلى السلة بنجاح ☕`);
  };

  const handleSendMessage = async (customText) => {
    const text = (customText || inputText).trim();
    if (!text) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text,
      time: new Intl.DateTimeFormat("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date()),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    // Conversation history for the backend (role/content pairs).
    const history = [...messages, userMsg].map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
    }));

    let botReply = "";
    let suggestedProducts = [];

    try {
      const res = await sendChatMessage(history, { conversationId });
      if (res.conversationId) setConversationId(res.conversationId);
      botReply = res.reply || "عذرًا، لم أستطع الرد الآن. جرب سؤالًا آخر.";

      // Best-effort: attach real product cards only when the reply mentions a
      // product that actually exists in the live catalog (no fake data).
      const menu = await getPublicMenu();
      const items = Array.isArray(menu?.items) ? menu.items : [];
      const replyLower = botReply.toLowerCase();
      const matched = [];
      for (const p of items) {
        const names = [p.name, p.englishName]
          .map((n) => String(n || "").toLowerCase())
          .filter(Boolean);
        if (names.some((n) => replyLower.includes(n))) {
          matched.push({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image,
            description: p.description || "",
            rating: p.rating || 4.8,
          });
        }
        if (matched.length >= 3) break;
      }
      suggestedProducts = matched;
    } catch (err) {
      botReply = err?.message || "حدث خطأ، حاول مرة أخرى.";
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        sender: "bot",
        text: botReply,
        time: new Intl.DateTimeFormat("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(new Date()),
        suggestedProducts,
      },
    ]);
    setIsTyping(false);
  };

  const handleResetChat = () => {
    setConversationId(null);
    setMessages([
      {
        id: Date.now(),
        sender: "bot",
        text: "تم بدء محادثة جديدة! ☕ كيف يمكن للباريستا الذكي مساعدتك الآن؟",
        time: "الآن",
        suggestedProducts: [],
      },
    ]);
  };

  const totalCartCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <div className="ai-chatbot-page-root" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="pd-toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Bar */}
      <header className="chatbot-header-bar">
        <div className="chatbot-header-container">
          <div className="chatbot-header-right">
            <button
              type="button"
              className="chatbot-back-btn"
              onClick={() => navigate(-1)}
              aria-label="الرجوع"
              title="الرجوع"
            >
              <ArrowRight size={20} />
            </button>

            <div className="chatbot-brand-profile">
              <div className="chatbot-avatar-circle">
                <Bot size={22} className="chatbot-avatar-icon" />
                <span className="chatbot-status-pulse" />
              </div>
              <div className="chatbot-titles-wrap">
                <div className="chatbot-name-row">
                  <h1 className="chatbot-name">باريستا 404 الذكي</h1>
                  <span className="chatbot-badge">AI Assistant</span>
                </div>
                <span className="chatbot-subtitle">
                  مساعدك الشخصي للطلب وترشيح المشروبات • متصل الآن
                </span>
              </div>
            </div>
          </div>

          <div className="chatbot-header-left">
            <button
              type="button"
              className="chatbot-header-action-btn"
              onClick={handleResetChat}
              title="بدء محادثة جديدة"
            >
              <RotateCcw size={16} />
              <span className="btn-label-desktop">محادثة جديدة</span>
            </button>

            <button
              type="button"
              className="chatbot-cart-badge-btn"
              onClick={() => setIsCartOpen(true)}
              aria-label="سلة الطلبات"
              title="سلة الطلبات"
            >
              <ShoppingBag size={18} />
              {totalCartCount > 0 && (
                <span className="cart-count-pill">{totalCartCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Chat Conversation Body */}
      <main className="chatbot-main-stage">
        <div className="chatbot-chat-container">
          {/* Messages Stream */}
          <div className="chatbot-messages-stream">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chatbot-message-row ${
                  msg.sender === "user" ? "user-row" : "bot-row"
                }`}
              >
                {msg.sender === "bot" && (
                  <div className="bot-stream-avatar">
                    <Coffee size={16} />
                  </div>
                )}

                <div className="message-content-wrapper">
                  <div
                    className={`chatbot-message-bubble ${
                      msg.sender === "user" ? "user-bubble" : "bot-bubble"
                    }`}
                  >
                    <div className="message-text-formatted">
                      {msg.text.split("\n").map((line, i) => (
                        <p key={i} className="msg-paragraph">
                          {line}
                        </p>
                      ))}
                    </div>
                    <span className="message-time-stamp">{msg.time}</span>
                  </div>

                  {/* Interactive Suggested Drink Cards */}
                  {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                    <div className="suggested-products-carousel">
                      <span className="suggested-caption">
                        <Sparkles size={13} /> المشروبات والمنتجات المقترحة:
                      </span>
                      <div className="suggested-cards-grid">
                        {msg.suggestedProducts.map((prod) => (
                          <div key={prod.id} className="suggested-drink-card">
                            <div className="suggested-drink-img-box">
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="suggested-drink-img"
                                referrerPolicy="no-referrer"
                              />
                              <span className="suggested-price-tag">
                                {prod.price} EGP
                              </span>
                            </div>

                            <div className="suggested-drink-info">
                              <div className="suggested-name-row">
                                <h4 className="suggested-name">{prod.name}</h4>
                                {prod.rating && (
                                  <span className="suggested-rating">
                                    <Star size={11} fill="#E5832E" color="#E5832E" />
                                    {prod.rating}
                                  </span>
                                )}
                              </div>
                              {prod.description && (
                                <p className="suggested-desc">
                                  {prod.description}
                                </p>
                              )}

                              <div className="suggested-actions-row">
                                <button
                                  type="button"
                                  className="suggested-add-btn"
                                  onClick={() => handleAddToCart(prod)}
                                >
                                  <Plus size={14} />
                                  <span>أضف للسلة</span>
                                </button>
                                <Link
                                  to={`${productBasePath}/${prod.id}`}
                                  className="suggested-customize-link"
                                >
                                  تخصيص
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="chatbot-message-row bot-row">
                <div className="bot-stream-avatar">
                  <Coffee size={16} />
                </div>
                <div className="chatbot-typing-bubble">
                  <span className="typing-indicator-dot" />
                  <span className="typing-indicator-dot" />
                  <span className="typing-indicator-dot" />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>
      </main>

      {/* 3. Bottom Prompt & Input Zone */}
      <footer className="chatbot-bottom-controls">
        <div className="chatbot-controls-inner">
          {/* Chat Input Form */}
          <form
            className="chatbot-input-bar-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              type="text"
              className="chatbot-text-input"
              placeholder="اكتب سؤالك أو اطلب ترشيح مشروب للباريستا..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            <button
              type="submit"
              className="chatbot-send-button"
              disabled={!inputText.trim()}
              aria-label="إرسال"
              title="إرسال"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </footer>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={(id, newQty) => {
          if (newQty <= 0) {
            setCartItems((prev) => prev.filter((it) => it.id !== id));
          } else {
            setCartItems((prev) =>
              prev.map((it) => (it.id === id ? { ...it, quantity: newQty } : it))
            );
          }
        }}
        onRemoveItem={(id) =>
          setCartItems((prev) => prev.filter((it) => it.id !== id))
        }
        onCheckout={() => {
          setIsCartOpen(false);
          if (cartItems.length > 0) {
            const profile = getCustomerProfile();
            const newOrd = tableMode
              ? saveTableOrder({ tableNumber, items: cartItems, orderType: "dine_in" })
              : saveCustomerOrder({
                  items: cartItems,
                  orderType: "takeaway",
                  customerInfo: { name: profile.name, phone: profile.phone, address: "" },
                });
            setCartItems([]);
            showToast("تم تأكيد الطلب بنجاح! جاري التجهيز ☕");
            setTimeout(() => navigate(`${trackingBasePath}/${newOrd.id}/track`), 1000);
          }
        }}
      />
    </div>
  );
}
