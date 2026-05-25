"use client";

import { useState, useCallback } from "react";
import type { CollectionDefinition } from "@/types";

interface ArangoState {
  sessionToken: string | null;
  collections: CollectionDefinition[];
}

export function useArango() {
  const [state, setState] = useState<ArangoState>({
    sessionToken: null,
    collections: [],
  });

  const setSessionToken = useCallback((token: string) => {
    setState((prev) => ({ ...prev, sessionToken: token }));
  }, []);

  const updateCollections = useCallback((incoming: CollectionDefinition[]) => {
    setState((prev) => {
      const existing = new Map(prev.collections.map((c) => [c.name, c]));
      for (const col of incoming) {
        existing.set(col.name, col);
      }
      return { ...prev, collections: Array.from(existing.values()) };
    });
  }, []);

  const disconnect = useCallback(() => {
    setState({ sessionToken: null, collections: [] });
  }, []);

  return {
    sessionToken: state.sessionToken,
    collections: state.collections,
    setSessionToken,
    updateCollections,
    disconnect,
    isConnected: Boolean(state.sessionToken),
  };
}
