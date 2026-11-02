import React from "react";
import { X, ExternalLink, ShieldCheck, AlertTriangle, BookOpen, Calendar } from "lucide-react";
import type { Citation } from "@legal-mind/legal-schemas";

interface CitationDrawerProps {
  citation: Citation | null;
  onClose: () => void;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({ citation, onClose }) => {
  if (!citation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  {citation.documentType} • {citation.documentCode}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3" />
                  {citation.status === "ACTIVE" ? "Còn hiệu lực" : citation.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {citation.documentTitle}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-5 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Article badge */}
          <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-3.5">
            <div className="text-xs font-medium text-slate-400">Điều khoản viện dẫn:</div>
            <div className="text-sm font-semibold text-amber-300 mt-0.5">
              Điều {citation.articleNumber}. {citation.articleTitle} {citation.clauseNumber ? `(Khoản ${citation.clauseNumber})` : ""}
            </div>
          </div>

          {/* Quote */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Trích lục nguyên văn pháp luật:
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-sm text-slate-200 leading-relaxed font-serif">
              “{citation.contentSnippet}”
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2 rounded-lg bg-slate-950/40 p-2.5 border border-slate-800/80">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>Ban hành: <strong className="text-slate-200">{citation.issuedDate || "Chưa có dữ liệu"}</strong></span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-950/40 p-2.5 border border-slate-800/80">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>Hiệu lực từ: <strong className="text-slate-200">{citation.effectiveDate}</strong></span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-950/40 p-2.5 border border-slate-800/80">
              <AlertTriangle className="h-4 w-4 text-slate-500" />
              <span>Độ tương thích: <strong className="text-amber-400">{((citation.relevanceScore || 0.95) * 100).toFixed(0)}%</strong></span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
          <a
            href={citation.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 hover:underline"
          >
            <span>Mở văn bản tại nguồn chính thức</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
