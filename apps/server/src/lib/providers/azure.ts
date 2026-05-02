import { createAzure } from "@ai-sdk/azure";
import type { LanguageModelV1 } from "ai";
import type { ProviderDefinition } from "./types";

function azure() {
  return createAzure({
    resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
  });
}

export const azureOpenaiProvider: ProviderDefinition = {
  id: "azure-openai",
  chat: (modelId) => {
    const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || modelId;
    return azure()(deployment) as unknown as LanguageModelV1;
  },
  embedding: () => {
    const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small";
    return azure().textEmbeddingModel(deployment) as any;
  },
  embeddingDimensions: 1536,
  defaultChatModel: "gpt-4o",
};
