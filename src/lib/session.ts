import { SignJWT, jwtVerify } from "jose";
import type { ArangoCredentials } from "@/types";

const rawSecret = process.env.SESSION_SECRET;
if (!rawSecret && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET environment variable is not set. Set it in your Vercel project settings.");
}

const SECRET = new TextEncoder().encode(
  rawSecret ?? "fallback-dev-secret-32chars-min!!"
);

const ALG = "HS256";
const TTL_SECONDS = 3600; // 1 hour

export async function encryptCredentials(
  creds: ArangoCredentials
): Promise<string> {
  return new SignJWT({ creds })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(SECRET);
}

export async function decryptCredentials(
  token: string
): Promise<ArangoCredentials> {
  const { payload } = await jwtVerify(token, SECRET, { algorithms: [ALG] });
  const creds = payload.creds as ArangoCredentials;
  if (!creds?.url || !creds?.username || !creds?.database) {
    throw new Error("Invalid session payload");
  }
  return creds;
}
