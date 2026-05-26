import { cookies } from "next/headers";
import { decryptCredentials } from "@/lib/session";
import { testConnection } from "@/lib/arango-client";

export const runtime = "nodejs";

export async function POST() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // 1. Cookie presence
  const jar = await cookies();
  const token = jar.get("arango_session")?.value;

  checks.cookie_present = {
    ok: Boolean(token),
    detail: token
      ? `session cookie found (${token.length} chars)`
      : "arango_session cookie missing — reconnect to set it",
  };

  if (!token) {
    return Response.json({ status: "degraded", checks }, { status: 401 });
  }

  // 2. Decrypt
  let creds: Awaited<ReturnType<typeof decryptCredentials>> | null = null;
  try {
    creds = await decryptCredentials(token);
    checks.token_decrypted = {
      ok: true,
      detail: `decrypted OK — url: ${creds.url}, database: ${creds.database}, username: ${creds.username}`,
    };
  } catch (err) {
    checks.token_decrypted = {
      ok: false,
      detail: err instanceof Error
        ? `decrypt failed: ${err.message} — token may be expired or SESSION_SECRET mismatch`
        : "decrypt failed: unknown error",
    };
    return Response.json({ status: "degraded", checks }, { status: 401 });
  }

  // 3. Field completeness
  const missing = (["url", "username", "password", "database"] as const).filter(
    (k) => !creds![k]
  );
  checks.credentials_complete = {
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? "all fields present"
        : `missing fields: ${missing.join(", ")}`,
  };

  // 4. Live ArangoDB ping
  try {
    const status = await testConnection(creds);
    checks.arango_connection = {
      ok: status.connected,
      detail: status.connected
        ? `connected to ArangoDB v${status.version} — database: ${status.database}`
        : `connection failed: ${status.error}`,
    };
  } catch (err) {
    checks.arango_connection = {
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
