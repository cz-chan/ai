import { configLLM } from "./config.ts";

function main(): void {
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
	console.log("🚀 Próximo paso: Sección 3 — Primera llamada a Claude API");
}

main();
