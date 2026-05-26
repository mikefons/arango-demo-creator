"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useChat } from "ai/react";
import {
  Send,
  Loader2,
  Bot,
  User,
  Database,
  Layers,
  Search,
  Sparkles,
  StopCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExecutionBlock } from "@/components/execution-block";
import type {
  CollectionDefinition,
  ExecutionBlock as ExecutionBlockType,
} from "@/types";

interface ChatInterfaceProps {
  onSchemaUpdate: (collections: CollectionDefinition[]) => void;
  onSchemaRemove: (names: string[]) => void;
  onSessionExpired: () => void;
}

const STARTER_PROMPTS = [
  {
    icon: Database,
    label: "Social Network",
    prompt:
      "Design a social network graph with users, posts, and friendships. Create the collections and seed 30 users with posts.",
  },
  {
    icon: Layers,
    label: "E-Commerce",
    prompt:
      "Build a product recommendation graph: customers, products, categories, and purchases. Add 25 customers and 40 products.",
  },
  {
    icon: Search,
    label: "Knowledge Graph",
    prompt:
      "Create a knowledge graph for a tech company: employees, teams, skills, and projects. Seed realistic data and run a traversal.",
  },
];

export function ChatInterface({
  onSchemaUpdate,
  onSchemaRemove,
  onSessionExpired,
}: ChatInterfaceProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [executionBlocks, setExecutionBlocks] = useState<ExecutionBlockType[]>(
    []
  );

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, append, error } =
    useChat({
      api: "/api/chat",
      onError: (err) => {
        const msg = err.message;
        if (
          msg.includes("401") ||
          msg.includes("Missing session") ||
          msg.includes("Session expired")
        ) {
          onSessionExpired();
        }
      },
      onToolCall: ({ toolCall }) => {
        const typeMap: Record<string, ExecutionBlockType["type"]> = {
          createCollections: "collections",
          listCollections: "collections",
          seedSyntheticData: "seed",
          executeSampleQuery: "query",
          dropCollections: "drop",
        };
        const titleMap: Record<string, string> = {
          createCollections: "Creating collections...",
          listCollections: "Listing collections...",
          seedSyntheticData: "Seeding synthetic data...",
          executeSampleQuery: "Running AQL query...",
          dropCollections: "Dropping collections...",
        };
        setExecutionBlocks((prev) => {
          const next = [
            ...prev,
            {
              id: toolCall.toolCallId,
              type: typeMap[toolCall.toolName] ?? "info",
              status: "running" as const,
              title: titleMap[toolCall.toolName] ?? toolCall.toolName,
              timestamp: Date.now(),
            },
          ];
          return next.length > 50 ? next.slice(-50) : next;
        });
      },
    });

  // Parse tool results from assistant message toolInvocations
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      if (!Array.isArray(msg.toolInvocations)) continue;

      for (const ti of msg.toolInvocations) {
        if (!("state" in ti) || ti.state !== "result") continue;
        const toolCallId =
          "toolCallId" in ti ? (ti.toolCallId as string) : "";
        const result =
          "result" in ti
            ? (ti.result as Record<string, unknown>)
            : {};

        if (
          ti.toolName === "createCollections" &&
          "args" in ti &&
          ti.args &&
          typeof ti.args === "object" &&
          "collections" in ti.args
        ) {
          onSchemaUpdate(ti.args.collections as CollectionDefinition[]);
        }

        if (
          ti.toolName === "listCollections" &&
          result.success === true &&
          Array.isArray(result.collections)
        ) {
          const defs: CollectionDefinition[] = (
            result.collections as Array<{ name: string; type: "document" | "edge"; count?: number }>
          ).map((c) => ({
            name: c.name,
            type: c.type,
            description: "",
            attributes: [],
            count: c.count,
          }));
          onSchemaUpdate(defs);
        }

        if (
          ti.toolName === "dropCollections" &&
          Array.isArray(result.dropped) &&
          (result.dropped as string[]).length > 0
        ) {
          onSchemaRemove(result.dropped as string[]);
        }

        setExecutionBlocks((prev) =>
          prev.map((b) => {
            if (b.id !== toolCallId) return b;
            const isSuccess = result.success !== false;
            return {
              ...b,
              status: isSuccess ? ("done" as const) : ("failed" as const),
              title: (result.summary as string) ?? b.title,
              data: result,
            };
          })
        );
      }
    }
  }, [messages, onSchemaUpdate, onSchemaRemove]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, executionBlocks]);

  // Reset textarea height when input is cleared after submit
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input]);

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    handleInputChange(e);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  const sendStarter = useCallback(
    (prompt: string) => {
      append({ role: "user", content: prompt });
    },
    [append]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center px-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-arango-400/10 border border-arango-400/20 flex items-center justify-center glow-green">
                  <Sparkles className="w-7 h-7 text-arango-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-arango-400 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-background rounded-full" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Graph Modeler Ready
                </h3>
                <p className="text-sm text-muted max-w-sm leading-relaxed">
                  Describe your domain and I&apos;ll design the schema, seed
                  synthetic data, and run traversal queries — all in one
                  conversation.
                </p>
              </div>
              <div className="grid gap-2 w-full max-w-sm">
                {STARTER_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => sendStarter(prompt)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background-secondary hover:bg-background-tertiary hover:border-arango-400/40 transition-all duration-200 text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-arango-400/10 border border-arango-400/20 flex items-center justify-center flex-shrink-0 group-hover:bg-arango-400/20 transition-colors">
                      <Icon className="w-4 h-4 text-arango-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        {label}
                      </p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">
                        {prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              if (msg.role !== "user" && msg.role !== "assistant") return null;

              if (
                msg.role === "assistant" &&
                Array.isArray(msg.toolInvocations) &&
                msg.toolInvocations.length > 0 &&
                !msg.content
              ) {
                return (
                  <div key={msg.id} className="space-y-2">
                    {executionBlocks
                      .filter((b) =>
                        (
                          msg.toolInvocations as Array<{ toolCallId: string }>
                        ).some((ti) => ti.toolCallId === b.id)
                      )
                      .map((block) => (
                        <ExecutionBlock key={block.id} block={block} />
                      ))}
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 animate-slide-up ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      msg.role === "user"
                        ? "bg-arango-400"
                        : "bg-background-tertiary border border-border"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="w-3.5 h-3.5 text-background" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-arango-400" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-arango-400 text-background font-medium"
                        : "bg-background-secondary border border-border text-slate-200"
                    }`}
                  >
                    {typeof msg.content === "string" ? (
                      <MarkdownMessage content={msg.content} />
                    ) : null}
                    {msg.role === "assistant" &&
                      Array.isArray(msg.toolInvocations) &&
                      msg.toolInvocations.length > 0 &&
                      msg.content && (
                        <div className="mt-3 space-y-2">
                          {executionBlocks
                            .filter((b) =>
                              (
                                msg.toolInvocations as Array<{
                                  toolCallId: string;
                                }>
                              ).some((ti) => ti.toolCallId === b.id)
                            )
                            .map((block) => (
                              <ExecutionBlock key={block.id} block={block} />
                            ))}
                        </div>
                      )}
                  </div>
                </div>
              );
            })
          )}

          {isLoading &&
            !executionBlocks.some((b) => b.status === "running") && (
              <div className="flex gap-3 animate-slide-up">
                <div className="w-7 h-7 rounded-lg bg-background-tertiary border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-arango-400" />
                </div>
                <div className="bg-background-secondary border border-border rounded-xl px-4 py-3">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-arango-400 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          {error &&
            !error.message.includes("401") &&
            !error.message.includes("Missing session") &&
            !error.message.includes("Session expired") && (
              <div className="flex gap-3 animate-slide-up">
                <div className="w-7 h-7 rounded-lg bg-red-900/20 border border-red-800/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                </div>
                <div className="bg-red-900/10 border border-red-800/30 rounded-xl px-4 py-2.5 text-xs text-red-300 max-w-[80%]">
                  {error.message}
                </div>
              </div>
            )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t border-border bg-background-secondary">
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 items-end"
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={onKeyDown}
              placeholder="Describe your graph domain..."
              rows={1}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-slate-200 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-arango-400/60 focus:border-arango-400/50 transition-colors pr-12 max-h-40"
            />
          </div>
          {isLoading ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={stop}
              className="flex-shrink-0 h-11 w-11"
            >
              <StopCircle className="w-4 h-4 text-red-400" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="flex-shrink-0 h-11 w-11 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          )}
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}

// ── Markdown renderer ────────────────────────────────────────────────────────

type MdNode =
  | { kind: "code"; lang: string; lines: string[] }
  | { kind: "heading"; level: number; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "ordered"; text: string }
  | { kind: "divider" }
  | { kind: "text"; text: string };

function parseMarkdown(content: string): MdNode[] {
  const raw = content.split("\n");
  const nodes: MdNode[] = [];
  let i = 0;

  while (i < raw.length) {
    const line = raw[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < raw.length && !raw[i].startsWith("```")) {
        codeLines.push(raw[i]);
        i++;
      }
      nodes.push({ kind: "code", lang, lines: codeLines });
      i++;
      continue;
    }

    const hMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      nodes.push({ kind: "heading", level: hMatch[1].length, text: hMatch[2] });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      nodes.push({ kind: "bullet", text: line.replace(/^[-*]\s+/, "") });
      i++;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      nodes.push({ kind: "ordered", text: line.replace(/^\d+\.\s+/, "") });
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      nodes.push({ kind: "divider" });
      i++;
      continue;
    }

    nodes.push({ kind: "text", text: line });
    i++;
  }

  return nodes;
}

function MarkdownMessage({ content }: { content: string }) {
  const nodes = useMemo(() => parseMarkdown(content), [content]);
  const elements: React.ReactNode[] = [];
  let key = 0;
  let j = 0;

  while (j < nodes.length) {
    const node = nodes[j];

    // Group consecutive bullet items into a <ul>
    if (node.kind === "bullet") {
      const items: string[] = [];
      while (j < nodes.length && nodes[j].kind === "bullet") {
        items.push((nodes[j] as { kind: "bullet"; text: string }).text);
        j++;
      }
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-0.5 pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Group consecutive ordered items into an <ol>
    if (node.kind === "ordered") {
      const items: string[] = [];
      while (j < nodes.length && nodes[j].kind === "ordered") {
        items.push((nodes[j] as { kind: "ordered"; text: string }).text);
        j++;
      }
      elements.push(
        <ol key={key++} className="list-decimal list-inside space-y-0.5 pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (node.kind === "code") {
      elements.push(
        <pre
          key={key++}
          className="mt-1 mb-1 text-[11px] bg-background rounded-md p-3 overflow-x-auto border border-border text-arango-300 leading-relaxed"
        >
          {node.lines.join("\n")}
        </pre>
      );
    } else if (node.kind === "heading") {
      const cls =
        node.level === 1
          ? "text-base font-bold text-white mt-1"
          : node.level === 2
          ? "text-sm font-semibold text-slate-100 mt-1"
          : "text-xs font-semibold text-slate-300 uppercase tracking-wide mt-1";
      elements.push(
        <p key={key++} className={cls}>
          {renderInline(node.text)}
        </p>
      );
    } else if (node.kind === "divider") {
      elements.push(<hr key={key++} className="border-border my-1" />);
    } else {
      // plain text — skip blank lines silently, render others
      if (node.text.trim()) {
        elements.push(
          <p key={key++} className="leading-relaxed text-sm">
            {renderInline(node.text)}
          </p>
        );
      }
    }

    j++;
  }

  return <div className="space-y-1">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Split on: `code`, **bold**, *italic*
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-arango-400/10 text-arango-300 text-[11px] font-mono border border-arango-400/20"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
