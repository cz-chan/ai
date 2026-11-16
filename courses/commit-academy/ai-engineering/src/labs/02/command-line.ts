import z from "zod";
import {
	flagsSchema,
	cliArgsSchema,
	toolsSchema,
} from "../../types/cli-options.type.ts";
import type { ProvidersParams } from "../../types/providers-params.types.ts";

const SYSTEM_PROMPT =
	"Resume textos. Devuelve exactamente 3 puntos clave, concisos, en español";

const INSTRUCTIONS: ProvidersParams = {
	model: "fast",
	prompt: "",
	maxTokens: 256,
	systemPrompt: SYSTEM_PROMPT,
};

/*
	docs: https://nodejs.org/docs/latest/api/process.html#processargv

	argv retorna un array con todos los argumentos que se le pasan cuando nodejs
	está corriendo.

	este argv está compuesto por varios elementos 'obligatorios' en el arr:
	- [0]: process.execPath: path absoluto donde node se ejectuta en tu máquina
	- [1]: el archivo que node ([0]) tiene que ejecutar. este siempre se le debería pasar
	- [2 y en adelante]: los comandos que le pases

	este segundo elemento y en adelante dependiendo de cómo se le pasen, los entenderá como 
	elementos únicos o varios elementos.

	si le quieres pasar un texto, necesitas pasarlo entre "comillas", en caso de no hacerlo, 
	cada palabra separada por un espacio lo entenderá como un elemento distinto del array

	los comandos, por defecto, no existen, necesitas crearlos tú a través del código. es decir,
	poner "--model" para este argv no significaría nada más que un elemento más del array. lo que
	tú tinees que programar es que cada vez que un elemento inicie por "--" significará un comando y
	cuando haya un espacio justo después de la palabra (o paabras encadenadas con "-") será el valor
	de ese comando y así sucesivamente.

	estos valores, no son números aunque le pongas 50 sin comillas, todo lo interpreta como strings,
	el trabajo está a través del código decirle qué valores puede aceptar y qué tipo de valores son

	algunas librerías ya construidas que podrían hacer esto más fácil son:
		- commander -> https://www.npmjs.com/package/commander
		- yargs -> https://www.npmjs.com/package/yargs
	
	me es útil hacerlo desde cero proqeu es una práctica que a futuro podría venir bien saber
	cómo funciona argv para crear mis propiasl CLIs de productos
*/

/*
const args = process.argv.slice(2); cojo del 2 (incluido) en adelante
console.log(args)

ejemplo: 
		código -> node src/labs/02/command-line.ts "Hola mundo" --model smart --max-tokens 500
		respuesta -> [ 'Hola mundo', '--model', 'smart', '--max-tokens', '500' ]
*/

/*
	!el diseño de la tool para la obtención de flags será en el array que se obtenga: 
		[0]: tipo de tool a usar: --summary (resumidor), --category (clasificador), --extract (extractor)
		[1]: el texto a analizar (entre comillas) o ruta del archivo a analizar
		
		a partir de aquí, los comandos deberán tener la siguiente estructura: --comando + espacio + valor_sin_comillas

		[2]: --model -> (opcional) modelo a usar. los permitidos están en src/types/ai-model-names.types.ts
			[3]: valor del modelo
		[4]: --max-tokens -> (opcional) cantidad de tokens de output. tiene que ser un número
			[5]: cantidad de tokens que devuelve

	los demás parámetros que se añadan después o que no encajen con los establecidos, no se tendrán en cuenta.
	tanto --model como --max-tokens son opcionales y pueden ser intercambiados de sitio entre ellos, siendo
	ambos opcionales pero siempre deberán estar de la posición 2 (incluida) en adelante.

	al ser opcionales, por defecto, los valores que van a tener el --model y --max-tokens serán "fast" y 256
	respectivamente

	tanto la posición [0] como la [1] (después del argv.slice(2)) serán obligatorias y tendrán que estar en 
	el orden que se indica aquí. en caso de no ser este orden, se le enseñará un error en la consola al usuario.

	un comando adicional será el --help (-h) que le dirá cómo se puede usar el CLI para que le responda bien
*/

// función donde se explica cómo usar el CLI
function usageCliMessage(): string {
	const message = [
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

	return message.join("\n");
}

const args = process.argv.slice(2);

// necesito esta función para transformar los flags al tipo de dato que me hacen falta en mi schema
function flagToKey(flag: string): string {
	return flag
		.slice(2)
		.split("-")
		.map((segment, i) =>
			i === 0 ? segment : segment.slice(0, 1).toUpperCase() + segment.slice(1),
		)
		.join("");
}

// necesito esta función para convertir el valor váludo de la app al valor que el usuario debe mandar
function keyToFlag(key: string): string {
	const flag =
		"--" + key.replace(/[A-Z]/g, (match) => "-" + match.toLowerCase());

	return flag;
}

// caso para cuando el usuario quiere ayuda. en la posición 0 de args deberá estar --help o -h
if (args[0] === "--help" || args[0] === "-h") {
	console.info(usageCliMessage());
	process.exit(0);
}

// para el caso de que no envie nada y solo ejecute el archivo/cli
if (args.length === 0) {
	console.error(usageCliMessage());
	process.exit(1);
}

// guardo los flags(key) - values que me pase el usuario por la terminal
const rawFlags: Record<string, string> = {};

// añadimos al rawFlags la tool que nos llega en la primera posición y al final, después de haber
// añadido todo, validamos lo que tenemos dentro de rawFlags junto con el cliArgsSchema que se espera
rawFlags["tool"] = flagToKey(args[0]);

// el bucle es para coger cada una de las flags y saltarme el resumen y la tool (empiezo en el [2])
// porque así es como he construido la tool
// [0] = tool que el modelo usará y [1] = texto o ruta que el modelo va a recibir
for (let i = 2; i < args.length; i++) {
	if (args[i].startsWith("--")) {
		const key = flagToKey(args[i]);

		// si la key está en el esquema de flags añade la key y su valor que siempre está a su derecha
		// a no ser que no haya valor a la derecha o sea algo erróneo/no esperado
		if (key in flagsSchema.shape) {
			// antes de la asignación de key/value necesito comprobar que lo que hay a la derecha es lo que debe haber
			// pero no si cumple el esquema de zod, esos errores de validación se hacen con el parse al map, sino
			// si lo que hay inmediatamente después es algo, a priori, válido
			if (args[i + 1] === undefined || args[i + 1].startsWith("--")) {
				const errorMessage = `${args[i]} debe tener un input válido.\n\n${usageCliMessage()}`;

				console.error(errorMessage);
				// necesito cerrar el proceso porque sino guardaría el valor. el error es un aviso, no corta nada
				process.exit(1);
			}
			rawFlags[key] = args[i + 1];

			// sumamos uno para que pase al siguiente elemento y no pase al value
			i++;
		}
	}
}

const result = cliArgsSchema.safeParse(rawFlags);
if (!result.success) {
	console.error(z.prettifyError(result.error));
	process.exit(1);
}
