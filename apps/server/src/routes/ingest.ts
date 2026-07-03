import { Hono } from "hono";
import { z } from "zod";
import { ingestDocuments } from "../lib/rag/ingest";

const ingestSchema = z.object({
  documents: z.array(
    z.object({
      content: z.string().min(1),
      metadata: z.record(z.string()).optional(),
    })
  ),
});

export const ingestRoute = new Hono();

ingestRoute.post("/", async (c) => {
  // Check admin key
  const adminKey = process.env.TALKLY_ADMIN_KEY;
  if (adminKey) {
    const auth = c.req.header("Authorization");
    if (auth !== `Bearer ${adminKey}`) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }

  const body = await c.req.json();
  const parsed = ingestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const tenant = c.get("tenant");
  const result = await ingestDocuments(parsed.data.documents, tenant.dbPath);
  return c.json(result);
});
