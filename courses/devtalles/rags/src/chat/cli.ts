import * as readline from "node:readline/promises";
import { Conversation } from "./conversation.ts";
import { configLLM } from "../config.ts";
import { anthropicClient } from "../llm/anthropic/anthropic.ts";
import { DOCUMENTATION_ASSISTANT_PROMPT } from "../llm/prompts.ts";

export async function startCLI(): Promise<void> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	// al ser una concersación única. cada vez que se cree una instancia, será una
	// nueva conversación
	const conversation = new Conversation(configLLM, anthropicClient, {
		systemPrompt: DOCUMENTATION_ASSISTANT_PROMPT,
	});

	console.log("💬 Escribe tu pregunta y presiona Enter.");
	console.log("   Comandos: /clear, /stats, /exit");

	const promptUser = async (): Promise<void> => {
		const userInput = (await rl.question("Tu: ")).trim();

		if (!userInput) {
			promptUser();
			return;
		}

		if (userInput === "/stats") {
			const stats = conversation.getStats();
			console.log(
				`stats: \n` +
					`input tokens: ${stats.inputTokens}\n` +
					`output tokens: ${stats.outputTokens}\n` +
					`total turns: ${stats.turns}\n`,
			);
			promptUser();
			return;
		}
		if (userInput === "/clear" || userInput === "/new") {
			conversation.softReset();

			// el usuario vuelve al bucle de la conversación, con esta ya limpia y solo
			// sale de ella si hace el /exit que es el que cierra la conversación
			promptUser();
			return;
		}
		if (userInput === "/exit") {
			const stats = conversation.getStats();
			console.log(
				`stats: \n` +
					`input tokens: ${stats.inputTokens}\n` +
					`output tokens: ${stats.outputTokens}\n` +
					`total turns: ${stats.turns}\n`,
			);

			console.log("reset successfuly");
			conversation.hardReset(); // como cierro la conversación, limpio todo
			rl.close(); // esto cierra la conversación
			return;
		}

		// al ser peticiones, necesito hacer un trycatch
		try {
			// 1º: enviamos lo que ha mandado el user
			conversation.addUserMessage(userInput);

			// 2º: mandamos la respuesta de claude
			process.stdout.write("\n Claude: ");

			// construimos el historial de claude
			const record = conversation.getHistory();

			// lógica del stream
			let fullMessage: string = ""; // mensaje completo

			const stream = anthropicClient.messages.stream({
				// stream de los mensajes para nosotros verlo de mejor manera
				model: configLLM.model,
				max_tokens: 1024,
				system: DOCUMENTATION_ASSISTANT_PROMPT,
				messages: record,
			});

			// después del stream, mostramos el mensaje final
			stream.on("text", (chunk) => {
				process.stdout.write(chunk);
				fullMessage += chunk; // añadir chunk al fullMesg
			});

			// 3º:  mostrar el mensaje final
			const finalMessage = await stream.finalMessage();

			// añadimos el usage del finalMessage
			conversation.addUsage(
				finalMessage.usage.input_tokens,
				finalMessage.usage.output_tokens,
			);

			process.stdout.write("\n");

			// guardamos la respuesta para el sigyuiente turno y así tenga esa memoria
			conversation.addAssistantMessage(fullMessage);

			// con el finalMessage, puedes ver los tokens en general que ha consumido
		} catch (error) {
			const err = error as Error; // hago el as Error para poder acceder a la propiedad message
			console.log(`Error: ${err.message}`);
		}
		promptUser(); // esto se hace para que oslo se cierre si el user hace /exit
	};
	promptUser(); // esto se hace para que oslo se cierre si el user hace /exit
}
