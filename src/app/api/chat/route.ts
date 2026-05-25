import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool } from "ai";
import { z } from "zod";
import { decryptCredentials } from "@/lib/session";
import {
  createCollections,
  seedSyntheticData,
  executeSampleQuery,
} from "@/lib/arango-client";
import { GRAPH_MODELER_SYSTEM_PROMPT } from "@/lib/prompt-templates";

export const maxDuration = 60;

const AttributeSchema = z.object({
  name: z.string().describe("Attribute name in camelCase"),
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  description: z.string(),
  required: z.boolean(),
  example: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .describe("A realistic example value for this attribute"),
});

const CollectionSchema = z.object({
  name: z.string().describe("Collection name in snake_case, plural"),
  type: z.enum(["document", "edge"]),
  description: z.string().describe("What this collection represents"),
  attributes: z.array(AttributeSchema).min(1).max(15),
});

export async function POST(req: Request) {
  const { messages, sessionToken } = (await req.json()) as {
    messages: { role: string; content: string }[];
    sessionToken: string;
  };

  if (!sessionToken) {
    return new Response("Missing session token", { status: 401 });
  }

  let creds: Awaited<ReturnType<typeof decryptCredentials>>;
  try {
    creds = await decryptCredentials(sessionToken);
  } catch {
    return new Response("Invalid or expired session", { status: 401 });
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-6", {
      cacheControl: true,
    }),
    system: GRAPH_MODELER_SYSTEM_PROMPT,
    messages: messages as Parameters<typeof streamText>[0]["messages"],
    maxSteps: 10,
    tools: {
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
        },
      }),

      seedSyntheticData: tool({
        description:
          "Populate collections with realistic synthetic data. Collections must exist first.",
        parameters: z.object({
          collections: z
            .array(CollectionSchema)
            .describe("Collections to seed — must match previously created collections"),
          documentsPerCollection: z
            .number()
            .min(5)
            .max(100)
            .default(20)
            .describe("Number of documents to insert per vertex collection"),
        }),
        execute: async ({ collections, documentsPerCollection }) => {
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
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
