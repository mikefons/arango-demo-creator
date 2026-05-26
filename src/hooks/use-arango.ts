"use client";

import { useState, useCallback } from "react";
import type { CollectionDefinition } from "@/types";

export function useArango() {
  const [collections, setCollections] = useState<CollectionDefinition[]>([]);

  const updateCollections = useCallback((incoming: CollectionDefinition[]) => {
    setCollections((prev) => {
      const existing = new Map(prev.map((c) => [c.name, c]));
      for (const col of incoming) {
        existing.set(col.name, col);
      }
      return Array.from(existing.values());
    });
  }, []);

  const resetCollections = useCallback(() => {
    setCollections([]);
  }, []);

  return { collections, updateCollections, resetCollections };
}
