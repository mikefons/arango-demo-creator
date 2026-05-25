"use server";

import { encryptCredentials, decryptCredentials } from "@/lib/session";
import { testConnection } from "@/lib/arango-client";
import type { ArangoCredentials, ConnectionStatus } from "@/types";

export async function validateAndEncryptCredentials(
  creds: ArangoCredentials
): Promise<{ token: string; status: ConnectionStatus }> {
  const status = await testConnection(creds);
  if (!status.connected) {
    throw new Error(status.error ?? "Connection failed");
  }
  const token = await encryptCredentials(creds);
  return { token, status };
}

export async function getConnectionStatus(
  token: string
): Promise<ConnectionStatus> {
  const creds = await decryptCredentials(token);
  return testConnection(creds);
}
