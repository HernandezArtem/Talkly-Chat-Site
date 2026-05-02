import { openai } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "ai";
import type { ProviderDefinition } from "./types";

export const openaiProvider: ProviderDefinition = {
  id: "openai",
  chat: (modelId) => openai(modelId) as LanguageModelV1,
  embedding: () => openai.textEmbeddingModel("text-embedding-3-small") as any,
  embeddingDimensions: 1536,
  defaultChatModel: "gpt-4o",
};
