import OpenAI from "openai";
import { retryOpt, type RetryOpt } from "../../types/retry-options.types.ts";

/*
	el reintento de las peticiones tiene sentido en ocasiones concretas y estos dependen del 
	código de error (es lo que tedice el motivo del error y si podría tener sentido el retry)

	en el caso de openai los códigos que tienen sentido reintentar son:
		- aquellos que sean del tipo APIConnectionError
		- 5xx porque es un error del sistema y podría volver en poco tiempo (con cautela)
			- 529: este podría necesitar un backoff (aumentar tiempo entre reintentos con el tiempo)
	
	y no debería intentarse con ninguno que tenga la tipología 4xx EXCEPTO 	(esto es lo que pone 
	openai que podría reintentarse en los códigos de tipo 4xx):
		- 429: se da por límite de cuota alcanzado pero se puede respetar respetando el header Retry-After
		- 408 y 409 que son "request timeout" y "conflict" respectivamente 

*/

/**
 * función para validar si un error tiene que reintentarse o no. esta depende de si el error
 * es del tipo "OpenAI.APIConnectionError" (no hay un status code) o si son status codes
 * 429 (OpenAI.RateLimitError) o 5xx (OpenAI.InternalServerError), en caso de no serlo,
 * la fucnión devolverá false y no se reintentará.
 */
export function isRetry(error: unknown): boolean {
	// el tipo OpenAI.APIConnectionError es aquel que no tiene un status code
	// esto está todo en la doc de openai que está en el readme.md
	if (error instanceof OpenAI.APIConnectionError) return true;

	// construyo cómo va a ser la respuesta del error para observar ese status y message
	// y comprobar qué es lo que quiero
	const { status, message } = error as { status?: number; message?: string };

	// esto me dice qeu si el mensaje contiene la palabra budget o presupuesto, no tiene
	// sentido volver a intentarlo porque siginifica que la cuota de la api se ha consumido
	// por lo que reintentarlo sin recargar, seguirá dando error aún pudiendo ser un status = 429
	// y teniendo que hacer el reintento por eso no vale solo con el status sino tb el mensaje concreto
	if (/budget|presupuesto/i.test(message ?? "")) return false;

	// en caso de ser 429 (OpenAI.RateLimitError) o no tener statuscode (OpenAI.APIConnectionError)
	// o ser 5xx, true
	return status === 429 || (status !== undefined && status >= 500);
}

/**
 * función para reintenta después de X tiempo si el error es de tipo 429 porque
 * tiene en la cabecera el el Retry-After con el tiempo que hay que esperar hasta
 * hacer el reintento
 */
export function retryAfterMs(error: unknown): number | null {
	// construyo la cabecera del error que es de tipo Headers y puede venir o no
	// dependiendo del error que sea. en mi caso me interesa el 429 que sí debería
	// venir una cabecera con retry-after
	const { headers } = error as { headers?: Headers };

	const seconds = Number(headers?.get("retry-after")); // este 'retry-after' me dice que es asó openai

	return seconds > 0 ? seconds * 1000 : null;
}

/*
	la función sleep sirve para crear una espera programada (depende de los ms que se el pase) hasta
	que haya pasado el tiempo. una vez pasado, la promise se resuelve y el código después del await puede
	continuar (porque setTimeout llama al resolve) y libera esa función (la nueva petición) o lo que sea
	
	para qué yo querría esto? -> para evitar que las consultas se ejecuten de manera inmediata y que dependan
	de un tiempo concreto que puede ser uno aleatorio que va incrementando con el número de intentos (backoff
	aleatorio) o con el retry_after (que vendría en la cabecera con ese nombre cuando el error es 429) los cuales
	serían los números (milisegundos) que se le pasarían a este sleep para que esperara a hacer la siguiente
	petición.

	!ojo
	no crece el tiempo entre peticiones, lo que crece es la aleatoriedad de números (ms) que hay entre peticiones
	hasta llegar al máximo (capMs). es decir, el rango en los intentos menores es menor, por ejemplo, entre 
	0ms y 1000ms es el primer intento y puede suceder en el segundo 1ms o en el 999ms pero al aumentar el 
	intento, este tiempo aumenta del 0ms hasta el 2000ms por lo qeu el rango de tiempo en el que puede reintentar
	la peteición es mayor, podría hacerla en el 24ms o en el 1887ms y así sucesivamente hasta que llegue al 
	máximo de attempts

*/

export const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

/*
	función de implementación del retry.

	esta función se va a ejecutar en cada llamada que se haga en cualquier petición a la api del proveedor
	y esta va a recibor los parámetros que quiere el usuario tener como retries y una función que va a actuar
	como verificadora del retry
*/
export async function withRetries<T>(
	call: () => Promise<T>,
	// las opciones siguien siendo opcionales pero por defecto tengo los datos que me dice el enunciado
	retryOptions?: Partial<RetryOpt>,
): Promise<T> {
	// el parse permite crear el objeto y darle los valores gracias a .prefault({})
	const { baseMs, capMs, maxAttempts } = retryOpt.parse(retryOptions);

	// bucle de intentos que dependen del maxAttempts que le pueda pasar como usuario a la función
	for (let attempt = 0; ; attempt++) {
		try {
			return await call();
		} catch (error) {
			/*
				cuáles son los 2 casos en los que sale del reintento? 
					-> isRetry dando un error != APIConnectionError, 429, 5xx o budget|presupuesto en el mensaje
					-> cuando el numero de intentos es igual -1 al número máximo porque parte en attempt = 0, si
					pusieras = 1, sería attempt === maxAttempts. Si no haces esto, si maxAttempts es 4, darías 5
					vueltas pq el 0 sería la primera
			*/
			if (!isRetry(error) || attempt === maxAttempts - 1) throw error;

			// calculamos la espera de cada intento con el backoff + jitter a no ser que haya un retry_after
			// el cálculo random es la multiplica. del mínimo entre capMs(30s) y el base(1) elevado a los intentos
			const waitMs =
				retryAfterMs(error) ??
				Math.random() * Math.min(capMs, baseMs * 2 ** attempt);

			// cogemos la razón del error para mostrárselo al usuario
			const reason = error instanceof Error ? error.message : String(error);
			console.log(
				`[reintento ${attempt + 1}] ${reason} (próximo reintento: ${waitMs.toFixed(0)} milisegundo)`,
			);

			// al final de todo es cuando tengo que "bloquear" el reintento con el sleep y solo después
			// de consumir el tiempo de waitMs, es cuando el await deja que pase la función y se vuelve
			// a repetir la petición tardando como mucho el timeout que se le haya indicado, si este se consume
			// vuelve a este bucle (mientras no haya consumido todo el attempt y sea un error válido para entrar
			// en este catch) y aumenta el attempt en uno
			await sleep(waitMs);
		}
	}
}
