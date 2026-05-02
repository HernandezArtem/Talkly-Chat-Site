import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "ai";
import type { ProviderDefinition } from "./types";

// Ollama exposes an OpenAI-compatible API at /v1. This works the same way
// for any OpenAI-compatible local server (LM Studio, llama.cpp, vLLM, etc.)
// just by pointing OLLAMA_BASE_URL at it.

function ollama() {
  return createOpenAI({
    baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
    apiKey: process.env.OLLAMA_API_KEY || "ollama",
  });
}

const DEFAULT_EMBEDDING_MODEL = "nomic-embed-text";
const DEFAULT_EMBEDDING_DIMENSIONS = 768;

export const ollamaProvider: ProviderDefinition = {
  id: "ollama",
  chat: (modelId) => ollama()(modelId) as LanguageModelV1,
  embedding: () => {
    const model = process.env.OLLAMA_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
    return ollama().textEmbeddingModel(model) as any;
  },
  embeddingDimensions: Number(process.env.OLLAMA_EMBEDDING_DIMENSIONS) || DEFAULT_EMBEDDING_DIMENSIONS,
  defaultChatModel: "llama3.2",
};
