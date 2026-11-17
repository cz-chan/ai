import { flagsSchema, toolsSchema } from "../../types/cli-options.type.ts";
import { keyToFlag } from "./helpers.funct.ts";

// función donde se explica cómo usar el CLI
export function usageCliMessage(message?: string): string {
	const instructions = [
		message && `${message}\n`,
		`Uso:`,
		`Recuerda que el primer flag que debes poner es la línea de comandos es que herramienta (tool) quieres que use el agente:`,
		toolsSchema.shape.tool.options
			.map((tool, i) => {
				const value = keyToFlag(tool.value);
				const description = tool.description;

				if (!description) {
					throw new Error("tool description unavailable");
				}

				return (
					` -tool ${i + 1}: ` + `'${value}' -> description: ${description}\n`
				);
			})
			.join(""),
		`Después de la tool debes colocar el texto que quieres que analice entrecomillado o indicar el archivo, a través de la ruta absoluta, que quieres que use.\n`,
		`Los flags (opcionales) a los que tienes acceso por ahora son: ${Object.keys(
			flagsSchema.shape,
		)
			.map((key) => keyToFlag(key))
			.join(", ")}`,
		`\nPor ejemplo: \n"node ruta_archivo/command-line.ts --summary 'este es el texto que quiero resumir' --model fast --max-tokens 256".\n\n` +
			`En caso de omitir '--model' y/o '--max-tokens' por defecto será: fast y 256 respecticamente.`,
	];

	// el .filter(Boolean) es para evitar que si no viene el message, el .join no cree un string vacio
	return instructions.filter(Boolean).join("\n");
}
