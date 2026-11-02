import React, { useState } from "react";
import { Scale, FileSearch, FileCheck2, PenTool, Shield, ExternalLink } from "lucide-react";
import { LegalChatView } from "./components/LegalChatView";
import { ContractReviewView } from "./components/ContractReviewView";
import { LegalDraftingView } from "./components/LegalDraftingView";

export function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "contract" | "drafting">("chat");

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 shadow-lg shadow-amber-500/20 font-bold">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  LEGAL<span className="text-amber-400 font-serif italic">MIND</span>
                </span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                  AI v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Trợ Lý Trí Tuệ Nhân Tạo Pháp Lý Việt Nam</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "chat"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileSearch className="h-3.5 w-3.5" />
              <span>Tra Cứu Luật (RAG)</span>
            </button>

            <button
              onClick={() => setActiveTab("contract")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "contract"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Rà Soát Hợp Đồng</span>
            </button>

            <button
              onClick={() => setActiveTab("drafting")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "drafting"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <PenTool className="h-3.5 w-3.5" />
              <span>Soạn Thảo Đơn Từ</span>
            </button>
          </div>

          {/* Right Status & Progress Log */}
          <div className="hidden sm:flex items-center gap-2.5">
            <a
              href="/progress.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all shadow-sm"
              title="Mở Bảng theo dõi tiến độ & Bản đồ kiến trúc HTML"
            >
              <FileSearch className="h-3.5 w-3.5 text-amber-400" />
              <span>Nhật ký Dự án (HTML)</span>
            </a>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              VBQPPL Sẵn sàng
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "chat" && <LegalChatView />}
        {activeTab === "contract" && <ContractReviewView />}
        {activeTab === "drafting" && <LegalDraftingView />}
      </main>

      {/* Disclaimer Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-4 px-4 text-center text-[11px] text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-amber-500/70" />
            <span>
              <strong>Tuyên bố miễn trừ:</strong> Legal-Mind hỗ trợ thông tin pháp lý & tra cứu, không thay thế ý kiến tư vấn chính thức của Luật sư.
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Áp dụng quy chuẩn VBQPPL Việt Nam</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
