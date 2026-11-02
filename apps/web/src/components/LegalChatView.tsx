import React, { useState } from "react";
import { Send, Scale, Sparkles, BookOpen, ChevronDown, ChevronUp, Bot, User, ShieldAlert } from "lucide-react";
import type { Citation } from "@legal-mind/legal-schemas";
import { CitationDrawer } from "./CitationDrawer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  reasoningSteps?: string[];
}

const SAMPLE_QUESTIONS = [
  "Cho vay tiền thỏa thuận lãi suất 25%/năm có bị coi là phạm luật không?",
  "Mức phạt vi phạm hợp đồng thương mại tối đa là bao nhiêu %?",
  "Người lao động đơn phương nghỉ việc cần báo trước bao nhiêu ngày?",
  "Bên cho thuê nhà tự ý hủy cọc thì phải bồi thường thế nào?"
];

export const LegalChatView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Xin chào! Tôi là **Legal-Mind** - Trợ lý AI pháp luật Việt Nam. Tôi có thể hỗ trợ bạn tra cứu luật với **dẫn nguồn chính xác đến từng Điều, Khoản**, phân tích rủi ro và hướng dẫn thủ tục. Bạn đang quan tâm đến vấn đề pháp lý nào?",
      citations: [],
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});

  const toggleReasoning = (msgId: string) => {
    setExpandedReasoning((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error("API request failed");
      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.replyText,
        citations: data.citations || [],
        reasoningSteps: data.reasoningSteps || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Hiện chưa thể kết nối dịch vụ tra cứu pháp luật. Câu trả lời chưa được đối chiếu với kho dữ liệu; vui lòng thử lại sau khi API hoạt động.",
        citations: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-5xl mx-auto">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3.5 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                m.role === "user"
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
            >
              {m.role === "user" ? <User className="h-5 w-5" /> : <Scale className="h-5 w-5" />}
            </div>

            {/* Content box */}
            <div
              className={`max-w-[85%] rounded-2xl p-4.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-amber-500/15 text-slate-100 border border-amber-500/30 ml-auto"
                  : "bg-slate-900 border border-slate-800 text-slate-200"
              }`}
            >
              {/* Chain of thought (reasoning steps) */}
              {m.reasoningSteps && m.reasoningSteps.length > 0 && (
                <div className="mb-3.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <button
                    onClick={() => toggleReasoning(m.id)}
                    className="flex w-full items-center justify-between text-xs font-medium text-amber-400 hover:text-amber-300"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Tiến trình lập luận & đối chiếu luật ({m.reasoningSteps.length} bước)
                    </span>
                    {expandedReasoning[m.id] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {expandedReasoning[m.id] && (
                    <ul className="mt-2.5 space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
                      {m.reasoningSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-500/80">▸</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Text content */}
              <div className="whitespace-pre-wrap">{m.content}</div>

              {/* Citation Badges */}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-4 pt-3.5 border-t border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                    Căn cứ pháp lý trích dẫn:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.citations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setActiveCitation(c)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all shadow-sm"
                      >
                        <Scale className="h-3 w-3 text-amber-400" />
                        <span>
                          {c.documentTitle} (Điều {c.articleNumber})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-amber-400 animate-pulse">
            <Bot className="h-4 w-4" />
            <span>Legal-Mind đang tra cứu kho dữ liệu quy phạm pháp luật...</span>
          </div>
        )}
      </div>

      {/* Suggested prompts if few messages */}
      {messages.length <= 2 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-slate-500 mb-2">Gợi ý câu hỏi phổ biến:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLE_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="text-left text-xs p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-amber-500/40 hover:bg-slate-900 transition-all line-clamp-1"
              >
                ⚖️ {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 shadow-lg p-2 focus-within:border-amber-500/60 transition-colors">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Nhập câu hỏi pháp lý của bạn (VD: Hợp đồng mua bán phạt 15% có vi phạm không?)..."
          rows={2}
          className="w-full resize-none bg-transparent px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 px-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500/70" />
            <span>Dẫn nguồn chính xác từ VBQPPL Việt Nam</span>
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            <span>Gửi câu hỏi</span>
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Citation Drawer Modal */}
      <CitationDrawer
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
};
