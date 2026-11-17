import { usageCliMessage } from "./how-use-cli.ts";

export function throwErrorMessage(message: string): string {
	throw new Error(`${message} \n${usageCliMessage()}`);
}

// necesito esta función para transformar los flags al tipo de dato que me hacen falta en mi schema
export function flagToKey(flag: string): string {
	return flag
		.slice(2)
		.split("-")
		.map((segment, i) =>
			i === 0 ? segment : segment.slice(0, 1).toUpperCase() + segment.slice(1),
		)
		.join("");
}

// necesito esta función para convertir el valor váludo de la app al valor que el usuario debe mandar
export function keyToFlag(key: string): string {
	const flag =
		"--" + key.replace(/[A-Z]/g, (match) => "-" + match.toLowerCase());

	return flag;
}
