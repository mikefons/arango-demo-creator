"use client";

import { useMemo, useState } from "react";
import { Database, Link2, Layers, ArrowRight, Network, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { truncateString } from "@/lib/utils";
import type { CollectionDefinition } from "@/types";

interface GraphVisualizerProps {
  collections: CollectionDefinition[];
}

type View = "schema" | "diagram";

export function GraphVisualizer({ collections }: GraphVisualizerProps) {
  const [view, setView] = useState<View>("schema");

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
    <div className="flex flex-col h-full">
      {/* View toggle */}
      <div className="flex gap-1 p-2 border-b border-border flex-shrink-0">
        <button
          onClick={() => setView("schema")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === "schema"
              ? "bg-arango-400/15 text-arango-400 border border-arango-400/30"
              : "text-muted hover:text-slate-300"
          }`}
        >
          <List className="w-3 h-3" />
          Schema
        </button>
        <button
          onClick={() => setView("diagram")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === "diagram"
              ? "bg-arango-400/15 text-arango-400 border border-arango-400/30"
              : "text-muted hover:text-slate-300"
          }`}
        >
          <Network className="w-3 h-3" />
          Diagram
        </button>
      </div>

      {view === "schema" ? (
        <SchemaView vertices={vertices} edges={edges} />
      ) : (
        <DiagramView vertices={vertices} edges={edges} />
      )}
    </div>
  );
}

/* ── Schema (card) view ──────────────────────────────────────────── */

function SchemaView({
  vertices,
  edges,
}: {
  vertices: CollectionDefinition[];
  edges: CollectionDefinition[];
}) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
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
                  <div key={edge.name} className="flex items-center gap-2 text-xs">
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

/* ── Node-link diagram view ──────────────────────────────────────── */

function DiagramView({
  vertices,
  edges,
}: {
  vertices: CollectionDefinition[];
  edges: CollectionDefinition[];
}) {
  const W = 300, H = 280, CX = 150, CY = 140;
  const ringR = vertices.length <= 1 ? 0 : Math.min(90, 60 + vertices.length * 8);
  const nodeR = 28;

  const positions = useMemo(
    () =>
      vertices.map((_, i) => {
        const angle =
          (2 * Math.PI * i) / Math.max(vertices.length, 1) - Math.PI / 2;
        return {
          x: CX + ringR * Math.cos(angle),
          y: CY + ringR * Math.sin(angle),
        };
      }),
    [vertices, ringR]
  );

  const edgeLinks = useMemo(
    () =>
      edges.map((edge, i) => {
        const n = vertices.length;
        if (n === 0) return null;
        const fromIdx = i % n;
        const toIdx = n === 1 ? 0 : (i + 1) % n;
        return { edge, fromIdx, toIdx };
      }).filter(Boolean) as Array<{ edge: CollectionDefinition; fromIdx: number; toIdx: number }>,
    [edges, vertices.length]
  );

  if (vertices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center px-6 gap-2">
        <p className="text-xs text-muted">No vertex collections to diagram yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-h-64"
        aria-label="Graph schema diagram"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#475569" />
          </marker>
          <marker
            id="arrowhead-self"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#475569" />
          </marker>
        </defs>

        {/* Edge lines */}
        {edgeLinks.map(({ edge, fromIdx, toIdx }) => {
          const from = positions[fromIdx];
          const to = positions[toIdx];

          // Self-loop
          if (fromIdx === toIdx) {
            const lx = from.x + nodeR + 18;
            const ly = from.y - 18;
            return (
              <g key={edge.name}>
                <path
                  d={`M ${from.x + nodeR * 0.7} ${from.y - nodeR * 0.7} C ${lx} ${ly - 20} ${lx + 20} ${ly + 10} ${from.x + nodeR * 0.7} ${from.y + nodeR * 0.3}`}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead-self)"
                />
                <text
                  x={lx + 14}
                  y={ly - 8}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#10b981"
                  fontFamily="monospace"
                >
                  {truncateString(edge.name, 12)}
                </text>
              </g>
            );
          }

          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0) return null;
          const ux = dx / len, uy = dy / len;
          const x1 = from.x + ux * nodeR;
          const y1 = from.y + uy * nodeR;
          const x2 = to.x - ux * (nodeR + 9);
          const y2 = to.y - uy * (nodeR + 9);
          // Slight curve offset so parallel edges don't overlap
          const mx = (x1 + x2) / 2 - uy * 14;
          const my = (y1 + y2) / 2 + ux * 14;

          return (
            <g key={edge.name}>
              <path
                d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                fill="none"
                stroke="#334155"
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={mx}
                y={my - 5}
                textAnchor="middle"
                fontSize="8"
                fill="#10b981"
                fontFamily="monospace"
              >
                {truncateString(edge.name, 14)}
              </text>
            </g>
          );
        })}

        {/* Vertex circles */}
        {vertices.map((v, i) => (
          <g key={v.name}>
            <circle
              cx={positions[i].x}
              cy={positions[i].y}
              r={nodeR}
              fill="#0f172a"
              stroke="#a3e635"
              strokeWidth="1.5"
            />
            <text
              x={positions[i].x}
              y={v.count != null ? positions[i].y - 4 : positions[i].y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="8"
              fill="#a3e635"
              fontFamily="monospace"
              fontWeight="600"
            >
              {truncateString(v.name, 10)}
            </text>
            {v.count != null && (
              <text
                x={positions[i].x}
                y={positions[i].y + 7}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7"
                fill="#7FAF8A"
                fontFamily="monospace"
              >
                {v.count.toLocaleString()}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-[10px] text-muted">
          <div className="w-3 h-3 rounded-full border border-arango-400 bg-background" />
          vertex
        </div>
        {edges.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <div className="w-5 h-px bg-slate-600" />
            <span className="text-emerald-400">edge</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Collection card ─────────────────────────────────────────────── */

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
        <Badge variant={isEdge ? "emerald" : "default"} className="text-[10px]">
          {isEdge ? "edge" : "vertex"}
        </Badge>
        {col.count != null && (
          <span className="ml-auto text-[10px] text-muted tabular-nums">
            {col.count.toLocaleString()} docs
          </span>
        )}
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
