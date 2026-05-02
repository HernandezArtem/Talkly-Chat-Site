import { z } from "zod";

export const tenantEscalationSchema = z.object({
  phone: z.string().optional(),
  phoneHours: z.string().optional(),
  url: z.string().url().optional(),
  email: z.string().email().optional(),
});
export type TenantEscalation = z.infer<typeof tenantEscalationSchema>;

export const tenantWidgetDefaultsSchema = z.object({
  theme: z.object({
    primaryColor: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    avatarUrl: z.string().optional(),
  }).optional(),
  bubbleMessage: z.string().optional(),
  bubbleDelay: z.number().int().positive().optional(),
  welcomeMessage: z.string().optional(),
  starterQuestions: z.array(z.string()).optional(),
  escalation: tenantEscalationSchema.optional(),
});
export type TenantWidgetDefaults = z.infer<typeof tenantWidgetDefaultsSchema>;

export const tenantBootstrapSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1),
  widget: tenantWidgetDefaultsSchema,
});
export type TenantBootstrap = z.infer<typeof tenantBootstrapSchema>;

export interface TenantWidgetSource {
  widget?: TenantWidgetDefaults;
  escalation?: TenantEscalation;
  welcomeMessage?: string;
  starterQuestions?: string[];
}

export function buildTenantWidgetDefaults(tenant: TenantWidgetSource): TenantWidgetDefaults {
  return {
    theme: tenant.widget?.theme,
    bubbleMessage: tenant.widget?.bubbleMessage,
    bubbleDelay: tenant.widget?.bubbleDelay,
    welcomeMessage: tenant.widget?.welcomeMessage ?? tenant.welcomeMessage,
    starterQuestions: tenant.widget?.starterQuestions ?? tenant.starterQuestions,
    escalation: tenant.widget?.escalation ?? tenant.escalation,
  };
}
