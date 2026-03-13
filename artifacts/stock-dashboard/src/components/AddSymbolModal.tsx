import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Search, Loader2, AlertCircle, Info } from "lucide-react";
import { getStock } from "@workspace/api-client-react";

interface AddSymbolModalProps {
  onClose: () => void;
  onAdd: (symbol: string) => void;
  existing: string[];
}

// Popular symbol suggestions
const SUGGESTIONS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "PLTR", name: "Palantir Technologies" },
  { symbol: "COIN", name: "Coinbase Global" },
  { symbol: "MSTR", name: "MicroStrategy" },
  { symbol: "005490.KS", name: "POSCO Holdings" },
  { symbol: "035420.KS", name: "NAVER" },
  { symbol: "035720.KS", name: "Kakao" },
  { symbol: "^IXIC", name: "NASDAQ Composite" },
  { symbol: "GC=F", name: "Gold Futures" },
];

export function AddSymbolModal({ onClose, onAdd, existing }: AddSymbolModalProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [previewName, setPreviewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const upperInput = input.trim().toUpperCase();
  const alreadyAdded = existing.map((s) => s.toUpperCase()).includes(upperInput);

  const handleVerifyAndAdd = async () => {
    const sym = input.trim();
    if (!sym) return;
    if (alreadyAdded) {
      setErrorMsg("이미 추가된 종목입니다.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const data = await getStock(sym);
      setPreviewName(data.name);
      setStatus("success");
      onAdd(sym.toUpperCase());
      setInput("");
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMsg(`"${sym}" 종목을 찾을 수 없습니다. 티커 기호를 확인해주세요.`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleVerifyAndAdd();
    if (e.key === "Escape") onClose();
  };

  const handleSuggestion = (symbol: string) => {
    if (existing.map((s) => s.toUpperCase()).includes(symbol.toUpperCase())) return;
    onAdd(symbol);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="w-full max-w-lg glass-panel rounded-2xl border border-white/10 overflow-hidden"
          initial={{ scale: 0.9, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div>
              <h2 className="text-base font-bold text-foreground">관심 종목 추가</h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Yahoo Finance 티커 기호를 입력하세요
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Search input */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value.toUpperCase());
                      setStatus("idle");
                      setErrorMsg("");
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="예: AAPL, 005930.KS, ^GSPC"
                    className="w-full bg-background/60 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
                <button
                  onClick={handleVerifyAndAdd}
                  disabled={!input.trim() || status === "loading"}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary rounded-lg font-mono text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  추가
                </button>
              </div>

              {/* Status messages */}
              {status === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-xs text-red-400 font-mono bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errorMsg}
                </motion.div>
              )}

              {status === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-xs text-green-400 font-mono bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  {previewName} 추가됨
                </motion.div>
              )}
            </div>

            {/* Tip */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground/60 font-mono bg-white/3 rounded-lg px-3 py-2.5 border border-white/5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                미국 주식: <span className="text-foreground/70">AAPL</span> &nbsp;|&nbsp;
                한국 주식: <span className="text-foreground/70">005930.KS</span> &nbsp;|&nbsp;
                지수: <span className="text-foreground/70">^GSPC</span>
              </span>
            </div>

            {/* Suggestions */}
            <div>
              <p className="text-xs font-mono text-muted-foreground/60 mb-2.5">추천 종목</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                {SUGGESTIONS.map((s) => {
                  const added = existing.map((e) => e.toUpperCase()).includes(s.symbol.toUpperCase());
                  return (
                    <button
                      key={s.symbol}
                      onClick={() => handleSuggestion(s.symbol)}
                      disabled={added}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                        added
                          ? "border-white/5 bg-white/2 opacity-40 cursor-not-allowed"
                          : "border-white/8 bg-white/3 hover:bg-white/7 hover:border-primary/30 cursor-pointer"
                      }`}
                    >
                      <span className="text-xs font-mono font-bold text-primary/80 shrink-0 w-20 truncate">
                        {s.symbol}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
