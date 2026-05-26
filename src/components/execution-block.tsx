"use client";

import {
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Database,
  Layers,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/utils";
import type { ExecutionBlock as ExecutionBlockType } from "@/types";

interface ExecutionBlockProps {
  block: ExecutionBlockType;
}

const typeConfig = {
  collections: {
    icon: Database,
    label: "Collections",
    badgeVariant: "default" as const,
  },
  seed: {
    icon: Layers,
    label: "Seed Data",
    badgeVariant: "emerald" as const,
  },
  query: {
    icon: Search,
    label: "AQL Query",
    badgeVariant: "default" as const,
  },
  drop: {
    icon: Trash2,
    label: "Drop",
    badgeVariant: "destructive" as const,
  },
  error: {
    icon: XCircle,
    label: "Error",
    badgeVariant: "destructive" as const,
  },
  info: {
    icon: Info,
    label: "Info",
    badgeVariant: "muted" as const,
  },
};

const statusIcon = {
  pending: <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />,
  running: <Loader2 className="w-3.5 h-3.5 text-arango-400 animate-spin" />,
  done: <CheckCircle2 className="w-3.5 h-3.5 text-arango-400" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
};

export function ExecutionBlock({ block }: ExecutionBlockProps) {
  const config = typeConfig[block.type] ?? typeConfig.info;
  const Icon = config.icon;

  return (
    <div className="rounded-lg border border-border bg-background-secondary overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-background-tertiary border-b border-border">
        <Icon className="w-3.5 h-3.5 text-muted" />
        <Badge variant={config.badgeVariant}>{config.label}</Badge>
        <span className="flex-1 text-xs text-slate-300 font-medium truncate">
          {block.title}
        </span>
        <div className="flex items-center gap-1.5">
          {statusIcon[block.status]}
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatTimestamp(block.timestamp)}
          </span>
        </div>
      </div>

      {/* Detail text */}
      {block.detail && (
        <div className="px-3 py-2">
          <p className="text-xs text-muted leading-relaxed">{block.detail}</p>
        </div>
      )}

      {/* Smart result rendering (done state only) */}
      {block.status === "done" && block.data != null && (
        <BlockResult type={block.type} data={block.data} />
      )}

      {/* Failure detail */}
      {block.status === "failed" && block.data != null && (
        <FailureDetail data={block.data} />
      )}
    </div>
  );
}

/* ── Result renderers ────────────────────────────────────────────── */

function BlockResult({ type, data }: { type: ExecutionBlockType["type"]; data: unknown }) {
  const d = data as Record<string, unknown>;

  if (type === "query") return <QueryResult d={d} />;
  if (type === "seed") return <SeedResult d={d} />;
  if (type === "collections" || type === "drop") return <CollectionsResult d={d} />;

  // Fallback: compact JSON
  return (
    <pre className="mx-3 mb-3 mt-2 text-[11px] text-arango-300 bg-background rounded-md p-3 overflow-x-auto border border-border leading-relaxed max-h-48 overflow-y-auto">
      {JSON.stringify(d, null, 2)}
    </pre>
  );
}

function QueryResult({ d }: { d: Record<string, unknown> }) {
  const sample = Array.isArray(d.sample) ? (d.sample as Record<string, unknown>[]) : [];
  const count = typeof d.count === "number" ? d.count : sample.length;
  const aql = typeof d.aql === "string" ? d.aql.trim() : null;

  // Show _id, _from, _to — hide only ArangoDB-internal metadata
  const HIDDEN = new Set(["_key", "_rev"]);
  const keys = sample.length > 0 ? Object.keys(sample[0]).filter((k) => !HIDDEN.has(k)) : [];

  return (
    <div className="px-3 pb-3 pt-2 space-y-2">
      {aql && (
        <pre className="text-[10px] font-mono bg-background border border-border rounded-md p-2 overflow-x-auto text-arango-300 leading-relaxed">
          {aql}
        </pre>
      )}
      {sample.length === 0 ? (
        <p className="text-xs text-muted">No results returned.</p>
      ) : (
        <>
          <p className="text-[10px] text-muted">
            {count} result{count !== 1 ? "s" : ""}
            {count > sample.length ? ` — showing first ${sample.length}` : ""}
          </p>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="bg-background-tertiary border-b border-border">
                  {keys.map((k) => (
                    <th key={k} className="px-2 py-1.5 text-left text-muted font-semibold whitespace-nowrap">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-background-secondary"}>
                    {keys.map((k) => (
                      <td key={k} className="px-2 py-1.5 text-arango-300 whitespace-nowrap max-w-[140px] truncate">
                        {formatCell(row[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SeedResult({ d }: { d: Record<string, unknown> }) {
  const results = Array.isArray(d.results)
    ? (d.results as Array<{ collection: string; inserted: number }>)
    : [];

  if (results.length === 0) return null;

  return (
    <div className="px-3 pb-3 pt-2 space-y-1">
      {results.map((r) => (
        <div key={r.collection} className="flex items-center justify-between text-xs">
          <span className="font-mono text-arango-400">{r.collection}</span>
          <span className="text-emerald-400 font-semibold tabular-nums">
            +{r.inserted} docs
          </span>
        </div>
      ))}
    </div>
  );
}

function CollectionsResult({ d }: { d: Record<string, unknown> }) {
  // createCollections result (tool returns `created` array)
  if (Array.isArray(d.created)) {
    const results = d.created as Array<{ name: string; type: string; created: boolean }>;
    return (
      <div className="px-3 pb-3 pt-2 space-y-1">
        {results.map((r) => (
          <div key={r.name} className="flex items-center gap-2 text-xs">
            <span className="font-mono text-arango-400">{r.name}</span>
            <Badge variant={r.type === "edge" ? "emerald" : "default"} className="text-[9px]">
              {r.type}
            </Badge>
            <span className="ml-auto text-[10px] text-muted">
              {r.created ? "created" : "already exists"}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // listCollections result
  if (Array.isArray(d.collections)) {
    const cols = d.collections as Array<{ name: string; type: string; count: number }>;
    if (cols.length === 0) return null;
    return (
      <div className="px-3 pb-3 pt-2 space-y-1">
        {cols.map((c) => (
          <div key={c.name} className="flex items-center gap-2 text-xs">
            <span className="font-mono text-arango-400">{c.name}</span>
            <Badge variant={c.type === "edge" ? "emerald" : "default"} className="text-[9px]">
              {c.type}
            </Badge>
            <span className="ml-auto text-[10px] text-muted tabular-nums">
              {c.count.toLocaleString()} docs
            </span>
          </div>
        ))}
      </div>
    );
  }

  // dropCollections result
  if (Array.isArray(d.dropped)) {
    const dropped = d.dropped as string[];
    if (dropped.length === 0) return null;
    return (
      <div className="px-3 pb-3 pt-2 space-y-1">
        {dropped.map((name) => (
          <div key={name} className="flex items-center gap-2 text-xs">
            <span className="font-mono text-red-400 line-through">{name}</span>
            <span className="ml-auto text-[10px] text-muted">dropped</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function FailureDetail({ data }: { data: unknown }) {
  const d = data as Record<string, unknown>;
  const error = typeof d.error === "string" ? d.error : JSON.stringify(data);
  return (
    <div className="px-3 pb-3 pt-1">
      <p className="text-[11px] text-red-400 leading-relaxed">{error}</p>
    </div>
  );
}

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}
