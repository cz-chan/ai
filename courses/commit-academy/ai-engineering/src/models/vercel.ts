import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, type FinishReason, type LanguageModelUsage } from "ai";
import { envs } from "../config/envs.ts";
import type { ProvidersParams } from "../types/providers-params.types.ts";

// vercel docs: https://vercel.com/docs/ai-sdk
const commit = createOpenAICompatible({
	name: "commit",
	baseURL: envs.PRACTICE_API_URL_OPENAI,
	apiKey: envs.PRACTICE_API_KEY,
});

type VercelResult = {
	text: string;
	finishReason: FinishReason;
	usage: LanguageModelUsage;
};

export async function useVercel(
	params: ProvidersParams,
): Promise<VercelResult> {
	const { model, prompt, maxTokens, systemPrompt } = params;

	const { text, finishReason, usage } = await generateText({
		model: commit(model),
		prompt: prompt,
		maxOutputTokens: maxTokens,
		instructions: systemPrompt,
	});

	return { text, finishReason, usage };

	/*
		!comento todo para hacer la función reutilizable

		const customMessage =
			text.trim() === ""
				? `Respuesta sin texto (stop_reason: ${finishReason})` +
					`\n[tokens] entrada=${usage.inputTokens} | salida=[${usage.outputTokens}]`
				: `\n[fin] ${finishReason}` +
					`\n[tokens] entrada=${usage.inputTokens} | salida=[${usage.outputTokens}]` +
					`\n[content] ${text}`;
	
		return customMessage;

	*/
}

// console.log(
// 	await useVercel({
// 		model: "fast",
// 		prompt: "Resume en una frase qué es un agente.",
// 	}),
// );
