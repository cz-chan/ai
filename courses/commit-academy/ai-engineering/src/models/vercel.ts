import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { envs } from "../config/envs.ts";
import type { ProvidersParams } from "../types/providers-params.types.ts";

// vercel docs: https://vercel.com/docs/ai-sdk

const commit = createOpenAICompatible({
	name: "commit",
	baseURL: envs.PRACTICE_API_URL_OPENAI,
	apiKey: envs.PRACTICE_API_KEY,
});

export async function useVercel(params: ProvidersParams): Promise<string> {
	const { model, prompt, maxTokens, systemPrompt } = params;

	const { text } = await generateText({
		model: commit(model),
		prompt: prompt,
		maxOutputTokens: maxTokens,
		instructions: systemPrompt,
	});

	return text;
}

// console.log(
// 	await useVercel({
// 		model: "fast",
// 		prompt: "Resume en una frase qué es un agente.",
// 	}),
// );
