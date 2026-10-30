import { configLLM } from "./config.ts";
import { askClaude } from "./llm/anthropic.ts";

const anthropicAnswer = async (question: string): Promise<void> => {
	const answer = await askClaude(question);

	console.log(answer);
};

async function main(): Promise<void> {
	console.log("╔════════════════════════════════════════╗");
	console.log("║        DevAssistant - Curso IA         ║");
	console.log("╚════════════════════════════════════════╝");
	console.log("");
	console.log("✅ DevAssistant configurado correctamente");
	console.log("");
	console.log("📋 Configuración activa:");
	console.log(`   • Provider: ${configLLM.provider}`);
	console.log(`   • Modelo: ${configLLM.model}`);
	console.log(`   • Docs path: ${configLLM.dbPath}`);
	console.log(`   • RAG top-K: ${configLLM.ragTopK}`);
	console.log("");
	const question =
		"¿cuál es la diferencia entre nodejs y go para el backend? responde en 3 bulleted pints y se conciso.";
	console.log("claude response:");
	anthropicAnswer(question);
}

main();
