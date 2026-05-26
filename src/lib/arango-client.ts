import { Database, aql } from "arangojs";
import type {
  ArangoCredentials,
  CollectionDefinition,
  SeedResult,
  QueryResult,
  ConnectionStatus,
} from "@/types";

const REQUEST_TIMEOUT_MS = 15_000;

function buildClient(creds: ArangoCredentials): Database {
  // keepalive defaults to true in arangojs v9 — it is passed directly
  // into the native fetch call. On Vercel serverless each invocation is
  // a fresh process, so the prior keepalive connection no longer exists
  // and fetch throws "keepalive". Setting it to false forces a fresh
  // connection per request, which is correct for stateless environments.
  return new Database({
    url: creds.url,
    databaseName: creds.database,
    auth: { username: creds.username, password: creds.password },
    keepalive: false,
  });
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

// Small word pools for varied synthetic strings when no example is provided
const FIRST_NAMES = ["Alice","Bob","Carlos","Diana","Ethan","Fatima","George","Hannah","Ivan","Julia","Kevin","Lena","Marco","Nina","Oscar","Priya","Quinn","Rafael","Sara","Tom","Uma","Victor","Wendy","Xia","Yusuf","Zoe"];
const LAST_NAMES = ["Smith","Garcia","Chen","Patel","Kim","Nguyen","Johnson","Williams","Brown","Davis","Miller","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin"];
const CITIES = ["New York","London","Tokyo","Paris","Sydney","Berlin","Toronto","Dubai","Seoul","São Paulo","Mumbai","Lagos","Singapore","Cairo","Mexico City","Bangkok","Istanbul","Jakarta","Moscow","Buenos Aires"];
const COMPANIES = ["Acme Corp","Globex","Initech","Umbrella Ltd","Soylent Inc","Hooli","Dunder Mifflin","Pied Piper","Waystar","Prestige Worldwide"];
const ADJECTIVES = ["fast","smart","robust","scalable","elegant","dynamic","reliable","modern","efficient","powerful"];
const NOUNS = ["system","platform","engine","framework","service","pipeline","module","cluster","network","graph"];

function deterministicPick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function buildSyntheticDocument(
  def: CollectionDefinition,
  index: number
): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  const nameLower = def.name.toLowerCase();

  for (const attr of def.attributes) {
    const attrLower = attr.name.toLowerCase();
    switch (attr.type) {
      case "string": {
        if (attr.example !== undefined) {
          // Use example as a template, vary the numeric suffix
          doc[attr.name] = String(attr.example).replace(/\d+$/, String(index + 1));
        } else if (attrLower.includes("first") || attrLower === "firstname" || attrLower === "given_name") {
          doc[attr.name] = deterministicPick(FIRST_NAMES, index);
        } else if (attrLower.includes("last") || attrLower === "lastname" || attrLower === "surname" || attrLower === "family_name") {
          doc[attr.name] = deterministicPick(LAST_NAMES, index);
        } else if (attrLower === "name" && (nameLower.includes("user") || nameLower.includes("person") || nameLower.includes("employee") || nameLower.includes("customer"))) {
          doc[attr.name] = `${deterministicPick(FIRST_NAMES, index)} ${deterministicPick(LAST_NAMES, index + 3)}`;
        } else if (attrLower === "name" && (nameLower.includes("company") || nameLower.includes("org") || nameLower.includes("vendor"))) {
          doc[attr.name] = deterministicPick(COMPANIES, index);
        } else if (attrLower.includes("city") || attrLower.includes("location") || attrLower.includes("place")) {
          doc[attr.name] = deterministicPick(CITIES, index);
        } else if (attrLower.includes("email")) {
          const first = deterministicPick(FIRST_NAMES, index).toLowerCase();
          const last = deterministicPick(LAST_NAMES, index + 2).toLowerCase();
          doc[attr.name] = `${first}.${last}${index + 1}@example.com`;
        } else if (attrLower.includes("title") || attrLower.includes("label")) {
          doc[attr.name] = `${deterministicPick(ADJECTIVES, index)} ${deterministicPick(NOUNS, index + 1)}`;
        } else {
          doc[attr.name] = `${attr.name}_${index + 1}`;
        }
        break;
      }
      case "number":
        doc[attr.name] =
          attr.example !== undefined
            ? Math.round((Number(attr.example) + index) * 10) / 10
            : index + 1;
        break;
      case "boolean":
        doc[attr.name] = index % 3 !== 0; // 2/3 true, 1/3 false — more realistic than 50/50
        break;
      case "array":
        doc[attr.name] = [
          deterministicPick(ADJECTIVES, index),
          deterministicPick(ADJECTIVES, index + 2),
        ];
        break;
      case "object":
        doc[attr.name] = { id: index + 1, value: deterministicPick(NOUNS, index) };
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
    // Seed vertex collections in parallel
    const vertexResults = await Promise.all(
      collections
        .filter((def) => def.type !== "edge")
        .map(async (def) => {
          const docs = Array.from({ length: documentsPerCollection }, (_, i) =>
            buildSyntheticDocument(def, i)
          );
          const collection = db.collection(def.name);
          await withTimeout(
            collection.import(docs, { onDuplicate: "ignore" }),
            `seedSyntheticData:import:${def.name}`
          );
          return { collection: def.name, inserted: docs.length, sample: docs.slice(0, 3) };
        })
    );
    results.push(...vertexResults);

    // Seed edges: link vertex collections pairwise
    const vertexCollections = collections.filter((c) => c.type === "document");
    const edgeCollections = collections.filter((c) => c.type === "edge");

    if (vertexCollections.length >= 1 && edgeCollections.length > 0) {
      const edgeResults = await Promise.all(
        edgeCollections.map(async (def, edgeIdx) => {
          const n = vertexCollections.length;
          // Rotate which vertex pair each edge collection connects
          const fromCol = vertexCollections[edgeIdx % n];
          const toCol = vertexCollections[(edgeIdx + 1) % n];

          const limit = documentsPerCollection;
          const [fromCursor, toCursor] = await withTimeout(
            Promise.all([
              db.query<{ _id: string }>(
                aql`FOR v IN ${db.collection(fromCol.name)} LIMIT ${limit} RETURN { _id: v._id }`
              ),
              db.query<{ _id: string }>(
                aql`FOR v IN ${db.collection(toCol.name)} LIMIT ${limit} RETURN { _id: v._id }`
              ),
            ]),
            `seedSyntheticData:edgeKeys:${def.name}`
          );

          const [fromDocs, toDocs] = await Promise.all([
            fromCursor.all(),
            toCursor.all(),
          ]);

          if (fromDocs.length === 0 || toDocs.length === 0) return null;

          const edgeDocs = fromDocs.map((f, i) => ({
            ...buildSyntheticDocument(def, i),
            // Explicit graph IDs must come last — override any _from/_to in schema
            _from: f._id,
            _to: toDocs[i % toDocs.length]._id,
          }));

          const edgeCol = db.collection(def.name);
          await withTimeout(
            edgeCol.import(edgeDocs, { onDuplicate: "ignore" }),
            `seedSyntheticData:edgeImport:${def.name}`
          );

          return { collection: def.name, inserted: edgeDocs.length, sample: edgeDocs.slice(0, 3) };
        })
      );

      results.push(...edgeResults.filter((r): r is NonNullable<typeof r> => r !== null));
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

export async function dropCollections(
  creds: ArangoCredentials,
  names: string[]
): Promise<{ dropped: string[]; errors: string[] }> {
  const db = buildClient(creds);
  try {
    const results = await Promise.all(
      names.map(async (name) => {
        try {
          await withTimeout(db.collection(name).drop(), `dropCollections:${name}`);
          return { name, ok: true, error: "" };
        } catch (err) {
          return { name, ok: false, error: err instanceof Error ? err.message : "unknown" };
        }
      })
    );
    return {
      dropped: results.filter((r) => r.ok).map((r) => r.name),
      errors: results.filter((r) => !r.ok).map((r) => `${r.name}: ${r.error}`),
    };
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
