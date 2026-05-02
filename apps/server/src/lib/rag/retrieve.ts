import { embed } from "ai";
import type { DetectedChatIntent } from "../intents";
import { getEmbeddingModel } from "../providers";
import { searchSimilar, getDocumentCount } from "./vectorstore";
import {
  classifyConfidence,
  dedupeSources,
  expandAbbreviations,
  scoreResult,
} from "./scoring";

// ── LRU Embedding Cache ──

class EmbeddingCache {
  private cache = new Map<string, number[]>();
  constructor(private maxSize = 256) {}

  get(key: string): number[] | undefined {
    const value = this.cache.get(key);
    if (value === undefined) return undefined;
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: string, value: number[]): void {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > this.maxSize) {
      // Delete oldest entry (first key)
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
  }
}

// Shared across tenants (all currently use the same embedding model)
const embeddingCache = new EmbeddingCache(256);

// ── Types ──

export interface RetrievedSource {
  title: string;
  url: string;
}

export interface RetrieveContextResult {
  context: string;
  sources: RetrievedSource[];
  confidence: "low" | "medium" | "high";
  topScore: number | null;
}

export interface RetrieveContextOptions {
  intent?: DetectedChatIntent | null;
}

export async function retrieveContext(
  query: string,
  topK = 5,
  dbPath?: string,
  options: RetrieveContextOptions = {}
): Promise<RetrieveContextResult> {
  // Skip RAG if no documents are ingested
  if (getDocumentCount(dbPath) === 0) {
    return { context: "", sources: [], confidence: "low", topScore: null };
  }

  const expandedQuery = expandAbbreviations(query);
  const cacheKey = expandedQuery.trim().toLowerCase();

  let embedding = embeddingCache.get(cacheKey);
  if (!embedding) {
    const result = await embed({
      model: getEmbeddingModel() as any,
      value: expandedQuery,
    });
    embedding = result.embedding;
    embeddingCache.set(cacheKey, embedding);
  }

  const results = searchSimilar(embedding, Math.max(topK * 4, 12), dbPath);

  if (results.length === 0) {
    return { context: "", sources: [], confidence: "low", topScore: null };
  }

  const ranked = results
    .map((r) => {
      const meta = JSON.parse(r.metadata || "{}") as { source?: string; title?: string };
      return {
        ...r,
        meta,
        score: scoreResult(expandedQuery, r.content, meta.source, meta.title, r.distance, options.intent),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const sources = dedupeSources(
    ranked
      .map((r) => ({
        title: r.meta.title || r.meta.source || "Bron",
        url: r.meta.source,
      }))
      .filter((source): source is RetrievedSource => Boolean(source.url))
  );

  return {
    context: ranked
      .map((r) => {
        const source = r.meta.source ? `\nSource URL: ${r.meta.source}` : "";
        return `${r.content}${source}`;
      })
      .join("\n\n---\n\n"),
    sources,
    confidence: classifyConfidence(ranked[0]?.score ?? null, sources),
    topScore: ranked[0]?.score ?? null,
  };
}
