import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2 } from "lucide-react";

interface ZoomModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function ZoomModal({ title, children, onClose }: ZoomModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="w-full max-w-5xl glass-panel rounded-2xl border border-white/10 overflow-hidden"
          initial={{ scale: 0.92, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-mono font-semibold text-foreground">{title}</span>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface ZoomableChartProps {
  title: string;
  children: (zoomed: boolean) => React.ReactNode;
  extra?: React.ReactNode;
}

export function ZoomableChart({ title, children, extra }: ZoomableChartProps) {
  const [zoomed, setZoomed] = React.useState(false);
  return (
    <>
      <div className="group/zoom relative">
        <button
          onClick={() => setZoomed(true)}
          title="확대 보기"
          className="absolute top-0 right-0 z-10 opacity-0 group-hover/zoom:opacity-100 transition-opacity bg-background/80 border border-white/10 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-white/10"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
        {children(false)}
      </div>

      <AnimatePresence>
        {zoomed && (
          <ZoomModal title={title} onClose={() => setZoomed(false)}>
            {extra && <div className="mb-4">{extra}</div>}
            {children(true)}
          </ZoomModal>
        )}
      </AnimatePresence>
    </>
  );
}
