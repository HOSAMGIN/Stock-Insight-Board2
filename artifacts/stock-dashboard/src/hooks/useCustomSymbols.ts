import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "custom-watchlist-symbols";

export function useCustomSymbols() {
  const [symbols, setSymbols] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback((next: string[]) => {
    setSymbols(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const addSymbol = useCallback(
    (symbol: string) => {
      const upper = symbol.trim().toUpperCase();
      if (!upper || symbols.map((s) => s.toUpperCase()).includes(upper)) return;
      persist([...symbols, upper]);
    },
    [symbols, persist]
  );

  const removeSymbol = useCallback(
    (symbol: string) => {
      persist(symbols.filter((s) => s.toUpperCase() !== symbol.toUpperCase()));
    },
    [symbols, persist]
  );

  const moveUp = useCallback(
    (symbol: string) => {
      const idx = symbols.indexOf(symbol);
      if (idx <= 0) return;
      const next = [...symbols];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      persist(next);
    },
    [symbols, persist]
  );

  const moveDown = useCallback(
    (symbol: string) => {
      const idx = symbols.indexOf(symbol);
      if (idx < 0 || idx >= symbols.length - 1) return;
      const next = [...symbols];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      persist(next);
    },
    [symbols, persist]
  );

  return { symbols, addSymbol, removeSymbol, moveUp, moveDown };
}
