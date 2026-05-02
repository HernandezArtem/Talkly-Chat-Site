import type { EmbeddingModel, LanguageModelV1 } from "ai";

export interface ProviderDefinition {
  id: string;
  chat: (modelId: string) => LanguageModelV1;
  embedding: () => EmbeddingModel<string>;
  embeddingDimensions: number;
  defaultChatModel: string;
}

export type ProviderRegistry = Record<string, ProviderDefinition>;
