"use client";

import { useMemo } from "react";
import { Database, Link2, Layers, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CollectionDefinition } from "@/types";

interface GraphVisualizerProps {
  collections: CollectionDefinition[];
}

export function GraphVisualizer({ collections }: GraphVisualizerProps) {
  const vertices = useMemo(
    () => collections.filter((c) => c.type === "document"),
    [collections]
  );
  const edges = useMemo(
    () => collections.filter((c) => c.type === "edge"),
    [collections]
  );

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-background-tertiary border border-border flex items-center justify-center">
          <Database className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm text-slate-200 font-semibold">No schema yet</p>
          <p className="text-xs text-muted mt-1.5 leading-relaxed">
            Ask the AI to design a graph schema and it will appear here in
            real-time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Vertex Collections */}
        {vertices.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-3.5 h-3.5 text-arango-400" />
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Vertex Collections
              </span>
              <Badge variant="default" className="ml-auto">
                {vertices.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {vertices.map((col) => (
                <CollectionCard key={col.name} col={col} />
              ))}
            </div>
          </section>
        )}

        {/* Edge Collections */}
        {edges.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Edge Collections
              </span>
              <Badge variant="emerald" className="ml-auto">
                {edges.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {edges.map((col) => (
                <CollectionCard key={col.name} col={col} isEdge />
              ))}
            </div>
          </section>
        )}

        {/* Graph topology map */}
        {vertices.length >= 2 && edges.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                Graph Topology
              </span>
            </div>
            <div className="rounded-lg border border-border bg-background p-4 space-y-3">
              {edges.map((edge, i) => {
                const from = vertices[i % vertices.length];
                const to = vertices[(i + 1) % vertices.length];
                return (
                  <div
                    key={edge.name}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="text-arango-400 font-mono bg-arango-400/10 border border-arango-400/20 px-2 py-0.5 rounded">
                      {from?.name ?? "?"}
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-emerald-300 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      {edge.name}
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-arango-400 font-mono bg-arango-400/10 border border-arango-400/20 px-2 py-0.5 rounded">
                      {to?.name ?? "?"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </ScrollArea>
  );
}

function CollectionCard({
  col,
  isEdge = false,
}: {
  col: CollectionDefinition;
  isEdge?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2 hover:border-arango-400/30 transition-colors duration-150">
      <div className="flex items-center gap-2">
        <span
          className={`font-mono text-sm font-semibold ${
            isEdge ? "text-emerald-300" : "text-arango-400"
          }`}
        >
          {col.name}
        </span>
        <Badge
          variant={isEdge ? "emerald" : "default"}
          className="text-[10px]"
        >
          {isEdge ? "edge" : "vertex"}
        </Badge>
      </div>
      {col.description && (
        <p className="text-xs text-muted">{col.description}</p>
      )}
      {col.attributes.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {col.attributes.map((attr) => (
            <span
              key={attr.name}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background-tertiary text-muted border border-border"
            >
              {attr.name}:{" "}
              <span className="text-amber-400/80">{attr.type}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
