import { Database, aql } from "arangojs";
import type { Config } from "arangojs/connection";
import type {
  ArangoCredentials,
  CollectionDefinition,
  SeedResult,
  QueryResult,
  ConnectionStatus,
} from "@/types";

const REQUEST_TIMEOUT_MS = 15_000;

function buildClient(creds: ArangoCredentials): Database {
  // agentOptions is untyped in arangojs v9 but supported at runtime.
  // keepAlive: false is required for Vercel serverless — each invocation
  // is a fresh process, so reusing a keepalive connection from a prior
  // invocation causes a "keepalive" fetch error.
  const config = {
    url: creds.url,
    databaseName: creds.database,
    auth: { username: creds.username, password: creds.password },
    agentOptions: { keepAlive: false },
  } as unknown as Config;

  return new Database(config);
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `${label} timed out after ${REQUEST_TIMEOUT_MS}ms — check your ArangoGraph endpoint and credentials`
            )
          ),
        REQUEST_TIMEOUT_MS
      )
    ),
  ]);
}

export async function testConnection(
  creds: ArangoCredentials
): Promise<ConnectionStatus> {
  const db = buildClient(creds);
  try {
    const info = await withTimeout(db.version(), "testConnection");
    return {
      connected: true,
      version: info.version,
      database: creds.database,
    };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  } finally {
    db.close();
  }
}

export async function createCollections(
  creds: ArangoCredentials,
  collections: CollectionDefinition[]
): Promise<{ name: string; type: string; created: boolean }[]> {
  const db = buildClient(creds);

  try {
    // Check all existence in parallel
    const existenceChecks = await withTimeout(
      Promise.all(collections.map((def) => db.collection(def.name).exists())),
      "createCollections:exists"
    );

    // Create only the missing ones, in parallel
    const results = await withTimeout(
      Promise.all(
        collections.map(async (def, i) => {
          if (!existenceChecks[i]) {
            if (def.type === "edge") {
              await db.createEdgeCollection(def.name);
            } else {
              await db.createCollection(def.name);
            }
            return { name: def.name, type: def.type, created: true };
          }
          return { name: def.name, type: def.type, created: false };
        })
      ),
      "createCollections:create"
    );

    return results;
  } finally {
    db.close();
  }
}

function buildSyntheticDocument(
  def: CollectionDefinition,
  index: number
): Record<string, unknown> {
  const doc: Record<string, unknown> = {};

  for (const attr of def.attributes) {
    switch (attr.type) {
      case "string":
        doc[attr.name] =
          attr.example !== undefined
            ? String(attr.example).replace(/\d+$/, String(index + 1))
            : `${attr.name}_${index + 1}`;
        break;
      case "number":
        doc[attr.name] =
          attr.example !== undefined
            ? Number(attr.example) + index
            : index + 1;
        break;
      case "boolean":
        doc[attr.name] = index % 2 === 0;
        break;
      case "array":
        doc[attr.name] = [`item_${index + 1}_a`, `item_${index + 1}_b`];
        break;
      case "object":
        doc[attr.name] = { id: index + 1, label: `label_${index + 1}` };
        break;
    }
  }

  return doc;
}

export async function seedSyntheticData(
  creds: ArangoCredentials,
  collections: CollectionDefinition[],
  documentsPerCollection = 20
): Promise<SeedResult[]> {
  const db = buildClient(creds);
  const results: SeedResult[] = [];

  try {
    for (const def of collections) {
      if (def.type === "edge") continue;

      const docs = Array.from({ length: documentsPerCollection }, (_, i) =>
        buildSyntheticDocument(def, i)
      );

      const collection = db.collection(def.name);
      await withTimeout(
        collection.import(docs, { onDuplicate: "ignore" }),
        `seedSyntheticData:import:${def.name}`
      );

      results.push({
        collection: def.name,
        inserted: docs.length,
        sample: docs.slice(0, 3),
      });
    }

    // Seed edges: link vertex collections pairwise
    for (const def of collections) {
      if (def.type !== "edge") continue;

      const edgeCol = db.collection(def.name);
      const vertexCollections = collections.filter((c) => c.type === "document");
      if (vertexCollections.length < 2) continue;

      const fromCol = vertexCollections[0];
      const toCol = vertexCollections[1];

      const [fromCursor, tosCursor] = await withTimeout(
        Promise.all([
          db.query<{ _id: string }>(
            aql`FOR v IN ${db.collection(fromCol.name)} LIMIT 20 RETURN { _id: v._id }`
          ),
          db.query<{ _id: string }>(
            aql`FOR v IN ${db.collection(toCol.name)} LIMIT 20 RETURN { _id: v._id }`
          ),
        ]),
        `seedSyntheticData:edgeKeys:${def.name}`
      );

      const [fromDocs, tosDocs] = await Promise.all([
        fromCursor.all(),
        tosCursor.all(),
      ]);

      const edgeDocs = fromDocs.slice(0, 10).map((f, i) => ({
        _from: f._id,
        _to: tosDocs[i % tosDocs.length]._id,
        ...buildSyntheticDocument(def, i),
      }));

      await withTimeout(
        edgeCol.import(edgeDocs, { onDuplicate: "ignore" }),
        `seedSyntheticData:edgeImport:${def.name}`
      );

      results.push({
        collection: def.name,
        inserted: edgeDocs.length,
        sample: edgeDocs.slice(0, 3),
      });
    }
  } finally {
    db.close();
  }

  return results;
}

export interface CollectionSummary {
  name: string;
  type: "document" | "edge";
  count: number;
}

export async function listCollections(
  creds: ArangoCredentials
): Promise<CollectionSummary[]> {
  const db = buildClient(creds);
  try {
    const cols = await withTimeout(
      db.listCollections(true),
      "listCollections"
    );
    const summaries = await withTimeout(
      Promise.all(
        cols.map(async (col) => {
          const count = await db.collection(col.name).count();
          return {
            name: col.name,
            type: col.type === 3 ? ("edge" as const) : ("document" as const),
            count: count.count,
          };
        })
      ),
      "listCollections:counts"
    );
    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  } finally {
    db.close();
  }
}

export async function executeSampleQuery(
  creds: ArangoCredentials,
  rawAql: string,
  bindVars: Record<string, unknown> = {}
): Promise<QueryResult> {
  const normalized = rawAql.trim().toUpperCase();
  const forbidden = ["INSERT", "UPDATE", "REPLACE", "REMOVE", "UPSERT", "DROP"];
  for (const kw of forbidden) {
    if (normalized.includes(kw)) {
      throw new Error(
        `Query blocked: mutating keyword "${kw}" is not permitted in sample queries.`
      );
    }
  }

  const db = buildClient(creds);
  try {
    const cursor = await withTimeout(
      db.query<Record<string, unknown>>(rawAql, bindVars, { count: true }),
      "executeSampleQuery"
    );
    const results = await withTimeout(cursor.all(), "executeSampleQuery:fetch");
    return {
      aql: rawAql,
      description: "Sample traversal result",
      results,
      count: results.length,
    };
  } finally {
    db.close();
  }
}
