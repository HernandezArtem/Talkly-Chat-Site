import { embedMany } from "ai";
import { getEmbeddingModel } from "../providers";
import { insertDocument } from "./vectorstore";

interface DocumentInput {
  content: string;
  metadata?: Record<string, string>;
}

interface Chunk {
  content: string;
  metadata: Record<string, string>;
}

const CHUNK_SIZE = 2000; // ~500 tokens
const CHUNK_OVERLAP = 200;
const MAX_SECTION_SIZE = 3000;
const EMBED_BATCH_SIZE = 32;

const HEADING_RE = /^(#{1,3})\s+(.+)$/;

export function chunkText(
  text: string,
  metadata: Record<string, string> = {}
): Chunk[] {
  // Use heading-based chunking if the content has markdown headings
  if (/^#{1,3}\s/m.test(text)) {
    return chunkByHeadings(text, metadata);
  }
  return chunkByParagraphs(text, metadata);
}

function chunkByHeadings(
  text: string,
  metadata: Record<string, string>
): Chunk[] {
  const lines = text.split("\n");
  const sections: { heading: string; breadcrumb: string; content: string }[] = [];
  const headingStack: { level: number; text: string }[] = [];
  let currentContent = "";
  let currentHeading = "";

  function buildBreadcrumb(): string {
    return headingStack.map((h) => `${"#".repeat(h.level)} ${h.text}`).join("\n");
  }

  function flushSection() {
    const trimmed = currentContent.trim();
    if (!trimmed) return;
    sections.push({
      heading: currentHeading,
      breadcrumb: buildBreadcrumb(),
      content: trimmed,
    });
  }

  for (const line of lines) {
    const match = line.match(HEADING_RE);
    if (match) {
      flushSection();
      const level = match[1].length;
      const headingText = match[2].trim();

      // Pop headings at same or deeper level
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      headingStack.push({ level, text: headingText });

      currentHeading = headingText;
      currentContent = line + "\n";
    } else {
      currentContent += line + "\n";
    }
  }
  flushSection();

  // Convert sections to chunks, splitting oversized sections
  const chunks: Chunk[] = [];
  for (const section of sections) {
    const sectionMeta = { ...metadata, ...(section.heading ? { section: section.heading } : {}) };

    if (section.content.length <= MAX_SECTION_SIZE) {
      chunks.push({ content: section.content, metadata: sectionMeta });
    } else {
      // Oversized section: fall back to paragraph splitting with breadcrumb prefix
      const subChunks = chunkByParagraphs(section.content, sectionMeta);
      for (let i = 0; i < subChunks.length; i++) {
        // Prepend breadcrumb to sub-chunks after the first (first already has the heading)
        if (i > 0 && section.breadcrumb) {
          subChunks[i].content = section.breadcrumb + "\n\n" + subChunks[i].content;
        }
        chunks.push(subChunks[i]);
      }
    }
  }

  if (chunks.length === 0 && text.trim()) {
    chunks.push({ content: text.trim(), metadata });
  }

  return chunks;
}

function chunkByParagraphs(
  text: string,
  metadata: Record<string, string>
): Chunk[] {
  const chunks: Chunk[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 2 > CHUNK_SIZE && currentChunk) {
      chunks.push({ content: currentChunk.trim(), metadata });

      // Overlap: keep last portion
      const overlapStart = Math.max(0, currentChunk.length - CHUNK_OVERLAP);
      currentChunk = currentChunk.slice(overlapStart) + "\n\n" + trimmed;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({ content: currentChunk.trim(), metadata });
  }

  if (chunks.length === 0 && text.trim()) {
    chunks.push({ content: text.trim(), metadata });
  }

  return chunks;
}

export async function ingestDocuments(
  docs: DocumentInput[],
  dbPath?: string
): Promise<{ chunksIngested: number }> {
  const allChunks = docs.flatMap((doc) =>
    chunkText(doc.content, doc.metadata || {})
  );

  if (allChunks.length === 0) {
    return { chunksIngested: 0 };
  }

  let insertedCount = 0;

  for (let start = 0; start < allChunks.length; start += EMBED_BATCH_SIZE) {
    const batch = allChunks.slice(start, start + EMBED_BATCH_SIZE);

    const { embeddings } = await embedMany({
      model: getEmbeddingModel() as any,
      values: batch.map((chunk) => chunk.content),
    });

    if (embeddings.length !== batch.length) {
      throw new Error(
        `[Talkly] Embedding batch mismatch: got ${embeddings.length} embeddings for ${batch.length} chunks`
      );
    }

    for (let i = 0; i < batch.length; i++) {
      insertDocument(batch[i].content, embeddings[i], batch[i].metadata, dbPath);
      insertedCount++;
    }
  }

  return { chunksIngested: insertedCount };
}
