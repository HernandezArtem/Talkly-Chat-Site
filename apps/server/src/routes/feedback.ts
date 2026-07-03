import { Hono } from "hono";
import { feedbackPayloadSchema } from "@talkly/shared";
import { appendJsonlLog, createLoggedTextField, logRuntimeEvent } from "../lib/logging";

export const feedbackRoute = new Hono();

feedbackRoute.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = feedbackPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid feedback payload", details: parsed.error.flatten() }, 400);
  }

  const tenantId = c.get("tenantId");
  const requestId = c.req.header("x-request-id") || crypto.randomUUID();
  c.header("X-Request-Id", requestId);
  const entry = {
    timestamp: new Date().toISOString(),
    tenantId,
    ...parsed.data,
  };

  appendJsonlLog("./data/feedback", `${tenantId}.jsonl`, entry);

  logRuntimeEvent("info", "feedback_received", {
    requestId,
    tenantId,
    sentiment: parsed.data.sentiment,
    reason: parsed.data.reason,
    sourceCount: parsed.data.sources?.length ?? 0,
    sourceUrls: parsed.data.sources?.map((source) => source.url) ?? [],
    ...createLoggedTextField("question", parsed.data.question),
    ...createLoggedTextField("answer", parsed.data.answer),
  });

  return c.json({ ok: true });
});
