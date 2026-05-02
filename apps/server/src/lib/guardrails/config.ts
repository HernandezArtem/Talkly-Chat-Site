import {
  guardrailsConfigSchema,
  type GuardrailsConfig,
  type PartialGuardrailsConfig,
} from "./types";

const DEFAULT_CONFIG: GuardrailsConfig = {
  identity: {
    role: "helpful assistant",
    personality: "friendly and concise",
  },
  rules: {},
  inputGuardrails: {
    maxMessageLength: 4000,
    maxConversationLength: 50,
    promptInjectionDetection: true,
    llmJudge: false,
    rateLimitCount: 20,
    rateLimitWindowSeconds: 60,
  },
  outputGuardrails: {
    maxResponseTokens: 2048,
    systemPromptLeakDetection: true,
    contentFiltering: true,
  },
};

export function loadGuardrailsConfig(config?: PartialGuardrailsConfig): GuardrailsConfig {
  return guardrailsConfigSchema.parse(
    deepMerge(DEFAULT_CONFIG, config ?? {})
  );
}

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal && typeof sourceVal === "object" && !Array.isArray(sourceVal)
      && targetVal && typeof targetVal === "object" && !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal, sourceVal);
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal;
    }
  }

  return result;
}
