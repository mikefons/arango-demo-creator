"use client";

import { useState } from "react";
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckResult {
  ok: boolean;
  detail: string;
}

interface TestResponse {
  status: "healthy" | "degraded" | "error";
  checks: Record<string, CheckResult>;
}

const CHECK_LABELS: Record<string, string> = {
  cookie_present: "Session cookie present",
  token_decrypted: "Token decrypted",
  credentials_complete: "Credential fields complete",
  arango_connection: "ArangoDB live connection",
};

export function CredentialTestPanel() {
  const [result, setResult] = useState<TestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function runTest() {
    setLoading(true);
    setResult(null);
    setExpanded(true);
    try {
      const res = await fetch("/api/test-credentials", { method: "POST" });
      const data = (await res.json()) as TestResponse;
      setResult(data);
    } catch {
      setResult({
        status: "error",
        checks: {
          fetch: {
            ok: false,
            detail: "Failed to reach /api/test-credentials — check network",
          },
        },
      });
    } finally {
      setLoading(false);
    }
  }

  const allOk = result?.status === "healthy";

  return (
    <div className="border-t border-border">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <FlaskConical className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs font-semibold text-muted uppercase tracking-wider flex-1">
          Credential Pipeline Test
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={runTest}
          disabled={loading}
          className="h-7 px-2.5 text-xs"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <FlaskConical className="w-3 h-3" />
          )}
          {loading ? "Testing..." : "Run test"}
        </Button>
        {result && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1 text-muted hover:text-slate-300 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Results */}
      {result && expanded && (
        <div className="px-4 pb-4 space-y-2 animate-fade-in">
          {/* Overall status */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold ${
              allOk
                ? "bg-arango-400/10 border-arango-400/30 text-arango-400"
                : "bg-red-900/20 border-red-800/40 text-red-400"
            }`}
          >
            {allOk ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {allOk
              ? "All checks passed — credentials are flowing correctly"
              : "Pipeline broken — see failing check below"}
          </div>

          {/* Per-check rows */}
          <div className="space-y-1.5">
            {Object.entries(result.checks).map(([key, check]) => (
              <div
                key={key}
                className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs ${
                  check.ok
                    ? "bg-background-tertiary border-border"
                    : "bg-red-900/10 border-red-800/40"
                }`}
              >
                {check.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-arango-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-slate-200">
                    {CHECK_LABELS[key] ?? key}
                  </p>
                  <p className={check.ok ? "text-muted" : "text-red-400"}>
                    {check.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
