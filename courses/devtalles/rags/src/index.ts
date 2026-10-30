import { config } from "./config.ts";

function main(): void {
	console.log("╔════════════════════════════════════════╗");
	console.log("║        DevAssistant - Curso IA         ║");
	console.log("╚════════════════════════════════════════╝");
	console.log("");
	console.log("✅ DevAssistant configurado correctamente");
	console.log("");
	console.log("📋 Configuración activa:");
	console.log(`   • Provider: ${config.provider}`);
	console.log(`   • Modelo: ${config.model}`);
	console.log(`   • Docs path: ${config.dbPath}`);
	console.log(`   • RAG top-K: ${config.ragTopK}`);
	console.log("");
	console.log("🚀 Próximo paso: Sección 3 — Primera llamada a Claude API");
}

main();
