import z from "zod";
import { llmModelNames } from "./ai-model-names.types";

const providersParams = z.object({
	model: llmModelNames,
	prompt: z.string("the prompt is required"),
	maxTokens: z.number().min(40).max(1024),
	systemPrompt: z.string().optional(),
});

export type ProvidersParams = z.infer<typeof providersParams>;
