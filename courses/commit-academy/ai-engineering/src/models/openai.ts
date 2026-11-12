import OpenAI from "openai";
import { envs } from "../config/envs.ts";
import type { ProvidersParams } from "../types/providers-params.types.ts";

const client = new OpenAI({
	baseURL: envs.PRACTICE_API_URL_OPENAI,
	apiKey: envs.PRACTICE_API_KEY,
});

// openai docs: https://developers.openai.com/api/docs
export async function useOpenai(
	params: ProvidersParams,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
	const { model, prompt, maxTokens } = params;

	const response = await client.chat.completions.create({
		model: model,
		max_completion_tokens: maxTokens,
		messages: [{ role: "user", content: prompt }],
	});

	return response;
	/*
		el formato de openai es algo como:
			{
				"id": "chatcmpl-C9EDpkjH60VPPIB86j2zIhiR8kWiC",
				"object": "chat.completion",
				"created": 1756315657,
				"model": "gpt-5.5",
				"choices": [
					{
						"index": 0,
						"message": {
							"role": "assistant",
							"content": "Under a blanket of starlight, a sleepy unicorn tiptoed through moonlit meadows, gathering dreams like dew to tuck beneath its silver mane until morning.",
							"refusal": null,
							"annotations": []
						},
						"finish_reason": "stop"
					}
				],
				...
			}
		por eso se necesita poner en choises el primer elemento del array, proque es un array de un elemento
	*/

	/*
		!he comentado todo esto para hacer la función reutilizable y hacer toda la lógica de los mensajes
		!en las funciones labs**

		const message = response.choices[0].message.content;
		const stopReason = response.choices[0].finish_reason;
	
		if (message === null) {
			throw new Error(`Respuesta sin texto (stop_reason: ${stopReason})`);
		}
	
		const customMessage =
			message === undefined
				? `Respuesta sin texto (stop_reason: ${stopReason})` +
					`\n[tokens] entrada=${response.usage?.prompt_tokens} | salida=[${response.usage?.completion_tokens}]`
				: `\n[fin] ${stopReason}` +
					`\n[tokens] entrada=${response.usage?.prompt_tokens} | salida=[${response.usage?.completion_tokens}]` +
					`\n[content] ${message}`;
	
		return customMessage;

	*/
}

// console.log(
// 	await useOpenai({
// 		model: "fast",
// 		prompt:
// 			'por qué en la respuesta de la api de openai viene el "choises" como un array si solo trae un elemento? no sería mejor un único objeto?',
// 	}),
// );
