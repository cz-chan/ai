import z from "zod";
import { flagsSchema, toolsSchema } from "../../types/cli-options.types.ts";

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

/** función para mostrar las flags de las tools disponibles con su respectiva descripción */
export function flagToolsInfo(): string {
	const tools = toolsSchema.shape.tool.options
		.map((tool, i) => {
			const value = keyToFlag(tool.value);
			const description = tool.description;

			if (!description) {
				throw new Error("tool description unavailable");
			}

			return (
				` -tool ${i + 1}: ` + `'${value}' -> descripción: ${description}\n`
			);
		})
		.join("");

	const message =
		tools +
		`\n` +
		`Después de la tool debes colocar el texto que quieres que analice entrecomillado o indicar el archivo, a través de la ruta absoluta, que quieres que use.\n`;

	return message;
}

/** función para crear un mensaje con los distintos providers y model */
export function flagOptionsMessage(): string {
	const optionalFlagsInSchema = flagsSchema.shape;

	/*
		esta función es así y no de otra forma por como he estructurado zod en flagsSchema.
		en mi caso, el esquema de zod es algo asi:

		const flagsSchema: z.ZodObject<{
			model: z.ZodDefault<z.ZodEnum<{
			fast: "fast";
			smart: "smart";
			chaos: "chaos";
			}>>;
			maxTokens: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
			provider: z.ZodDefault<z.ZodEnum<{
			openai: "openai";
			anthropic: "anthropic";
			vercel: "vercel";
			}>>;
			}, z.core.$strip>
		
		Por lo que lo primero que debo de hacer (aunque en este caso no tiene sentido porque todos lo usan) es
		verificar que haya un .default() esto lo que permite es que sean flags opcionales, si no lo pones, esto
		pasa a ser obligatorio por lo que, aquellas flags obligatorias no deberían salir en este mensaje.

		Habiendo filtradop por los defaults, lo siguiente que tengo que filtrar son los distintos enums que hay.
		tanto providers como model es un conjunto cerrado de elementos (enum o literals) excepto maxTokens que es un
		número (ZodCoercedNumber pq en la terminal todo es string y zod valida cuando llega si es un number) por lo 
		que para poner los valores por defecto qeu pueden tener (están en options) necesito filtrar por ZodEnum y 
		de este sacar las options y ponerlas en el join para que sea bonito visualmente.

		en el caso de no ser un enum (maxTokens) lo que he hecho ha sido darle a todas, por defecto, una descripcion
		(lo voy a hacer a partir de ahora por defecto en todos los proyectos como buena práctica) y usar esta
		como lo que devuelve si no es un ZodEnum

		(el método .unwarp() lo que hace en zod es "descomprimir" el contenido ya que lo convierte a objeto
		docs: https://zod.dev/api?id=optionals#optionals y https://zod.dev/api?id=enums#enums)

		!ojo
		si el default no lo coloco en última posición en los esquemas, la forma en la que obtengo esta definición
		cambiará teniendo que cogerla desde el propio value y no haciendo el .unwrap()

		lo voy a dejar así, en le maxTokens distinto, para saber como hacerlo por si algún día se da el caso.
	*/

	const instructions = Object.entries(optionalFlagsInSchema)
		.filter(([, value]) => value instanceof z.ZodDefault)
		.map(([flag, value]) => {
			const flagValues = value.unwrap();
			const message =
				flagValues instanceof z.ZodEnum
					? `"${keyToFlag(flag)}": ${flagValues.description}. Puede tener los siguientes valores: ${flagValues.options.join(" | ")}`
					: `"${keyToFlag(flag)}": ${value.description} (por defecto es ${value.def.defaultValue})`;

			return `  ` + message;
		});

	const messge =
		`Los flags (opcionales) a los que tienes acceso por ahora son:\n` +
		instructions.join("\n");

	return messge;
}

/** función para nombrar los distintos valores por defecto que tendría cada una de las flags opcionales */
export function flagDefaultsValues(): string {
	const optionalFlagsInSchema = flagsSchema.shape;

	/*
		forma de devolver con .map:

			const instructions = Object.entries(optionalFlagsInSchema)
				.filter(([, value]) => value instanceof z.ZodDefault)
				.map(([flag, value]) => {
					const flagDefaultValue = value.def.defaultValue;
					return [keyToFlag(flag), flagDefaultValue];
				});

			const flags = instructions.map(([flag, _]) => flag).join(", ");
			const defaultValues = instructions.map(([_, values]) => values).join(", ");
	
			return `En caso de omitir "${flags}" por defecto será: "${defaultValues}" respecticamente.`;
	*/

	// otra forma de hacerlo sería con un .reduce
	const instructions = Object.entries(optionalFlagsInSchema)
		.filter(([, value]) => value instanceof z.ZodDefault)
		.reduce(
			(acc, [flag, value]) => {
				const flagDefaultValue = value.def.defaultValue;
				acc.flag.push(`"${keyToFlag(flag)}"`);
				acc.defaultValue.push(`"${String(flagDefaultValue)}"`);

				return acc;
			},
			// creo los arrays donde quiero guardar los key/values. al crearlos puedo hacer el acc.flag.push()
			// si no los creo, no podría hcacerlo
			{ flag: [] as string[], defaultValue: [] as string[] },
		);

	// esta funcionalidad permite al pasarle el idioma y la forma del output message (conjunción en este caso
	// porqeu es una lista) me devuelve algo como "algo, algo, algo y algo" y me pone la "y" al final cosa que con
	// .join(', ') no puedo
	const lf = new Intl.ListFormat("es", { type: "conjunction" });

	return `En caso de omitir ${lf.format(instructions.flag)} por defecto será: ${lf.format(instructions.defaultValue)} respecticamente.`;
}
