"use client";

import { useState, useCallback } from "react";
import type { CollectionDefinition } from "@/types";

export function useArango() {
  const [collections, setCollections] = useState<CollectionDefinition[]>([]);

  const updateCollections = useCallback((incoming: CollectionDefinition[]) => {
    setCollections((prev) => {
      const existingMap = new Map(prev.map((c) => [c.name, c]));
      for (const col of incoming) {
        const prior = existingMap.get(col.name);
        if (prior) {
          // Merge: preserve richer description/attributes from createCollections;
          // always accept the incoming count (listCollections has fresh values).
          existingMap.set(col.name, {
            ...prior,
            description: col.description || prior.description,
            attributes: col.attributes.length > 0 ? col.attributes : prior.attributes,
            count: col.count ?? prior.count,
          });
        } else {
          existingMap.set(col.name, col);
        }
      }
      return Array.from(existingMap.values());
    });
  }, []);

  const removeCollections = useCallback((names: string[]) => {
    setCollections((prev) => prev.filter((c) => !names.includes(c.name)));
  }, []);

  const resetCollections = useCallback(() => {
    setCollections([]);
  }, []);

  return { collections, updateCollections, removeCollections, resetCollections };
}
