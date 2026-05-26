import { decryptCredentials } from "@/lib/session";
import { testConnection } from "@/lib/arango-client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // 1. Parse request body
  let sessionToken: string | undefined;
  try {
    const body = (await req.json()) as { sessionToken?: string };
    sessionToken = body.sessionToken;
    checks.token_received = {
      ok: Boolean(sessionToken),
      detail: sessionToken
        ? `token present (${sessionToken.length} chars)`
        : "no sessionToken in request body — chat is not forwarding credentials",
    };
  } catch {
    return Response.json(
      {
        status: "error",
        checks: {
          token_received: {
            ok: false,
            detail: "failed to parse request body as JSON",
          },
        },
      },
      { status: 400 }
    );
  }

  if (!sessionToken) {
    return Response.json(
      { status: "degraded", checks },
      { status: 400 }
    );
  }

  // 2. Decrypt the token
  let creds: Awaited<ReturnType<typeof decryptCredentials>> | null = null;
  try {
    creds = await decryptCredentials(sessionToken);
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

  // 3. Validate credential fields
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

  // 4. Live ArangoDB connection test using the decrypted creds
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
      detail: err instanceof Error
        ? err.message
        : "connection attempt threw an unknown error",
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return Response.json(
    { status: allOk ? "healthy" : "degraded", checks },
    { status: allOk ? 200 : 500 }
  );
}
