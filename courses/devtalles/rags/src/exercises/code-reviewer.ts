// Uso: npm run review <ruta-del-archivo>
// Ejemplo: npm run review ./src/config.ts

import * as fs from "node:fs";
import * as path from "node:path";
import { streamingClaude } from "../llm/anthropic/streaming.ts";
import { CODE_REVIEWER_PROMPT } from "../llm/prompts.ts";

// Extensiones de archivo que soportamos
const SUPPORTED_FILE_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".py",
	".go",
	".rs",
	".java",
	".cs",
	".cpp",
	".c",
	".rb",
	".php",
	".swift",
	".kt",
	".sql",
]);
// Límite de tamaño: archivos muy grandes consumen muchos tokens
const MAX_CHARS = 20_000;

async function reviewFile(filePath: string): Promise<void> {
	const absolutePath = path.resolve(filePath);

	if (!fs.existsSync(absolutePath)) {
		console.error(`File not found: ${absolutePath}`);
		process.exit(1);
	}

	const fileExtension = path.extname(absolutePath).toLowerCase();
	if (!SUPPORTED_FILE_EXTENSIONS.has(fileExtension)) {
		console.error(`This file extension "${fileExtension}" is not supported`);
		process.exit(1);
	}

	const fileName = path.basename(filePath, fileExtension);

	const content = fs.readFileSync(absolutePath, "utf-8");
	const totalLines = content.split("\n").length;

	// creamos esta variable = al content para no modificar el content original
	let reviewContent = content;
	let sizeWarning = "";

	if (content.length > MAX_CHARS) {
		reviewContent = content.slice(0, MAX_CHARS);
		sizeWarning = `Your file has more than ${MAX_CHARS}. I'm going to cut it.`;
	}

	// Mostrar header
	console.log("╔════════════════════════════════════════╗");
	console.log("║       DevAssistant — Code Reviewer     ║");
	console.log("╚════════════════════════════════════════╝");
	console.log(`\n📄 Archivo: ${fileName}`);
	console.log(`   Ruta: ${absolutePath}`);
	console.log(`   Líneas: ${totalLines} | Caracteres: ${content.length}`);
	if (sizeWarning) console.log(sizeWarning);
	console.log("\nAnalizando con Claude...\n");
	console.log("─".repeat(60));

	// Construir el prompt con el contexto del archivo
	const prompt = `Por favor, revisa el siguiente archivo de código:
  **Archivo:** \`${fileName}\`
  **Extensión:** ${fileExtension || "desconocida"}
  **Líneas:** ${totalLines}
  \`\`\`${fileExtension.slice(1)}
  ${reviewContent}
  \`\`\``;

	await streamingClaude(prompt, CODE_REVIEWER_PROMPT);
	console.log("-".repeat(60));
}

// lectura de la llinea de comandos
const inputArgs = process.argv.slice(2);

if (inputArgs.length === 0) {
	// si es = 0, significa que no se ha pasado nada
	console.error("use: pnpm run review <file-path>");
	console.error("eg: pnpm run review ./src/random-file.ts");
	process.exit(1);
}

const filePath = inputArgs[0];
if (!filePath) {
	console.error("please, add the file route");
	process.exit(1);
}

reviewFile(filePath).catch((error: Error) => {
	console.error("Error: ", error.message);
	process.exit(1);
});
