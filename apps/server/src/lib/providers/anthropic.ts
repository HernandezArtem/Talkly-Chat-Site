import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "ai";
import type { ProviderDefinition } from "./types";

export const anthropicProvider: ProviderDefinition = {
  id: "anthropic",
  chat: (modelId) => anthropic(modelId) as LanguageModelV1,
  // Anthropic does not yet ship an embedding model in @ai-sdk/anthropic.
  // Fall back to OpenAI embeddings, which requires OPENAI_API_KEY alongside.
  embedding: () => openai.textEmbeddingModel("text-embedding-3-small") as any,
  embeddingDimensions: 1536,
  defaultChatModel: "claude-3-5-sonnet-latest",
};
