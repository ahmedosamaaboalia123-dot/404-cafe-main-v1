import apiClient from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";

// Smart barista chat backed by the v2 backend AI integration
// (POST /api/v1/customer-ai/chat). The endpoint is public (no auth) and only
// ever returns catalog projections (no recipes, costs, stock, or customer
// data). Suggestions are inert: the frontend validates them against the
// catalog again before touching the cart.
function lastUserText(messages) {
  if (typeof messages === "string") return messages;
  if (Array.isArray(messages)) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const content = messages[i]?.content ?? messages[i]?.text;
      if (typeof content === "string" && content.trim()) return content;
    }
    return "";
  }
  return String(messages?.content ?? messages?.text ?? "");
}

export async function sendChatMessage(messages, options = {}) {
  const message = lastUserText(messages);
  const history = Array.isArray(messages)
    ? messages
        .slice(-12)
        .map((item) => ({
          role: item?.role === "assistant" ? "assistant" : "user",
          content: String(item?.content ?? item?.text ?? "").trim(),
        }))
        .filter((item) => item.content)
    : [];
  try {
    const payload = await apiClient.post(endpoints.chat.send, {
      message,
      ...(history.length ? { history } : {}),
      ...(options.conversationId
        ? { conversationId: options.conversationId }
        : {}),
      ...(options.context ? { context: options.context } : {}),
    });
    const data = payload?.data ?? {};
    return {
      reply: data.answer ?? "",
      suggestions: data.productSuggestions ?? [],
      draftCartActions: data.draftCartActions ?? [],
      conversationId: data.conversationId ?? options.conversationId ?? null,
      usage: data.usage ?? null,
    };
  } catch (err) {
    console.error("chatService: failed to send message", err);
    const fallback =
      err?.response?.status === 503
        ? "الباريستا مشغول حاليًا، جرب بعد قليل."
        : "حدث خطأ، حاول مرة أخرى.";
    throw new Error(fallback);
  }
}
