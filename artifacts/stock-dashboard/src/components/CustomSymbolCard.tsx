import React from "react";
import { useGetStock } from "@workspace/api-client-react";
import { StockCard } from "@/components/StockCard";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";

interface CustomSymbolCardProps {
  symbol: string;
  index: number;
  onRemove: (symbol: string) => void;
}

export function CustomSymbolCard({ symbol, index, onRemove }: CustomSymbolCardProps) {
  const { data, isLoading, isError } = useGetStock(symbol, {
    query: {
      queryKey: ['stock', symbol],
      refetchInterval: 60000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.07 }}
        className="glass-panel rounded-xl p-6 border border-white/5 space-y-4"
      >
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-7 w-20 mb-2" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-[160px] w-full" />
        <div className="text-xs text-center text-muted-foreground/50 font-mono animate-pulse">
          {symbol} 데이터 불러오는 중...
        </div>
      </motion.div>
    );
  }

  if (isError || !data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel rounded-xl p-6 border border-red-500/20 flex flex-col items-center justify-center gap-3 min-h-[180px]"
      >
        <AlertCircle className="w-8 h-8 text-red-400/60" />
        <div className="text-center">
          <p className="text-sm font-mono font-bold text-foreground">{symbol}</p>
          <p className="text-xs text-muted-foreground mt-1">
            종목을 불러올 수 없습니다
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">
            티커 기호를 확인해주세요
          </p>
        </div>
        <button
          onClick={() => onRemove(symbol)}
          className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 font-mono transition-colors px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10"
        >
          <X className="w-3.5 h-3.5" />
          삭제
        </button>
      </motion.div>
    );
  }

  return (
    <div className="relative group/custom">
      <StockCard data={data} index={index} />
      <button
        onClick={() => onRemove(symbol)}
        title="관심 종목에서 제거"
        className="absolute top-2 right-2 z-10 opacity-0 group-hover/custom:opacity-100 transition-opacity bg-background/80 border border-white/10 rounded-full p-1 text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
