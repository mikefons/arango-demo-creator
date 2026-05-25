"use client";

import {
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Database,
  Layers,
  Search,
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
  pending: (
    <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
  ),
  running: <Loader2 className="w-3.5 h-3.5 text-arango-400 animate-spin" />,
  done: <CheckCircle2 className="w-3.5 h-3.5 text-arango-400" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
};

export function ExecutionBlock({ block }: ExecutionBlockProps) {
  const config = typeConfig[block.type];
  const Icon = config.icon;

  return (
    <div className="rounded-lg border border-border bg-background-secondary overflow-hidden animate-slide-up">
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

      {block.detail && (
        <div className="px-3 py-2">
          <p className="text-xs text-muted leading-relaxed">{block.detail}</p>
        </div>
      )}

      {block.data != null && (
        <div className="px-3 pb-3">
          <pre className="mt-2 text-[11px] text-arango-300 bg-background rounded-md p-3 overflow-x-auto border border-border leading-relaxed max-h-48 overflow-y-auto">
            {typeof block.data === "string"
              ? block.data
              : JSON.stringify(block.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
