import OpenAI from "openai";
import { envs } from "../../config/envs.ts";
import type { ProvidersParams } from "../../types/providers-params.types.ts";
import {
	LAB03_PROMPT,
	LAB03_SYSTEM_PROMPT,
	useChaos,
	useFast,
} from "./variables.ts";
import {
	type RequestOpt,
	requestOpt,
} from "../../types/retry-options.types.ts";
import { withRetries } from "./error-helpers.ts";

/*
  hago una copia de /models/openai.ts para poder manejar aquí los distintos errores sin que
  afecte a otros labs

	! usando la api standard de RESPONSES y no COMPLETIONS

*/

const client = new OpenAI({
	baseURL: envs.PRACTICE_API_URL_OPENAI,
	apiKey: envs.PRACTICE_API_KEY,
	// apiKey: "sk-estopuedeSerUnaBadAPIKEYno?", // apikey mala

	/*
		necesito obligar a que sea en la creación del cliente el maxRetries = 0 porque voy a manejar
		los reintentos desde la petición y no quiero que el SDK los maneje por defecto (que son 2 llamadas
		por cada petición (en caso de fallo))

		como quiero ser yo el que controle estos intentos, si no lo tocara (por defecto son 2) y soy yo 
		el que maneja los intentos, si quiero hacer solo 4 reintentos, serían 4 + petición + *2 reintentos y 
		acabaría al final de los 4 intentos con 12 peticiones

		con valor por defecto:
			intento 1: petición 1 -> (se activa el maxRetries) -> http 2 -> http 3 -> lanza error
			inetnto 2: petición 4 -> (maxRetries) -> http 5 -> http 6 -> error
			int 3: petición 7 -> () -> http 8 -> http 9 -> error
			int 4: pet 10 -> () -> http 11 -> http 12 -> error -> fin (se han acumulado 12 http)

		sin por defecto
			intento 1: petición 1 -> (custom retry, por ejemplo: 0) -> error
			intento 2: petición 2 -> error
			intento 3: petición 3 -> error
			intento 4: petición 4 -> error -> fin (solo con 4 http)

		lo pongo aquí porque así hago que el valor por defecto para todas las llamadas de ese cliente
		sea el mismo y que solo aquellas llamadas que me interesa hacer un attempt distinto en casos
		concretos de errores concretos le doy la posibilidad de hacerlo. además, la petición (response)
		tiene prioridad a la creación del cliente por ende, siempre podré modificarlo por defecto.
	*/
	maxRetries: 0,
});

// openai docs: https://developers.openai.com/api/docs

/*
	para resolver el lab03, la request a openai necesita tener (en mi caso) 3 parámetros:
		params: obligatorios, los que necesita para funciona
		emptyMessage: false por defecto -> fuerza el error del mensaje vacio con el modelo fast si es true
		requestOptions: modifica el timeout que tarda en hacer la petición al servidor (por defecto 3000ms)
*/
async function useOpenai(
	params: ProvidersParams,
	emptyMessage?: boolean,
	requestOptions?: Partial<RequestOpt>,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
	const { model, prompt, maxTokens, systemPrompt } = params;
	const { timeoutMs } = requestOpt.parse(requestOptions);

	const response = await client.chat.completions.create(
		{
			model: model,
			max_completion_tokens: maxTokens,
			messages: emptyMessage
				? []
				: [
						...(systemPrompt
							? // sin as const TS dará error porqeu system lo toma como string y no como valor
								[{ role: "system" as const, content: systemPrompt }]
							: []),
						{ role: "user", content: prompt },
					],
		},
		{
			/*
				el timeout por defecto en openai son 10 minutos, si lo colocas como 0,0001 siempre rompera

				el timeout es el tiempo máximo que espera MI sistema antes de cortar una conexión sin respuesta
				por parte del servidor (openai oi el proveedor que sea, ya sea de AI o cualquier api de terceros)

				por tanto, si una conexión tarda menos de este tiempo, responde y no pasa nada porque nunca entraría
				un error, ha respondido, pero si tarda más del timeout se lanza el error y es aquí donde entra 
				la función de reintentos que dependiendo del error que haya sucedido, lo reintentará esperando
				la cantidad de ms que se le haya pasado (waitMs) con sleep o lanzará el error directamente
			*/
			timeout: timeoutMs,

			// aquí no voy a usar los maxRetries porqeu van a ser 0 siempre, para manejar los intentos
			// vpy a hacerlo con un bucle y maxAttempts que me pasará el usuario
			// maxRetries: 0,
		},
	);

	return response;
}

const PROMPTS = {
	systemPrompt: LAB03_SYSTEM_PROMPT,
	prompt: LAB03_PROMPT,
	maxTokens: 400,
};

const chaos_input: ProvidersParams = {
	...PROMPTS,
	model: useChaos,
};

const fast_input: ProvidersParams = {
	...PROMPTS,
	model: useFast,
};

try {
	const response = await withRetries(
		() =>
			// recibe 3 parámetros, el obligatorio es fast_input o chaous_input (dependiendo del modelo que quieras)
			// los dos siguientes son opcionales y corresponden a emptyMessage y timeoutMs respectivamente
			useOpenai(
				{ ...fast_input, maxTokens: 10 },
				// true,
				//{
				// 	timeoutMs: 1000,
				// }
			),
		// {
		// 	maxAttempts: 4,
		// },
	);

	const message = response.choices[0].message.content;
	let theFinish = "";
	if (response.choices[0].finish_reason === "length") {
		theFinish = response.choices[0].finish_reason;
	}

	theFinish.length > 0 && console.log(`\n[finish reasson] ${theFinish}\n`);
	console.log(`\nmessage:\n\n`, message);
} catch (error) {
	console.error(
		"[error]",
		error instanceof OpenAI.APIError ? error.message : error,
	);
}
