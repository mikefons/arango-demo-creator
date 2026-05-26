import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // 1. Env var presence
  checks.anthropic_key = {
    ok: Boolean(process.env.ANTHROPIC_API_KEY),
    detail: process.env.ANTHROPIC_API_KEY
      ? `set (sk-ant-...${process.env.ANTHROPIC_API_KEY.slice(-4)})`
      : "MISSING — set ANTHROPIC_API_KEY in Vercel env vars",
  };

  checks.session_secret = {
    ok:
      Boolean(process.env.SESSION_SECRET) &&
      process.env.SESSION_SECRET !== "fallback-dev-secret-32chars-min!!",
    detail: process.env.SESSION_SECRET
      ? process.env.SESSION_SECRET === "fallback-dev-secret-32chars-min!!"
        ? "using insecure fallback — set SESSION_SECRET in Vercel env vars"
        : `set (${process.env.SESSION_SECRET.length} chars)`
      : "MISSING — set SESSION_SECRET in Vercel env vars",
  };

  // 2. Live Anthropic API call
  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      prompt: 'Reply with only the word "ok".',
      maxTokens: 5,
    });
    checks.anthropic_api = {
      ok: true,
      detail: `live call succeeded — model replied: "${text.trim()}"`,
    };
  } catch (err) {
    checks.anthropic_api = {
      ok: false,
      detail: err instanceof Error ? err.message : "unknown error",
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return Response.json(
    { status: allOk ? "healthy" : "degraded", checks },
    { status: allOk ? 200 : 500 }
  );
}
