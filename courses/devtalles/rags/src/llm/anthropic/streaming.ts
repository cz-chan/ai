import { configLLM } from "../../config.ts";
import { anthropicClient } from "./anthropic.ts";

export async function streamingClaude(
	prompt: string,
	systemPrompt?: string,
): Promise<string> {
	// variable donde se guarda el streaming del texto
	let fullResponse: string = "";

	const responseStream = anthropicClient.messages.stream({
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

	responseStream.on("text", (chunk) => {
		process.stdout.write(chunk);
		fullResponse += chunk;
	});

	await responseStream.finalMessage();
	process.stdout.write("\n");

	return fullResponse;
}

export async function streamClaudeWithCallback(
	prompt: string,
	onChunk: (textChunk: string) => void,
	systemPrompt?: string,
): Promise<string> {
	let fullResponse = "";

	const responseStream = anthropicClient.messages.stream({
		model: configLLM.model,
		max_tokens: 1024,
		...(systemPrompt && { system: systemPrompt }),
		messages: [{ role: "user", content: prompt }],
	});

	responseStream.on("text", (textChunk) => {
		onChunk(textChunk);
		fullResponse += textChunk;
	});

	await responseStream.finalMessage();
	return fullResponse;
}
