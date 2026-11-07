import * as readline from "node:readline/promises";
import { Conversation } from "./conversation.ts";
import { configLLM } from "../config.ts";
import { anthropicClient } from "../llm/anthropic/anthropic.ts";
import { DOCUMENTATION_ASSISTANT_PROMPT } from "../llm/prompts.ts";
import { TOOL_DEFINITIONS } from "../tools/definitions.ts";
// import { runWithTools } from "../tools/agent-loop.ts";
import { processDirectory } from "../rag/chunker.ts";
import { generateEmbeddings } from "../rag/embeddings.ts";
import { VectorStore } from "../rag/vector-store.ts";
import { resetStore, retrieveContext } from "../rag/retriever.ts";
import { askWithRAG } from "../rag/rag-chain.ts";

// función para integrar RAG en el CLI para que claude use la doc
// además es útil par ano tener que hacer a propósito un pnpm ingest
// y con un pnpm dev sobra
async function ingestDocs(docsPath: string): Promise<void> {
	console.log(`\nstart ingestion: ${docsPath}`);

	const chunks = await processDirectory(docsPath);

	if (chunks.length === 0) {
		console.log("there are no .md files in the directory.");
		return;
	}

	console.log(`generating embeddings for ${chunks.length} chunks...`);
	const embeddings = await generateEmbeddings(chunks.map((c) => c.content));

	const store = new VectorStore(configLLM.dbPath);
	store.clear();

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		const embedding = embeddings[i];
		if (chunk && embedding) store.insert(chunk, embedding);
	}

	console.log(`${store.size} chunks saved in ${configLLM.dbPath}`);
	store.close();

	// Reiniciar el singleton
	resetStore();
	console.log("updated vector store — ready for search\n");
}

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
	console.log("💡 Tip: usa /ingest para cargar documentación");
	console.log("   Comandos: /ingest [path], /clear, /stats, /tools, /exit");

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

		if (userInput === "/tools") {
			console.log(`\nTools disponibles (${TOOL_DEFINITIONS.length}):`);
			for (const tool of TOOL_DEFINITIONS) {
				const params = Object.keys(tool.input_schema.properties).join(", ");
				console.log(`   • ${tool.name}(${params})`);
				console.log(`     ${tool.description.split(".")[0]}.`);
			}
			console.log("");
			promptUser();
			return;
		}

		/*
			este es startsWith y no un === porque puede enviar
			a parte del comando, un path desde donde quiere hacer el ingest
			si no es la manera por defecto por lo que permitimos que lo envie
			pero como le hemos dicho que Comandos: /ingest [path],
			el promer comando que tienen que llegar, antes de que nada pase 
			es /ingest
		*/
		if (userInput.startsWith("/ingest")) {
			// dividimos por el espacio ente /ingest [path-docs]
			const inputParts = userInput.split(" ");

			const docsDir = inputParts[1] ?? configLLM.docsPath;

			try {
				await ingestDocs(docsDir);
			} catch (error) {
				const err = error as Error;
				console.error(`error during ingestion: ${err.message}`);
			}

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

			// configuración de las tools en la conversación
			//! para solo tools era esta la fomra, para ingest, es la siguiente
			// const response = await runWithTools(
			// 	userInput,
			// 	DOCUMENTATION_ASSISTANT_PROMPT,
			// 	TOOL_DEFINITIONS,
			// );

			/*
				para hacer la respuesta a travñes de rag, lo primero es 
				después de haber convertido la doc a embeddings, saber si la 
				pregunta del usuario es relevante para usar esa doc, es dcir,
				convertir la pregunta/useInput a embedding.y compararlo

				(es lo mismo que hicimos en el rag.-chain)
			*/
			const chunks = await retrieveContext(userInput);
			if (chunks.length === 0) {
				const message =
					`there are not available documentation in vectore store for this questis` +
					'Please try first the command "/ingest"';

				console.log(message);
			}
			const response = await askWithRAG(userInput, (outputChunk) => {
				process.stdout.write(outputChunk);
			});

			// 2º: mandamos la respuesta de claude
			process.stdout.write(`\n Claude: ${response}\n\n`);

			/*
				lo que hay aquí dentro era para usar el streaming
				pero al tener ahora las tools, no se va a hacer igual.

				lo dejo dentro de este comentario para la posteridad
				y poder revisarlo en algún momento

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

			*/

			// guardamos la respuesta para el sigyuiente turno y así tenga esa memoria
			conversation.addAssistantMessage(response);

			// con el finalMessage, puedes ver los tokens en general que ha consumido
		} catch (error) {
			const err = error as Error; // hago el as Error para poder acceder a la propiedad message
			console.log(`Error: ${err.message}`);
		}
		promptUser(); // esto se hace para que oslo se cierre si el user hace /exit
	};
	promptUser(); // esto se hace para que oslo se cierre si el user hace /exit
}
