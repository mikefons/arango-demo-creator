export interface ArangoCredentials {
  url: string;
  username: string;
  password: string;
  database: string;
}

export interface CollectionDefinition {
  name: string;
  type: "document" | "edge";
  description: string;
  attributes: AttributeDefinition[];
  count?: number;
}

export interface AttributeDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  example?: string | number | boolean | unknown[] | Record<string, unknown>;
}

export interface EdgeDefinition {
  collection: string;
  from: string[];
  to: string[];
}

export interface GraphSchema {
  name: string;
  vertexCollections: CollectionDefinition[];
  edgeCollections: CollectionDefinition[];
  edgeDefinitions: EdgeDefinition[];
}

export interface SeedResult {
  collection: string;
  inserted: number;
  sample: Record<string, unknown>[];
}

export interface QueryResult {
  aql: string;
  description: string;
  results: Record<string, unknown>[];
  count: number;
}

export interface ExecutionBlock {
  id: string;
  type: "collections" | "seed" | "query" | "drop" | "error" | "info";
  status: "pending" | "running" | "done" | "failed";
  title: string;
  detail?: string;
  data?: unknown;
  timestamp: number;
}

export interface ConnectionStatus {
  connected: boolean;
  version?: string;
  database?: string;
  error?: string;
}
