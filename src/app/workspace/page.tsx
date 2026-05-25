"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  LogOut,
  Layers,
  MessageSquare,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatInterface } from "@/components/chat-interface";
import { GraphVisualizer } from "@/components/graph-visualizer";
import { useArango } from "@/hooks/use-arango";
import type { CollectionDefinition } from "@/types";

type ActivePanel = "chat" | "schema";

export default function WorkspacePage() {
  const router = useRouter();
  const {
    sessionToken,
    collections,
    setSessionToken,
    updateCollections,
    disconnect,
  } = useArango();
  const [activePanel, setActivePanel] = useState<ActivePanel>("chat");
  const [ready, setReady] = useState(false);
  const [schemaKey, setSchemaKey] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem("arango_session");
    if (!stored) {
      router.replace("/");
      return;
    }
    setSessionToken(stored);
    setReady(true);
  }, [router, setSessionToken]);

  function handleDisconnect() {
    sessionStorage.removeItem("arango_session");
    disconnect();
    router.replace("/");
  }

  function handleSchemaUpdate(incoming: CollectionDefinition[]) {
    updateCollections(incoming);
  }

  if (!ready || !sessionToken) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted">
          <div className="w-5 h-5 rounded-full border-2 border-arango-400 border-t-transparent animate-spin" />
          <span className="text-sm">Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 flex-shrink-0 border-b border-border bg-background-secondary flex items-center gap-4 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-arango-400 rounded-lg flex items-center justify-center shadow-md shadow-arango-900/50">
            <Database className="w-3.5 h-3.5 text-background" />
          </div>
          <span className="text-white font-bold text-sm tracking-tight">
            Arango<span className="text-arango-400">.</span>
          </span>
          <span className="text-muted text-xs hidden sm:inline">
            / Graph Studio
          </span>
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Schema stats */}
        <div className="flex items-center gap-2">
          {collections.length > 0 ? (
            <>
              <Badge variant="default" className="gap-1">
                <Layers className="w-2.5 h-2.5" />
                {collections.filter((c) => c.type === "document").length}{" "}
                vertices
              </Badge>
              <Badge variant="emerald" className="gap-1">
                <ChevronRight className="w-2.5 h-2.5" />
                {collections.filter((c) => c.type === "edge").length} edges
              </Badge>
            </>
          ) : (
            <span className="text-xs text-muted">No schema yet</span>
          )}
        </div>

        <div className="flex-1" />

        {/* Mobile panel toggle */}
        <div className="flex lg:hidden gap-1 p-1 bg-background rounded-lg border border-border">
          <button
            onClick={() => setActivePanel("chat")}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
              activePanel === "chat"
                ? "bg-arango-400 text-background"
                : "text-muted"
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            Chat
          </button>
          <button
            onClick={() => setActivePanel("schema")}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
              activePanel === "schema"
                ? "bg-arango-400 text-background"
                : "text-muted"
            }`}
          >
            <Database className="w-3 h-3" />
            Schema
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          className="text-muted hover:text-red-400 hover:bg-red-900/20"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Disconnect</span>
        </Button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel */}
        <main
          className={`flex flex-col border-r border-border overflow-hidden ${
            activePanel === "schema"
              ? "hidden lg:flex lg:flex-1"
              : "flex-1 lg:flex-1"
          }`}
        >
          <ChatInterface
            sessionToken={sessionToken}
            onSchemaUpdate={handleSchemaUpdate}
          />
        </main>

        {/* Schema panel */}
        <aside
          className={`flex flex-col w-full lg:w-[380px] xl:w-[440px] overflow-hidden bg-background-secondary ${
            activePanel === "chat" ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
            <div className="w-5 h-5 rounded-md bg-arango-400/10 border border-arango-400/20 flex items-center justify-center">
              <Database className="w-3 h-3 text-arango-400" />
            </div>
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Graph Schema
            </span>
            {collections.length > 0 && (
              <span className="text-xs text-muted ml-1">
                · {collections.length} collection{collections.length !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={() => setSchemaKey((k) => k + 1)}
              title="Refresh schema view"
              className="ml-auto p-1.5 rounded-md text-muted hover:text-arango-400 hover:bg-arango-400/10 transition-colors duration-150"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <GraphVisualizer key={schemaKey} collections={collections} />
          </div>
        </aside>
      </div>
    </div>
  );
}
