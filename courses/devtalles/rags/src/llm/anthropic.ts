import Anthropic from "@anthropic-ai/sdk";
import { configLLM } from "../config.ts";

// recuerda que para cambiar el modelo, necesitas hacerlo desde la variable maestra config
// y desde ella ya todo lo demás estará conectado
export const anthropicClient = new Anthropic({ apiKey: configLLM.apiKey });

export async function askClaude(
	prompt: string,
	systemPrompt?: string,
): Promise<string> {
	const response = await anthropicClient.messages.create({
		model: configLLM.model,
		max_tokens: 1024, // por culpa de esto pueden haber respuestas que se corten
		messages: [
			{
				role: "user",
				content: prompt,
			},
		],
		// si viene el systemPromopt lo devuelves
		...(systemPrompt && { system: systemPrompt }),
	});

	// lo que buscamos en este punto, por ahora, es devolver el texto (la respuesta que nos da claude)
	const textBlock = response.content.find((block) => block.type === "text");
	if (!textBlock || textBlock.type !== "text") {
		throw new Error("Claude could not return a text in response");
	}

	return textBlock.text;
}
