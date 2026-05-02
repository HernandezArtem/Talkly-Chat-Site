import { z } from "zod";
import {
  tenantEscalationSchema,
  tenantWidgetDefaultsSchema,
} from "@chattr/shared";
import {
  partialGuardrailsConfigSchema,
  type PartialGuardrailsConfig,
} from "../lib/guardrails/types";

export const instanceTenantSchema = z.object({
  name: z.string().min(1),
  dbPath: z.string().min(1),
  scrapeUrl: z.string().url(),
  systemPrompt: z.string().optional(),
  escalation: tenantEscalationSchema.optional(),
  widget: tenantWidgetDefaultsSchema.optional(),
  allowedOrigins: z.array(z.string().min(1)).optional(),
  guardrails: partialGuardrailsConfigSchema.optional(),
});
export type InstanceTenantConfig = z.infer<typeof instanceTenantSchema>;

export const instanceConfigSchema = z.object({
  defaultTenantId: z.string().min(1).optional(),
  tenants: z.record(z.string().min(1), instanceTenantSchema),
}).superRefine((config, ctx) => {
  const tenantIds = Object.keys(config.tenants);

  if (tenantIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one tenant must be configured.",
      path: ["tenants"],
    });
  }

  if (config.defaultTenantId && !config.tenants[config.defaultTenantId]) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unknown default tenant: ${config.defaultTenantId}`,
      path: ["defaultTenantId"],
    });
  }
});
export type ChattrInstanceConfig = z.infer<typeof instanceConfigSchema>;

export function defineInstanceConfig(config: ChattrInstanceConfig): ChattrInstanceConfig {
  return config;
}

export type { PartialGuardrailsConfig };
