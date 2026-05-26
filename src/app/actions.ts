"use server";

import { cookies } from "next/headers";
import { encryptCredentials, decryptCredentials } from "@/lib/session";
import { testConnection, listCollections } from "@/lib/arango-client";
import type { ArangoCredentials, ConnectionStatus, CollectionDefinition } from "@/types";

const COOKIE_NAME = "arango_session";
const COOKIE_MAX_AGE = 3600; // 1 hour — matches JWT TTL

export async function validateAndEncryptCredentials(
  creds: ArangoCredentials
): Promise<{ status: ConnectionStatus }> {
  const status = await testConnection(creds);
  if (!status.connected) {
    throw new Error(status.error ?? "Connection failed");
  }

  const token = await encryptCredentials(creds);
  const jar = await cookies();

  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return { status };
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionCredentials(): Promise<ConnectionStatus> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return { connected: false, error: "No session cookie" };

  try {
    const creds = await decryptCredentials(token);
    return testConnection(creds);
  } catch {
    return { connected: false, error: "Invalid or expired session" };
  }
}

export async function getExistingCollections(): Promise<CollectionDefinition[]> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return [];

  try {
    const creds = await decryptCredentials(token);
    const summaries = await listCollections(creds);
    return summaries.map((c) => ({
      name: c.name,
      type: c.type,
      description: "",
      attributes: [],
      count: c.count,
    }));
  } catch {
    return [];
  }
}
