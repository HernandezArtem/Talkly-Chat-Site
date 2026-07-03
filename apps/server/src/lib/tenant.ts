import {
  buildTenantWidgetDefaults,
  type TenantBootstrap,
  type TenantEscalation,
  type TenantWidgetDefaults,
} from "@talkly/shared";
import { logRuntimeEvent } from "./logging";
import type { PartialGuardrailsConfig } from "./guardrails";
import defaultInstanceConfig from "../instance/default/talkly.config";
import {
  instanceConfigSchema,
  type TalklyInstanceConfig,
  type InstanceTenantConfig,
} from "../instance/config";

export interface TenantConfig {
  name: string;
  dbPath: string;
  scrapeUrl: string;
  systemPrompt?: string;
  escalation?: TenantEscalation;
  welcomeMessage?: string;
  starterQuestions?: string[];
  widget?: TenantWidgetDefaults;
  allowedOrigins?: string[];
  guardrails?: PartialGuardrailsConfig;
}

export type TenantRegistry = Record<string, TenantConfig>;

let cachedInstanceConfig: TalklyInstanceConfig | null = null;
let cachedRegistry: TenantRegistry | null = null;

export function loadInstanceConfig(): TalklyInstanceConfig {
  if (cachedInstanceConfig) return cachedInstanceConfig;

  const parsed = instanceConfigSchema.safeParse(defaultInstanceConfig);
  if (!parsed.success) {
    throw new Error(`Invalid Talkly instance config: ${parsed.error.message}`);
  }

  cachedInstanceConfig = parsed.data;

  logRuntimeEvent("info", "instance_config_loaded", {
    defaultTenantId: cachedInstanceConfig.defaultTenantId ?? null,
    tenantCount: Object.keys(cachedInstanceConfig.tenants).length,
    tenants: Object.keys(cachedInstanceConfig.tenants),
  });

  return cachedInstanceConfig;
}

export function loadTenantRegistry(): TenantRegistry {
  if (cachedRegistry) return cachedRegistry;

  const instanceConfig = loadInstanceConfig();
  cachedRegistry = Object.fromEntries(
    Object.entries(instanceConfig.tenants).map(([tenantId, tenant]) => [tenantId, buildTenantConfig(tenant)])
  );

  logRuntimeEvent("info", "tenant_registry_loaded", {
    tenantCount: Object.keys(cachedRegistry).length,
    tenants: Object.keys(cachedRegistry),
  });

  return cachedRegistry;
}

export function getTenantConfig(tenantId: string): TenantConfig | null {
  const registry = loadTenantRegistry();
  return registry[tenantId] ?? null;
}

export function getAllTenants(): [string, TenantConfig][] {
  const registry = loadTenantRegistry();
  return Object.entries(registry);
}

export function getDefaultTenant(): [string, TenantConfig] | null {
  const instanceConfig = loadInstanceConfig();
  const registry = loadTenantRegistry();

  if (instanceConfig.defaultTenantId && registry[instanceConfig.defaultTenantId]) {
    return [instanceConfig.defaultTenantId, registry[instanceConfig.defaultTenantId]];
  }

  if (registry.default) {
    return ["default", registry.default];
  }

  const firstEntry = Object.entries(registry)[0];
  return firstEntry ?? null;
}

export function buildTenantBootstrap(tenantId: string, tenant: TenantConfig): TenantBootstrap {
  return {
    tenantId,
    name: tenant.name,
    widget: buildTenantWidgetDefaults(tenant),
  };
}

export function getAllAllowedOrigins(): string[] {
  const registry = loadTenantRegistry();
  const origins = new Set<string>();
  for (const tenant of Object.values(registry)) {
    for (const origin of tenant.allowedOrigins ?? []) {
      origins.add(origin);
    }
  }
  return [...origins];
}

function buildTenantConfig(tenant: InstanceTenantConfig): TenantConfig {
  return {
    name: tenant.name,
    dbPath: tenant.dbPath,
    scrapeUrl: tenant.scrapeUrl,
    systemPrompt: tenant.systemPrompt,
    escalation: tenant.escalation,
    welcomeMessage: tenant.widget?.welcomeMessage,
    starterQuestions: tenant.widget?.starterQuestions,
    widget: tenant.widget,
    allowedOrigins: tenant.allowedOrigins,
    guardrails: tenant.guardrails,
  };
}

export type { TenantBootstrap, TalklyInstanceConfig, InstanceTenantConfig };
