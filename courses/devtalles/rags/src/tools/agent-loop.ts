// https://link.excalidraw.com/readonly/cX6T0eUzrNQwu7cwsujQ?darkMode=true

import Anthropic from "@anthropic-ai/sdk";
import type { ToolDefinition } from "../types/tool-use.types.ts";
import { TOOL_DEFINITIONS } from "./definitions.ts";
import { anthropicClient } from "../llm/anthropic/anthropic.ts";
import { configLLM } from "../config.ts";
import { executeTool } from "./executor.ts";

const MAX_ITERATIONS = 10;

export async function runWithTools(
	prompt: string,
	systemPrompt: string,
	tools: ToolDefinition[],
): Promise<string> {
	// historial de mensajes de manera local
	const messages: Anthropic.Messages.MessageParam[] = [
		{
			role: "user",
			content: prompt,
		},
	];

	const sdkTool = (tools ?? TOOL_DEFINITIONS) as Anthropic.Messages.Tool[];

	//! ojo. por cada una de las iteraciones es una llamada a claude
	for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
		console.log(`\n Thinking... Iteration nº${iteration}`);

		// llamada a claude
		const response = anthropicClient.messages.create({
			model: configLLM.model,
			max_tokens: 4096,
			tools: sdkTool,
			messages,
			// en caso de que venga el system, se le pasa
			...(systemPrompt && { system: systemPrompt }),
		});

		/*
      1º caso: cuando claude considera que ya tiene suficiente info para cumplir
      la tarea y retorna la respuesta
    */
		if ((await response).stop_reason === "end_turn") {
			const finalText = (await response).content
				.filter(
					// haces el tipado del block para decirle que es un tipo text y que
					// solo sea eso lo que debe enviar
					(block): block is Anthropic.Messages.TextBlock =>
						block.type === "text",
				)
				.map((block) => block.text)
				.join("\n");

			console.log(`Final response generated`);
			return finalText;
		}

		/*
      caso 2: cuando claude quiere usar las tools
    */
		if ((await response).stop_reason === "tool_use") {
			messages.push({
				role: "assistant",
				content: (await response).content,
			});

			// ahora buscamos SOLO aquellos bloques qeu son de tool_use
			const toolUseBlocks = (await response).content.filter(
				(block): block is Anthropic.Messages.ToolUseBlock =>
					block.type === "tool_use",
			);

			// como claude puede pedir mas de una tool en una única respuesta,
			// necesitan estar en paralelo
			const results = await Promise.all(
				toolUseBlocks.map(async (block) => {
					console.log(
						`executing ${block.name} (${JSON.stringify(block.input)})`,
					);

					const toolOutput = await executeTool(
						block.name,
						block.input as Record<string, unknown>,
					);
					return toolOutput;
				}),
			);

			const toolResultContent: Anthropic.Messages.ToolResultBlockParam[] =
				toolUseBlocks.map((block, index) => ({
					type: "tool_result" as const,
					tool_use_id: block.id,
					content: results[index] ?? "Error: empty result",
				}));
			messages.push({
				role: "user",
				content: toolResultContent,
			});

			// continue porque puede que claude pueda necesitar más tools
			continue;
		}

		// caso 3: razón desconocida
		console.warn(
			`Unspected stop reason: ${(await response).stop_reason ?? "unknown"}`,
		);
	}
}
