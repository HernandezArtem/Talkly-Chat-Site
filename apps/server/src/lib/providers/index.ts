import type { EmbeddingModel, LanguageModelV1 } from "ai";
import { getEnv } from "../env";
import { anthropicProvider } from "./anthropic";
import { azureOpenaiProvider } from "./azure";
import { ollamaProvider } from "./ollama";
import { openaiProvider } from "./openai";
import type { ProviderDefinition, ProviderRegistry } from "./types";

const builtInProviders: ProviderDefinition[] = [
  openaiProvider,
  anthropicProvider,
  azureOpenaiProvider,
  ollamaProvider,
];

const registry: ProviderRegistry = Object.fromEntries(
  builtInProviders.map((provider) => [provider.id, provider])
);

export function registerProvider(provider: ProviderDefinition): void {
  registry[provider.id] = provider;
}

export function listProviders(): string[] {
  return Object.keys(registry);
}

export function getProvider(id?: string): ProviderDefinition {
  const providerId = id || getEnv("TALKLY_PROVIDER") || "openai";
  const provider = registry[providerId];
  if (!provider) {
    throw new Error(
      `[Talkly] Unknown provider: ${providerId}. Available: ${listProviders().join(", ")}`
    );
  }
  return provider;
}

export function getModel(): LanguageModelV1 {
  const provider = getProvider();
  const modelId = getEnv("TALKLY_MODEL") || provider.defaultChatModel;
  return provider.chat(modelId);
}

export function getEmbeddingModel(): EmbeddingModel<string> {
  return getProvider().embedding();
}

export function getEmbeddingDimensions(): number {
  return getProvider().embeddingDimensions;
}

export type { ProviderDefinition, ProviderRegistry } from "./types";
