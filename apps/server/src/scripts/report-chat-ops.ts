import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { resolveFromServerRoot } from "../lib/paths";

const answerLogSchema = z.object({
  timestamp: z.string(),
  tenantId: z.string(),
  question: z.string(),
  answer: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  topScore: z.number().nullable(),
  intentId: z.string().optional(),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string(),
  })),
  fallback: z.boolean(),
});

const feedbackLogSchema = z.object({
  timestamp: z.string(),
  tenantId: z.string(),
  question: z.string(),
  answer: z.string(),
  sentiment: z.enum(["up", "down"]),
  reason: z.string().optional(),
});

const usageLogSchema = z.object({
  timestamp: z.string(),
  tenantId: z.string(),
  provider: z.string(),
  model: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
});

type AnswerLog = z.infer<typeof answerLogSchema>;
type FeedbackLog = z.infer<typeof feedbackLogSchema>;
type UsageLog = z.infer<typeof usageLogSchema>;

async function main() {
  const args = process.argv.slice(2);
  const tenantFilter = getArg(args, "--tenant");
  const limit = Number(getArg(args, "--limit") || 10);

  const answers = loadJsonl("./data/answers", answerLogSchema)
    .filter((entry) => !tenantFilter || entry.tenantId === tenantFilter);
  const feedback = loadJsonl("./data/feedback", feedbackLogSchema)
    .filter((entry) => !tenantFilter || entry.tenantId === tenantFilter);
  const usage = loadJsonl("./data/usage", usageLogSchema)
    .filter((entry) => !tenantFilter || entry.tenantId === tenantFilter);

  console.log("Chat Ops Report");
  if (tenantFilter) {
    console.log(`Tenant: ${tenantFilter}`);
  }
  console.log("");

  printQuestionSection(
    "Most Common Fallback Questions",
    answers.filter((entry) => entry.fallback),
    limit
  );

  console.log("");

  printQuestionSection(
    "Most Common Low-Confidence Questions",
    answers.filter((entry) => entry.confidence === "low"),
    limit
  );

  console.log("");

  printIntentSection(
    "Most Common Routed Intents",
    answers,
    limit
  );

  console.log("");

  printReasonSection(
    "Most Common Thumbs-Down Reasons",
    feedback.filter((entry) => entry.sentiment === "down"),
    limit
  );

  console.log("");

  printUsageSection("Token Usage by Tenant / Model", usage);
}

function loadJsonl<T>(
  relativeDir: string,
  schema: z.ZodType<T>
): T[] {
  const dir = resolveFromServerRoot(relativeDir);
  if (!existsSync(dir)) return [];

  const entries: T[] = [];

  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".jsonl")) continue;

    const content = readFileSync(resolve(dir, file), "utf8");
    const lines = content.split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        entries.push(schema.parse(JSON.parse(line)));
      } catch {
        // Skip malformed lines; logs must not break reporting.
      }
    }
  }

  return entries;
}

function printQuestionSection(
  title: string,
  entries: AnswerLog[],
  limit: number
) {
  console.log(title);

  const counts = new Map<string, { tenantId: string; question: string; count: number }>();

  for (const entry of entries) {
    const normalized = normalize(entry.question);
    const key = `${entry.tenantId}::${normalized}`;
    const current = counts.get(key);

    if (current) {
      current.count++;
    } else {
      counts.set(key, {
        tenantId: entry.tenantId,
        question: entry.question.trim(),
        count: 1,
      });
    }
  }

  printRanked(
    [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit),
    (item) => `[${item.tenantId}] ${item.question} — ${item.count}`
  );
}

function printReasonSection(
  title: string,
  entries: FeedbackLog[],
  limit: number
) {
  console.log(title);

  const counts = new Map<string, { tenantId: string; reason: string; count: number }>();

  for (const entry of entries) {
    const reason = (entry.reason || "(no reason given)").trim();
    const key = `${entry.tenantId}::${reason.toLowerCase()}`;
    const current = counts.get(key);

    if (current) {
      current.count++;
    } else {
      counts.set(key, {
        tenantId: entry.tenantId,
        reason,
        count: 1,
      });
    }
  }

  printRanked(
    [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit),
    (item) => `[${item.tenantId}] ${item.reason} — ${item.count}`
  );
}

function printIntentSection(
  title: string,
  entries: AnswerLog[],
  limit: number
) {
  console.log(title);

  const counts = new Map<string, { tenantId: string; intentId: string; count: number }>();

  for (const entry of entries) {
    if (!entry.intentId) continue;

    const key = `${entry.tenantId}::${entry.intentId}`;
    const current = counts.get(key);

    if (current) {
      current.count++;
    } else {
      counts.set(key, {
        tenantId: entry.tenantId,
        intentId: entry.intentId,
        count: 1,
      });
    }
  }

  printRanked(
    [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit),
    (item) => `[${item.tenantId}] ${item.intentId} — ${item.count}`
  );
}

function printUsageSection(title: string, entries: UsageLog[]) {
  console.log(title);

  if (entries.length === 0) {
    console.log("  (no data)");
    return;
  }

  const totals = new Map<string, {
    tenantId: string;
    provider: string;
    model: string;
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>();

  for (const entry of entries) {
    const key = `${entry.tenantId}::${entry.provider}::${entry.model}`;
    const current = totals.get(key);
    if (current) {
      current.requests++;
      current.promptTokens += entry.promptTokens;
      current.completionTokens += entry.completionTokens;
      current.totalTokens += entry.totalTokens;
    } else {
      totals.set(key, {
        tenantId: entry.tenantId,
        provider: entry.provider,
        model: entry.model,
        requests: 1,
        promptTokens: entry.promptTokens,
        completionTokens: entry.completionTokens,
        totalTokens: entry.totalTokens,
      });
    }
  }

  const ranked = [...totals.values()].sort((a, b) => b.totalTokens - a.totalTokens);

  ranked.forEach((row, index) => {
    console.log(
      `  ${index + 1}. [${row.tenantId}] ${row.provider}/${row.model} — `
        + `${row.requests} req, ${row.promptTokens} in + ${row.completionTokens} out = ${row.totalTokens} total`
    );
  });
}

function printRanked<T>(items: T[], render: (item: T) => string) {
  if (items.length === 0) {
    console.log("  (no data)");
    return;
  }

  items.forEach((item, index) => {
    console.log(`  ${index + 1}. ${render(item)}`);
  });
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : undefined;
}

main().catch((error) => {
  console.error("Chat ops report failed:", error);
  process.exit(1);
});
