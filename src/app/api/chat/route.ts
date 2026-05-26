import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool } from "ai";
import { z } from "zod";
import { cookies } from "next/headers";
import { decryptCredentials } from "@/lib/session";
import {
  createCollections,
  listCollections,
  seedSyntheticData,
  executeSampleQuery,
  dropCollections,
} from "@/lib/arango-client";
import { GRAPH_MODELER_SYSTEM_PROMPT } from "@/lib/prompt-templates";

export const maxDuration = 60;

const AttributeSchema = z.object({
  name: z.string().describe("Attribute name in camelCase"),
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  description: z.string(),
  required: z.boolean(),
  example: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.unknown()), z.record(z.unknown())])
    .optional()
    .describe("A realistic example value for this attribute"),
});

const CollectionSchema = z.object({
  name: z.string().describe("Collection name in snake_case, plural"),
  type: z.enum(["document", "edge"]),
  description: z.string().describe("What this collection represents"),
  attributes: z.array(AttributeSchema).min(1).max(15),
});

function toolError(label: string, err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  console.error(`[${label}]`, message);
  return { success: false, error: message, summary: `${label} failed: ${message}` };
}

export async function POST(req: Request) {
  // Read session from HttpOnly cookie — never from request body
  const jar = await cookies();
  const token = jar.get("arango_session")?.value;

  if (!token) {
    return new Response("Missing session — please reconnect", { status: 401 });
  }

  let creds: Awaited<ReturnType<typeof decryptCredentials>>;
  try {
    creds = await decryptCredentials(token);
  } catch {
    return new Response("Session expired — please reconnect", { status: 401 });
  }

  const { messages } = (await req.json()) as {
    messages: { role: string; content: string }[];
  };

  const result = streamText({
    model: anthropic("claude-sonnet-4-6", {
      cacheControl: true,
    }),
    system: GRAPH_MODELER_SYSTEM_PROMPT,
    messages: messages as Parameters<typeof streamText>[0]["messages"],
    maxSteps: 10,
    // Retry up to 3 times (4 total attempts) with exponential backoff.
    // Covers transient Anthropic errors: 429 rate-limit, 503/529 overloaded.
    maxRetries: 3,
    onError: ({ error }) => {
      console.error("[chat/route] streamText error:", error);
    },
    tools: {
      listCollections: tool({
        description:
          "List all user collections in the connected database with their type (document/edge) and document count. Call this to discover what already exists before creating or seeding.",
        parameters: z.object({}),
        execute: async () => {
          try {
            const collections = await listCollections(creds);
            const vertices = collections.filter((c) => c.type === "document");
            const edges = collections.filter((c) => c.type === "edge");
            return {
              success: true,
              total: collections.length,
              vertices: vertices.length,
              edges: edges.length,
              collections,
              summary:
                collections.length === 0
                  ? "Database is empty — no user collections found"
                  : `Found ${collections.length} collection(s): ${collections
                      .map((c) => `${c.name} (${c.type}, ${c.count} docs)`)
                      .join(", ")}`,
            };
          } catch (err) {
            return toolError("listCollections", err);
          }
        },
      }),

      createCollections: tool({
        description:
          "Create vertex and/or edge collections in ArangoGraph. Call this first before seeding data.",
        parameters: z.object({
          collections: z
            .array(CollectionSchema)
            .min(1)
            .describe("Array of collection definitions to create"),
        }),
        execute: async ({ collections }) => {
          try {
            const results = await createCollections(creds, collections);
            return {
              success: true,
              created: results,
              summary: results
                .map(
                  (r) =>
                    `${r.created ? "Created" : "Already exists"}: ${r.name} (${r.type})`
                )
                .join(", "),
            };
          } catch (err) {
            return toolError("createCollections", err);
          }
        },
      }),

      seedSyntheticData: tool({
        description:
          "Populate collections with realistic synthetic data. Collections must exist first.",
        parameters: z.object({
          collections: z
            .array(CollectionSchema)
            .describe(
              "Collections to seed — must match previously created collections"
            ),
          documentsPerCollection: z
            .number()
            .min(5)
            .max(50)
            .default(20)
            .describe("Number of documents to insert per vertex collection (max 50)"),
        }),
        execute: async ({ collections, documentsPerCollection }) => {
          try {
            const results = await seedSyntheticData(
              creds,
              collections,
              documentsPerCollection
            );
            return {
              success: true,
              results,
              summary: results
                .map((r) => `Seeded ${r.inserted} docs into '${r.collection}'`)
                .join(", "),
            };
          } catch (err) {
            return toolError("seedSyntheticData", err);
          }
        },
      }),

      executeSampleQuery: tool({
        description:
          "Run a read-only AQL traversal to demonstrate the graph structure. No mutating operations allowed.",
        parameters: z.object({
          aql: z
            .string()
            .describe(
              "A valid read-only AQL query (FOR...RETURN pattern). No INSERT/UPDATE/REMOVE."
            ),
          description: z
            .string()
            .describe("Plain-English description of what this query demonstrates"),
          bindVars: z
            .record(z.unknown())
            .optional()
            .describe("Optional bind variables for parameterized queries"),
        }),
        execute: async ({ aql: rawAql, description, bindVars }) => {
          try {
            const result = await executeSampleQuery(
              creds,
              rawAql,
              bindVars ?? {}
            );
            return {
              success: true,
              description,
              aql: rawAql,
              count: result.count,
              sample: result.results.slice(0, 5),
            };
          } catch (err) {
            return toolError("executeSampleQuery", err);
          }
        },
      }),

      dropCollections: tool({
        description:
          "Permanently drop named collections from the database. Only call this AFTER the user has explicitly confirmed they want to delete the listed collections. Always state the collection names and ask for confirmation before calling this tool.",
        parameters: z.object({
          names: z
            .array(z.string())
            .min(1)
            .describe("Exact collection names to drop"),
        }),
        execute: async ({ names }) => {
          try {
            const result = await dropCollections(creds, names);
            const allOk = result.errors.length === 0;
            return {
              success: allOk,
              dropped: result.dropped,
              errors: result.errors,
              summary:
                result.dropped.length > 0
                  ? `Dropped: ${result.dropped.join(", ")}${result.errors.length > 0 ? `. Failed: ${result.errors.join(", ")}` : ""}`
                  : `Failed to drop: ${result.errors.join(", ")}`,
            };
          } catch (err) {
            return toolError("dropCollections", err);
          }
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
