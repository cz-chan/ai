import { askClaude } from "./llm/anthropic/anthropic.ts";
import { streamingClaude } from "./llm/anthropic/streaming.ts";
import {
	CODE_REVIEWER_PROMPT,
	DOCUMENTATION_ASSISTANT_PROMPT,
} from "./llm/prompts.ts";

// const BAD_CODE = `
// async function getUser(id) {
//   const query = "SELECT * FROM users WHERE id = " + id;
//   const result = await db.query(query);
//   return result[0];
// }
// function calcularDescuento(precio, tipo) {
//   if (tipo == "vip") {
//     return precio * 0.8;
//   } else if (tipo == "regular") {
//     return precio * 0.9;
//   } else {
//     return precio;
//   }
// }
// `;
const question = "qué es async/await de manera resumida";

const anthropicAnswer = async (
	question: string,
	systemPrompt?: string,
): Promise<void> => {
	if (systemPrompt) {
		const answer = await streamingClaude(question, systemPrompt);
		console.log("WITH STREAMING\n", answer);
	} else {
		const answer = await askClaude(question);
		console.log("WITHOUT STREAMING \n", answer);
	}
};

async function main(): Promise<void> {
	console.log("╔════════════════════════════════════════╗");
	console.log("║        DevAssistant - Curso IA         ║");
	console.log("║        				STREAMING			          ║");
	console.log("╚════════════════════════════════════════╝");
	console.log("");
	console.log("✅ DevAssistant configurado correctamente");
	console.log("");
	console.log("");
	// const question =
	// 	"¿cuál es la diferencia entre nodejs y go para el backend? responde en 3 bulleted pints y se conciso.";

	// await anthropicAnswer(BAD_CODE);
	// await anthropicAnswer(BAD_CODE, CODE_REVIEWER_PROMPT);
	await anthropicAnswer(question);
	await anthropicAnswer(question, DOCUMENTATION_ASSISTANT_PROMPT);
}

main().catch((error: Error) => console.error("Error: ", error.message));
// necesitas el catch porqeu algo puede salir mal
