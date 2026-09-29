"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ReleaseSearchContextValue = {
  query: string;
  setQuery: (query: string) => void;
};

const ReleaseSearchContext = createContext<ReleaseSearchContextValue | null>(null);

export function ReleaseSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");

  return (
    <ReleaseSearchContext.Provider value={{ query, setQuery }}>
      {children}
    </ReleaseSearchContext.Provider>
  );
}

export function useReleaseSearch() {
  const context = useContext(ReleaseSearchContext);
  if (!context) throw new Error("useReleaseSearch must be used inside ReleaseSearchProvider");
  return context;
}
