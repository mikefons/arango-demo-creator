"use client";

import { useState } from "react";
import {
  Database,
  Link,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateAndEncryptCredentials } from "@/app/actions";
import type { ArangoCredentials, ConnectionStatus } from "@/types";

interface CredentialFormProps {
  onSuccess: (token: string) => void;
}

type FormState = "idle" | "validating" | "success" | "error";

export function CredentialForm({ onSuccess }: CredentialFormProps) {
  const [activePanel, setActivePanel] = useState<"provision" | "connect">(
    "provision"
  );
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [connectedStatus, setConnectedStatus] = useState<ConnectionStatus | null>(null);
  const [fields, setFields] = useState<ArangoCredentials>({
    url: "",
    username: "root",
    password: "",
    database: "_system",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ArangoCredentials, string>>
  >({});

  function validate(): boolean {
    const errors: Partial<Record<keyof ArangoCredentials, string>> = {};
    if (!fields.url.startsWith("http")) {
      errors.url = "Must be a valid URL starting with https://";
    }
    if (!fields.username) errors.username = "Required";
    if (!fields.password) errors.password = "Required";
    if (!fields.database) errors.database = "Required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setFormState("validating");
    setErrorMsg("");
    setConnectedStatus(null);

    try {
      const { token, status } = await validateAndEncryptCredentials(fields);
      setConnectedStatus(status);
      setFormState("success");
      setTimeout(() => onSuccess(token), 2000);
    } catch (err) {
      setFormState("error");
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Connection failed. Check your credentials and try again."
      );
    }
  }

  function handleRetry() {
    setFormState("idle");
    setErrorMsg("");
    setConnectedStatus(null);
  }

  function update(field: keyof ArangoCredentials, value: string) {
    setFields((p) => ({ ...p, [field]: value }));
    setFieldErrors((p) => ({ ...p, [field]: undefined }));
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden border-r border-border">
        {/* Radial glow from bottom-left */}
        <div className="absolute bottom-0 left-0 w-[600px] h-[500px] bg-arango-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-arango-400/8 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            {/* Arango avocado-ish logo mark */}
            <div className="w-9 h-9 bg-arango-400 rounded-xl flex items-center justify-center shadow-lg shadow-arango-900/50">
              <Database className="w-5 h-5 text-background" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              Arango<span className="text-arango-400">.</span>
            </span>
          </div>

          <p className="text-arango-400 text-sm font-semibold uppercase tracking-widest mb-4">
            Graph Studio
          </p>
          <h1 className="text-4xl font-bold text-white leading-tight mb-5">
            Context changes
            <br />
            <span className="text-gradient-green">everything.</span>
          </h1>
          <p className="text-muted text-base leading-relaxed max-w-sm">
            The graph-native foundation for agentic AI. Design schemas, seed
            data, and run traversals — all through a conversational AI interface.
          </p>
        </div>

        {/* Feature tiles */}
        <div className="relative z-10 space-y-3">
          {[
            { icon: Database, label: "Schema-first graph modeling" },
            { icon: CheckCircle2, label: "AI-generated synthetic datasets" },
            { icon: Link, label: "Parameterized AQL traversals" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 text-sm text-muted"
            >
              <div className="w-7 h-7 rounded-lg bg-arango-400/10 border border-arango-400/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-arango-400" />
              </div>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — connection flow */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-background-secondary">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-arango-400 rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-background" />
            </div>
            <span className="text-white font-bold text-lg">
              Arango<span className="text-arango-400">.</span>
            </span>
          </div>

          {/* Step toggle */}
          <div className="flex gap-1 p-1 bg-background rounded-xl border border-border mb-8">
            <button
              onClick={() => setActivePanel("provision")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activePanel === "provision"
                  ? "bg-arango-400 text-background shadow-sm"
                  : "text-muted hover:text-slate-300"
              }`}
            >
              1. Get Free Trial
            </button>
            <button
              onClick={() => setActivePanel("connect")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activePanel === "connect"
                  ? "bg-arango-400 text-background shadow-sm"
                  : "text-muted hover:text-slate-300"
              }`}
            >
              2. Connect
            </button>
          </div>

          {activePanel === "provision" ? (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Provision Arango Managed Platform
                </h2>
                <p className="text-muted text-sm">
                  Start a free managed cloud trial — no credit card required.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-6 space-y-5">
                {[
                  {
                    step: "1",
                    title: "Visit the ArangoGraph dashboard",
                    desc: "Create a free account and spin up a managed deployment.",
                  },
                  {
                    step: "2",
                    title: "Note your endpoint URL and credentials",
                    desc: 'Found in your deployment details under "Connection".',
                  },
                  {
                    step: "3",
                    title: 'Return here and click "Connect"',
                    desc: "Credentials are never stored — only used per session.",
                  },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-arango-400/20 border border-arango-400/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-arango-400 text-xs font-bold">
                        {step}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-200 font-medium">
                        {title}
                      </p>
                      <p className="text-xs text-muted mt-1">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="https://dashboard.arangodb.cloud/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-arango-400 hover:bg-arango-300 text-background text-sm font-bold transition-colors shadow-lg shadow-arango-900/40"
              >
                Open Arango Managed Platform Dashboard
                <ExternalLink className="w-4 h-4" />
              </a>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setActivePanel("connect")}
              >
                I have credentials
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Connect Arango Managed Platform
                </h2>
                <p className="text-muted text-sm">
                  Credentials are encrypted and held only for this session.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="url">Endpoint URL</Label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://your-instance.arangodb.cloud:8529"
                      value={fields.url}
                      onChange={(e) => update("url", e.target.value)}
                      className="pl-9"
                      error={fieldErrors.url}
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="root"
                      value={fields.username}
                      onChange={(e) => update("username", e.target.value)}
                      className="pl-9"
                      error={fieldErrors.username}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={fields.password}
                      onChange={(e) => update("password", e.target.value)}
                      className="pl-9"
                      error={fieldErrors.password}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="database">Database</Label>
                  <div className="relative">
                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="database"
                      type="text"
                      placeholder="_system"
                      value={fields.database}
                      onChange={(e) => update("database", e.target.value)}
                      className="pl-9"
                      error={fieldErrors.database}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>

              {formState === "error" && (
                <div className="rounded-xl border border-red-800/50 bg-red-900/20 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/30 border-b border-red-800/40">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm font-semibold text-red-400">
                      Connection failed
                    </p>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    <p className="text-sm text-red-300 leading-relaxed">
                      {errorMsg}
                    </p>
                    <ul className="text-xs text-red-400/80 space-y-1 list-disc list-inside">
                      <li>Verify your endpoint URL includes the port (e.g. :8529)</li>
                      <li>Check your username and password are correct</li>
                      <li>Confirm the database name exists on your instance</li>
                    </ul>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRetry}
                      className="w-full mt-1"
                    >
                      Try again
                    </Button>
                  </div>
                </div>
              )}

              {formState === "success" && connectedStatus && (
                <div className="rounded-xl border border-arango-400/40 bg-arango-400/10 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-arango-400/20 border-b border-arango-400/30">
                    <CheckCircle2 className="w-4 h-4 text-arango-400 flex-shrink-0" />
                    <p className="text-sm font-semibold text-arango-400">
                      Successfully connected
                    </p>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Database</span>
                      <span className="font-mono text-arango-300">
                        {connectedStatus.database}
                      </span>
                    </div>
                    {connectedStatus.version && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">ArangoDB version</span>
                        <span className="font-mono text-arango-300">
                          v{connectedStatus.version}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Endpoint</span>
                      <span className="font-mono text-arango-300 truncate max-w-[180px]">
                        {fields.url}
                      </span>
                    </div>
                    <p className="text-xs text-arango-400/70 pt-1">
                      Launching workspace...
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={formState === "validating" || formState === "success"}
              >
                {formState === "validating" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing connection...
                  </>
                ) : formState === "success" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Connected
                  </>
                ) : (
                  <>
                    Connect Arango Managed Platform
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted">
                Your password is never stored. It is encrypted in a short-lived
                session token (1 hour) and discarded.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
