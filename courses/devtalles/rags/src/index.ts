import { askClaude } from "./llm/anthropic.ts";
import { CODE_REVIEWER_PROMPT } from "./llm/prompts.ts";

const BAD_CODE = `
async function getUser(id) {
  const query = "SELECT * FROM users WHERE id = " + id;
  const result = await db.query(query);
  return result[0];
}
function calcularDescuento(precio, tipo) {
  if (tipo == "vip") {
    return precio * 0.8;
  } else if (tipo == "regular") {
    return precio * 0.9;
  } else {
    return precio;
  }
}
`;

const anthropicAnswer = async (
	question: string,
	systemPrompt?: string,
): Promise<void> => {
	if (systemPrompt) {
		const answer = await askClaude(question, systemPrompt);
		console.log("WITH SYSTEM PROMPT\n", answer);
	} else {
		const answer = await askClaude(question);
		console.log("WITHOUT SYSTEM PROMPT\n", answer);
	}
};

async function main(): Promise<void> {
	console.log("╔════════════════════════════════════════╗");
	console.log("║        DevAssistant - Curso IA         ║");
	console.log("╚════════════════════════════════════════╝");
	console.log("");
	console.log("✅ DevAssistant configurado correctamente");
	console.log("");
	console.log("");
	// const question =
	// 	"¿cuál es la diferencia entre nodejs y go para el backend? responde en 3 bulleted pints y se conciso.";

	await anthropicAnswer(BAD_CODE);
	await anthropicAnswer(BAD_CODE, CODE_REVIEWER_PROMPT);
}

main();
