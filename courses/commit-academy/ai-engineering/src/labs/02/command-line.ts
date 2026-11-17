import * as fs from "node:fs";
import z from "zod";

import { flagsSchema, cliArgsSchema } from "../../types/cli-options.type.ts";
import type { ProvidersParams } from "../../types/providers-params.types.ts";
import { usageCliMessage } from "./how-use-cli.ts";
import { flagToKey, throwErrorMessage } from "./helpers.funct.ts";

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

const args = process.argv.slice(2);

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

/*
	pequeña modificación:

		si hago que el bucle empiece por args[2], lo que hago es saltarme: '--tool "texto/archivo" ' 
		y empezar directo a comprobar las flags que me interesan. el problema de esto es que si un usuario
		usa el stdin para mandarme un texto (por ejemplo: echo 'hola mundo' | node cli.ts --summary --model fast)
		saltará como error ya que para este caso que estoy nombrando, mi [2] será --model cosa que no debe estar
		permitido ya que, aunuqe sea texto, no es el texto sino el modelo.

		para solucionarlo, tengo que empezar con [1] y comprobar si el texto de [2] empieza por '--' y no hay
		un stdin (como echo 'algo' | ) debería ser error ya que no ha enviado texto. pero si empieza por '--' y
		SÍ hau un stdin, es que el usuario me ha enviado un texto por terminal con un pipe antes del comando

	es decir, si hay un texto previamente escrito donde stdin puede acceder, el bucle en vez de empezar
	en 2, empieza en 1 porque NO HAY UN TEXTO por lo que los args[i] deben retrasarse uno:
		ejemplo: echo 'hola mundo' | cli.ts --summary[0] --model[1] fast[2] --max-tokens[3] 256[4]

	pero si sí hay un texto (no hay stdin), no debe adelantarse porque la tool así está construida 
	para un usuario 'normal':
		ejemplo: cli.ts --summary[0] 'hola mundo'[1] --model[2] fast[3] --max-tokens[4] 256[5]

	para comprobar esto necesito tener una variable textArg que dependiendo de si está o no undefined (tiene algo)
	el número del bucle debería cambiar entre 1 y 2, respectivamente.
*/
let textArg: string | undefined;
let flagStart: number;

if (args[1] && args[1].startsWith("--")) {
	textArg = undefined;
} else {
	textArg = args[1];
}
textArg === undefined ? (flagStart = 1) : (flagStart = 2);

//! los 2 comentarios siguientes están descatalogados, era para la función simple sin tener el stdin
//// el bucle es para coger cada una de las flags y saltarme el resumen y la tool (empiezo en el [2])
//// porque así es como he construido la tool
//// [0] = tool que el modelo usará y [1] = texto o ruta que el modelo va a recibir
for (let i = flagStart; i < args.length; i++) {
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

//! elimino este bloque ya que ahora sí está soportado que venga algo por stdin
// if (args[1] && args[1].startsWith("--") && !process.stdin.isTTY) {
// 	console.error(
// 		usageCliMessage(
// 			"Después de la tool va el texto o la ruta, no un flag.",
// 		),
// 	);
// 	process.exit(1);
// }

const result = cliArgsSchema.safeParse(rawFlags);

// función para leer lo que llega en el args[1] (el texto/archivo)
function readInput(arg: string | undefined): string {
	/*
		como el arg puede ser undefined, es algo que me manda el usuario y no se si lo hará bien o no, necesito
		comprobarlo
		!además, ahora que acepto que venha algo por stdin, sí puede ser undefined, porque lo que vieme en el 
		! [1] ya no es un text sino un flag o undefined si es que no pone nada ( echo 'hola mundo' | cli.ts --summary )

		la primera comprobación es si es undefined: en este caso sería si no hay nada en el args[1] (puede haber
		algo que empiece por '--' y pasaría pero después lo tameré como error ya que la tool siempre debe ir
		seguida del texto o folder o ser el isTTY undefined)

		la segunda validación tiene que ver con el proceso que se está escuchando cuando se arranca el programa 
		(en este caso command-cli con node). cuando se arranca un programa, hay 3 canales que van a estar activos:
			- 0 -> stdin o entrada -> este es por dónde entran los datos al programa que por defecto, está conectado
			al teclado. en caso de una shell lo que puede hacer es conectarse a otro programa si se le pasa como puede
			ser un archivo a través de "< archivo.md" o a la salida de otro programa como podría ser "echo 'hola mundo'"

			(estos dos canales siguientes son de salida (y van a la pantalla) y aunque ahora no hacen falta, los explico
			para entenderlos)
			- 1 -> stdout o salida -> este canal da el resultado
			- 2 -> stderr o error -> este da el error

			necesitamos los dos para que el error, en el caso de suceder, no ensucie el resultado. por ejemplo un 
			console.log o .info van por el canal 1 pero el .error o .warn van por el 2 por eso el --help va en un 
			.info y no .warn o error, porque no es un mal resultado (error), sino una ayuda. 

			esquema:
				             ┌─────────────┐
					0 stdin ──▶│  programa   │──▶ 1 stdout → el RESULTADO (lo que pediste)
									   │             │──▶ 2 stderr → errores, avisos, info de diagnóstico
										 └─────────────┘

		lo que hace process.stdin.isTTY no es más que leer donde está escuchando ese canal 0 (stdin). no dice si hay
		datos sino a qué está escuchando. en caso de ser true, significa que este canal 0 (stdin) está escuchando al 
		teclado si está escuchando por lo que el usuario no ha conectado un archivo "< archivo.md" o ha hecho un 
		pipe "echo 'un_texto_aqui' | " pero en el caso de ser .stdin.isTTY undefined, significaría que SÍ ha hecho
		esta conexión por lo que no entraría en el error.

		sino que lo que haría sería a través del readFileSync escuchar el canal 0 ( fs.readFileSync(0, ...) ) para
		saber qué es lo que ha mandado el usuario como arg

		en caso de no mandar nada y ser .siTTY true, lanza el error porqeu significa que el usuario no ha enviado
		un texto que la tool pueda usar lo que es obligatorio en esta herramienta (lanza el error de falta texto + 
		pasarle la forma y comandos válidos)
	*/
	if (arg === undefined) {
		if (process.stdin.isTTY) {
			throwErrorMessage("Debes introducir un texto o archivo válido.");
		}

		/*
			en el caso de ser undefined .isTTY es porque el usuario ha enviado un texto o un archivo y antes de que
			le pueda llegar la ruta al cli, la shell lo que hace es abrir ese archivo y pasarle el texto al cli por 
			lo que nunca le lleharía el path

			en el caso de no poner un return, el código seguiría y le daría a entender que ese textoi que le pasa
			es un nombre de un archivo con X caracteres (20, 100, 3000...) lo que sería imposible y daría error.

			por ejemplo:

				- cli --summary < notas.txt -> la shell le antes el notas.txt y le pasa al cli el contenido
				- echo "notas.txt" | cli --summary -> lo que le manda el usuario al cli es notas.txt como texto, no 
				como archivo porque lo está escribiendo por lo que "no" sería un error sino qeu quiere eso concreto

			cli --summary notas.txt     ← args[1]: tú decides si es ruta (statSync) -> saliendo del bucle
			cli --summary < notas.txt   ← stdin: el shell lo lee por ti -> sale de la función
		*/
		return fs.readFileSync(0, "utf8");
	}
	// si sale del if es que lo que ha mandado algo, args[1] !== undefined y con statSync averiguo si es ruta y texto

	// el statSync mira si es una ruta, si algo como eso existe de verdad, sino es que es un texto y devuelves arg
	let stat: fs.Stats;

	// uso un trycatch en el statSync porque no devuelve false/null/undefined cunado va mal sino un throw
	// si args SÍ es un path válido, lo crea, en caso de no serlo, en vez de salirse con el throw y el error,
	// por ejemplo ENOENT o ENAMETOOLONG devuelvo el arg porque SÍ sería un texto
	try {
		stat = fs.statSync(arg);
	} catch (error) {
		return arg;
	}

	// si stat === true (ruta válida) es una ruta pero tienes que comprobar ahora si es un dir o un file. si es dir,
	// tienes que lanzar un error
	if (stat.isDirectory()) {
		throwErrorMessage(
			"Has pasado el nombre de una carpeta. Solo puedes mandar archivos o texto.",
		);
	}

	// si no es dir, es que es un file por lo qeu lo lees y lo develves
	const text = fs.readFileSync(arg, "utf8");

	return text;
}

if (!result.success) {
	console.error(z.prettifyError(result.error));
	process.exit(1);
}

let text: string;
try {
	text = readInput(textArg).trim();
} catch (error) {
	// aquí no puede haber un throwErrorMessage porque es la capa más alta de todas por lo que no hay
	// nadie que lo capture. Aquí se tiene que mostrar el mensaje en la consola y salir del proceso
	const err =
		error instanceof Error ? error.message : "Error al leer el texto.";
	console.error(err);
	process.exit(1);
}

if (text === "") {
	// a nivel superior, el throw no debe usarse y dejas que Node con .error y .exit(1) maneje el error
	console.error(usageCliMessage("El texto no puede estar vacio."));
	process.exit(1);
}

console.log(text);
