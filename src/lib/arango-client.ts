import { Database, aql } from "arangojs";
import type {
  ArangoCredentials,
  CollectionDefinition,
  SeedResult,
  QueryResult,
  ConnectionStatus,
} from "@/types";

function buildClient(creds: ArangoCredentials): Database {
  return new Database({
    url: creds.url,
    databaseName: creds.database,
    auth: { username: creds.username, password: creds.password },
  });
}

export async function testConnection(
  creds: ArangoCredentials
): Promise<ConnectionStatus> {
  const db = buildClient(creds);
  try {
    const info = await db.version();
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
  const results: { name: string; type: string; created: boolean }[] = [];

  try {
    for (const def of collections) {
      const exists = await db.collection(def.name).exists();
      if (!exists) {
        if (def.type === "edge") {
          await db.createEdgeCollection(def.name);
        } else {
          await db.createCollection(def.name);
        }
        results.push({ name: def.name, type: def.type, created: true });
      } else {
        results.push({ name: def.name, type: def.type, created: false });
      }
    }
  } finally {
    db.close();
  }

  return results;
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
      if (def.type === "edge") continue; // edge seeding handled separately

      const docs = Array.from({ length: documentsPerCollection }, (_, i) =>
        buildSyntheticDocument(def, i)
      );

      const collection = db.collection(def.name);
      await collection.import(docs, { onDuplicate: "ignore" });

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

      // Pull keys from vertex collections to build realistic edges
      const vertexCollections = collections.filter((c) => c.type === "document");
      if (vertexCollections.length < 2) continue;

      const fromCol = vertexCollections[0];
      const toCol = vertexCollections[1];

      const fromCursor = await db.query<{ _id: string }>(
        aql`FOR v IN ${db.collection(fromCol.name)} LIMIT 20 RETURN { _id: v._id }`
      );
      const tosCursor = await db.query<{ _id: string }>(
        aql`FOR v IN ${db.collection(toCol.name)} LIMIT 20 RETURN { _id: v._id }`
      );

      const fromDocs = await fromCursor.all();
      const tosDocs = await tosCursor.all();

      const edgeDocs = fromDocs.slice(0, 10).map((f, i) => ({
        _from: f._id,
        _to: tosDocs[i % tosDocs.length]._id,
        ...buildSyntheticDocument(def, i),
      }));

      await edgeCol.import(edgeDocs, { onDuplicate: "ignore" });

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

export async function executeSampleQuery(
  creds: ArangoCredentials,
  rawAql: string,
  bindVars: Record<string, unknown> = {}
): Promise<QueryResult> {
  // Validate: only allow SELECT-style operations — block mutating keywords
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
    const cursor = await db.query<Record<string, unknown>>(rawAql, bindVars, {
      count: true,
    });
    const results = await cursor.all();
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
