import z from "zod";
import { llmModelNames } from "./ai-model-names.types";

const providersParams = z.object({
	model: llmModelNames,
	prompt: z.string("the prompt is required"),
	maxTokens: z.number().min(10).max(1024),
	systemPrompt: z.string().optional(),
});

export type ProvidersParams = z.infer<typeof providersParams>;

// cambio de literal a enum para permitir el acceso restricgido o no, a proveedores con .extract o .exclude
export const providers = z.enum(["openai", "anthropic", "vercel"]);
export type Providers = z.infer<typeof providers>;
