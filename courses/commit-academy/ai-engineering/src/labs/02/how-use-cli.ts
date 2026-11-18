import {
	flagDefaultsValues,
	flagOptionsMessage,
	flagToolsInfo,
} from "./helpers.funct.ts";

/** función donde se explica cómo usar el CLI */
export function usageCliMessage(message?: string): string {
	const instructions = [
		message && `${message}\n`,
		`Uso:`,
		`Recuerda que el primer flag que debes poner es la línea de comandos es que herramienta (tool) quieres que use el agente:`,
		flagToolsInfo(),
		flagOptionsMessage(),
		`\nPor ejemplo: \n"node ruta_archivo/command-line.ts --summary 'este es el texto que quiero resumir' --model fast --max-tokens 256 --provider vercel".\n\n` +
			flagDefaultsValues(),
	];

	// el .filter(Boolean) es para evitar que si no viene el message, el .join no cree un string vacio
	return instructions.filter(Boolean).join("\n");
}

/** función para mostrar el error al usar CLI y su respectivo mensaje de cómo usarlo */
export function throwErrorMessage(message: string): string {
	throw new Error(`${message} \n${usageCliMessage()}`);
}
