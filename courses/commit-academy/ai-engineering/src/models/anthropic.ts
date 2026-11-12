import Anthropic from "@anthropic-ai/sdk";
import { envs } from "../config/envs.ts";
import type { ProvidersParams } from "../types/providers-params.types.ts";

const client = new Anthropic({
	baseURL: envs.PRACTICE_API_URL_ANTHROPIC,
	apiKey: envs.PRACTICE_API_KEY,
});

// anthropic docs: https://platform.claude.com/docs/en/api/http/beta/messages/create
export async function useAnthropic(params: ProvidersParams): Promise<string> {
	const { model, prompt, maxTokens, systemPrompt } = params;
	/*
		es mejor no usar un trycatch aquí porque así dejas que el error suba
		y lo manejas en la capa que llama (UI/handler). Es lo más limpio en un helper de bajo nivel
	*/
	const response = await client.messages.create({
		model: model,
		max_tokens: maxTokens ?? 400,
		messages: [{ role: "user", content: prompt }],
		...(systemPrompt && { system: systemPrompt }),
	});

	/*
		claude responde con un tipo de objeto: Anthropic.Messages.Message que 
		tiene como elementos interesantes para nuestro uso:
			- model
			- usage
			- stop_reason
			- stop_details
			- content -> aquí es donde viene la respuesta de claude en tipo text:
				[{ "type": "text", "text": "Hi, I'm Claude." }] 

		la API no guarda estado: cada llamada devuelve solo el siguiente turno de claude.
		para mantener una conversación hay que guardar el historial en el array `messages`
		(añadiendo response.content como role "assistant") y reenviarlo entero en cada llamada.

		filtramos los bloques type === "text" (TS los estrecha a TextBlock[]), sacamos .text
		y los unimos con "" porque son partes seguidas de la misma respuesta.
		si no hay texto (tool_use, refusal, max_tokens...) lanzamos error con el stop_reason.
	*/
	const message = response.content
		.filter((msg) => msg.type === "text")
		.map((content) => content.text)
		.join(", ");

	if (!message) {
		throw new Error(
			`Respuesta sin texto (stop_reason: ${response.stop_reason})`,
		);
	}

	return message;
}

// console.log(
// 	await useAnthropic({
// 		model: "fast",
// 		prompt: "say hi",
// 	}),
// );
